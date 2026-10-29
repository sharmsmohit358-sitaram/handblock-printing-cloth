// Bigship Unified Outbound API adapter.
// Source: Documentation-for-Unified-Outbound-API.pdf supplied by the user
// (Bigship Direct, Unified Outbound API, v1.4, 09-06-2026).
// Base: https://api.bigship.direct/  Amounts in the API are in RUPEES, not paise.
// Auth: POST /api/outbound/login { username, password, access_key } ->
//   Bearer token + tokenExpiringAt. All other calls send Authorization: Bearer.
// Segment used for this store: domestic_b2c (B2C fabric / home textiles).
// Credentials are NEVER in this file or in chat: they live in the app's
// local .env only (BIGSHIP_USERNAME / BIGSHIP_PASSWORD / BIGSHIP_ACCESS_KEY /
// BIGSHIP_WAREHOUSE_ID / BIGSHIP_PICKUP_PINCODE). Without them every call
// returns { configured: false } and the caller falls back to the local rule,
// exactly like the Razorpay credential-gating in payments.ts.
// Rate limit: 100 requests/min/IP (429 on excess). All calls use a 15s
// timeout so a hung provider call cannot hold a checkout transaction open.

export const BIGSHIP_BASE = (process.env.BIGSHIP_BASE_URL || "https://api.bigship.direct").replace(/\/$/, "");
export const BIGSHIP_SEGMENT = process.env.BIGSHIP_SEGMENT || "domestic_b2c";

export function bigshipConfigured(): boolean {
  return !!(process.env.BIGSHIP_USERNAME && process.env.BIGSHIP_PASSWORD && process.env.BIGSHIP_ACCESS_KEY);
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function bigshipFetch(path: string, init: RequestInit, token?: string): Promise<unknown> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BIGSHIP_BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error(`Bigship request to ${path} timed out after 15s. No shipment was created or changed.`);
  }
  const text = await res.text().catch(() => "");
  let j: { status?: boolean; message?: string; status_code?: number; data?: unknown; errors?: unknown } = {};
  try { j = JSON.parse(text) as typeof j; } catch { /* non-JSON body */ }
  if (!res.ok || j.status === false) {
    const msg = j.message || (j.errors ? JSON.stringify(j.errors) : "") || text;
    throw new Error(`Bigship ${path} failed (${res.status}): ${String(msg).slice(0, 300)}`);
  }
  return j.data;
}

export async function bigshipLogin(): Promise<string> {
  if (!bigshipConfigured()) throw new Error("Bigship is not configured (BIGSHIP_USERNAME / BIGSHIP_PASSWORD / BIGSHIP_ACCESS_KEY are empty). Put them in the app's local .env only — never in chat.");
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const data = await bigshipFetch("/api/outbound/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.BIGSHIP_USERNAME,
      password: process.env.BIGSHIP_PASSWORD,
      access_key: process.env.BIGSHIP_ACCESS_KEY,
    }),
  }) as { token: string; tokenExpiringAt?: string; is_outbound_service_enabled?: string | number };
  if (!data.token) throw new Error("Bigship login returned no token.");
  const expiresAt = data.tokenExpiringAt ? Date.parse(data.tokenExpiringAt) : Date.now() + 3600_000;
  tokenCache = { token: data.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 3600_000 };
  return tokenCache.token;
}

async function authed(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await bigshipLogin();
  try {
    return await bigshipFetch(path, init, token);
  } catch (e) {
    // Token expired mid-call: clear cache once and retry once.
    if (String((e as Error).message).includes("401")) {
      tokenCache = null;
      return await bigshipFetch(path, init, await bigshipLogin());
    }
    throw e;
  }
}

export type BigshipRate = {
  courierId: number | string; courierName: string; courierType?: string; planName?: string;
  total: number; tat?: string; zone?: string; riskCharge?: string; codCharges?: number;
  courierCharge?: number; charged_weight?: number;
};

export async function bigshipPaymentModes(segment = BIGSHIP_SEGMENT): Promise<Array<{ paymentModeId: string; paymentModeName: string }>> {
  const data = await authed(`/api/outbound/get-payment-mode?segment_type=${encodeURIComponent(segment)}`, { method: "GET", headers: { "Content-Type": "application/json" } });
  return Array.isArray(data) ? data as Array<{ paymentModeId: string; paymentModeName: string }> : [];
}

export async function bigshipRiskTypes(): Promise<Array<{ riskTypeId: number; riskName: string; slug: string }>> {
  const data = await authed("/api/outbound/domestic/risk-types", { method: "GET", headers: { "Content-Type": "application/json" } });
  return Array.isArray(data) ? data as Array<{ riskTypeId: number; riskName: string; slug: string }> : [];
}

export type BigshipBox = { length: number; breadth: number; height: number; weightKg: number; count?: number };

export async function bigshipRateCalculator(args: {
  sourcePincode: string; destPincode: string; invoiceValueRupees: number;
  paymentModeId: number; riskTypeId?: number; boxes: BigshipBox[];
}): Promise<BigshipRate[]> {
  const token = await bigshipLogin();
  const data = await bigshipFetch("/api/outbound/user-rate-calculator", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      segment_type: BIGSHIP_SEGMENT,
      sourcePincode: Number(args.sourcePincode),
      destPincode: Number(args.destPincode),
      invoiceValue: args.invoiceValueRupees,
      paymentModeId: args.paymentModeId,
      ...(args.paymentModeId === 2 ? { codAmount: args.invoiceValueRupees } : {}),
      ...(args.riskTypeId ? { riskTypeId: args.riskTypeId } : {}),
      boxes: args.boxes.map((b) => ({
        no_of_box: String(b.count || 1),
        box_length: String(b.length), box_width: String(b.breadth), box_height: String(b.height),
        box_dead_weight: String(b.weightKg),
      })),
    }),
  }, token) as BigshipRate[] | { calculatedRates?: BigshipRate[] };
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { calculatedRates?: BigshipRate[] }).calculatedRates)) return (data as { calculatedRates: BigshipRate[] }).calculatedRates;
  return [];
}

// Weight estimate for a parcel: fabric weight = GSM (g/m2) x area (m2).
// widthCm/gsm come from the product; length is total fabric cm in the order.
// Non-fabric pieces default to 0.5 kg each. Minimum parcel weight 0.5 kg,
// matching Bigship's requirement that dimensions + actual weight are given
// for every shipment. This is an estimate, not a courier-weighed value.
export function estimateParcel(items: Array<{ gsm?: number | null; widthCm?: number | null; quantityCm?: number | null; quantity?: number; type?: string }>): BigshipBox {
  let kg = 0;
  for (const it of items) {
    if (it.quantityCm && it.gsm && it.widthCm) {
      const areaM2 = (it.widthCm / 100) * (it.quantityCm / 100);
      kg += (it.gsm * areaM2) / 1000;
    } else {
      kg += 0.5 * (it.quantity || 1);
    }
  }
  return { length: 40, breadth: 30, height: 10, weightKg: Math.max(0.5, Math.round(kg * 100) / 100), count: 1 };
}

export type BigshipDraftProduct = { productName: string; hsn?: string; qty: number; amount: number; totalAmount: number; collectableAmount: number; categoryId?: string };

export async function bigshipCreateDraftOrder(args: {
  pickupWarehouseId: number; returnWarehouseId: number;
  paymentModeId: number; invoiceNo: string; invoiceAmountRupees: number;
  shippingName: string; shippingEmail?: string; shippingMobile: string;
  shippingAddress: string; shippingAddress2?: string; shippingLandmark?: string;
  shippingZip: string; shippingCity: string; shippingState: string;
  boxes: BigshipBox[]; products: BigshipDraftProduct[];
}): Promise<string> {
  const token = await bigshipLogin();
  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");
  const data = await bigshipFetch("/api/outbound/create-order", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      segment_type: BIGSHIP_SEGMENT,
      MasterOrderPickUpLocation: args.pickupWarehouseId,
      MasterOrderReturnLocation: args.returnWarehouseId,
      MasterOrderDate: nowUtc,
      MasterOrderPaymentMode: args.paymentModeId,
      OrderInvoiceNo: args.invoiceNo,
      MasterOrderInvoiceAmount: args.invoiceAmountRupees,
      MasterOrderShippingName: args.shippingName,
      ...(args.shippingEmail ? { MasterOrderShippingEmail: args.shippingEmail } : {}),
      MasterOrderShippingMobileNo: args.shippingMobile,
      MasterOrderShippingAddress: args.shippingAddress,
      ...(args.shippingAddress2 ? { MasterOrderShippingAddress2: args.shippingAddress2 } : {}),
      ...(args.shippingLandmark ? { MasterOrderShippingLandmark: args.shippingLandmark } : {}),
      MasterOrderShippingZipCode: args.shippingZip,
      MasterOrderShippingCountry: "India",
      MasterOrderShippingState: args.shippingState,
      MasterOrderShippingCity: args.shippingCity,
      totalNumOfBoxes: args.boxes.reduce((s, b) => s + (b.count || 1), 0),
      boxes: args.boxes.map((b) => ({
        weight_unit: "kg", dimension_unit: "cm", noOfBoxes: b.count || 1,
        dimensions: [{ length: b.length, breadth: b.breadth, height: b.height, weight: b.weightKg }],
        products: args.products,
      })),
    }),
  }, token) as { CustomGlobalOrderId: string };
  if (!data.CustomGlobalOrderId) throw new Error("Bigship create-order returned no CustomGlobalOrderId.");
  return String(data.CustomGlobalOrderId);
}

export async function bigshipCourierRates(masterCustomOrderId: string): Promise<BigshipRate[]> {
  const token = await bigshipLogin();
  const data = await bigshipFetch("/api/outbound/courier-wise-shipment-cost", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ MasterCustomOrderId: masterCustomOrderId }),
  }, token) as { calculatedRates?: BigshipRate[] } | BigshipRate[];
  if (Array.isArray(data)) return data;
  return (data as { calculatedRates?: BigshipRate[] }).calculatedRates || [];
}

export async function bigshipPlaceOrder(args: { masterCustomOrderId: string; courierId: number | string; riskTypeId?: number }): Promise<{ reference_number: string; awb_assigned: string }> {
  const token = await bigshipLogin();
  // Domestic B2C/B2B place-order must be multipart/form-data per the PDF.
  // No invoice file is sent for B2C here (invoice file is B2B-only in the doc).
  const form = new FormData();
  form.append("MasterCustomOrderId", args.masterCustomOrderId);
  form.append("courierId", String(args.courierId));
  if (args.riskTypeId) form.append("riskTypeId", String(args.riskTypeId));
  const data = await bigshipFetch("/api/outbound/place-order", { method: "POST", body: form }, token) as { reference_number: string; awb_assigned: string };
  if (!data.awb_assigned) throw new Error("Bigship place-order returned no AWB.");
  return data;
}

export async function bigshipCancelOrder(customGlobalOrderId: string): Promise<boolean> {
  const token = await bigshipLogin();
  await bigshipFetch("/api/outbound/cancel-order", {
    method: "POST", headers: { "Content-Type": "application/json" },
    // PDF request field is MasterCustomOrderId; sample body uses
    // CustomGlobalOrderId. Send both keys so either parser accepts it.
    body: JSON.stringify({ MasterCustomOrderId: customGlobalOrderId, CustomGlobalOrderId: customGlobalOrderId }),
  }, token);
  return true;
}

export type BigshipTrack = {
  tracking_number?: string; courier_name?: string; tag?: string; order_status?: string;
  latest_checkpoint_time?: string; tracking_histories?: Array<{ tag: string; order_status: string; checkpoint_time: string; message: string }>;
};

export async function bigshipTrackOrder(customGlobalOrderId: string): Promise<BigshipTrack> {
  const token = await bigshipLogin();
  const data = await bigshipFetch("/api/outbound/track-order", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CustomGlobalOrderId: customGlobalOrderId }),
  }, token) as BigshipTrack;
  return data;
}

export async function bigshipOrderDetails(masterCustomOrderId: string): Promise<Record<string, unknown>> {
  const token = await bigshipLogin();
  const data = await bigshipFetch("/api/outbound/order-shipment-details", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ MasterCustomOrderId: masterCustomOrderId }),
  }, token);
  return data as Record<string, unknown>;
}

export async function bigshipDownloadDocument(customGlobalOrderId: string, document_type: "invoice" | "label" | "ewaybill" | "manifest"): Promise<{ AttachmentData: string; File_extention: string }> {
  const token = await bigshipLogin();
  const data = await bigshipFetch("/api/outbound/download-shipment-documents", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CustomGlobalOrderId: customGlobalOrderId, document_type }),
  }, token) as { AttachmentData: string; File_extention: string };
  return data;
}
