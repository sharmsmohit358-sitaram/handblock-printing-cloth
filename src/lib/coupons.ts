// Coupon rules — shared by the admin API and tests, so checkout's
// existing behaviour (percent OR flat, min subtotal, active only) cannot
// drift from what the admin form allows.
// Checkout already does: code uppercased, active=1 only, percent rounds
// subtotal * percent / 100, otherwise flatPaise, minSubtotalPaise check.
export type CouponInput = { code: string; percentOff: number; flatPaise: number; minSubtotalPaise: number };
export function validateCouponInput(raw: unknown): { ok: true; value: CouponInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Coupon fields are required." };
  const r = raw as Record<string, unknown>;
  const code = String(r.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, error: "Code must be 3–20 letters or digits (e.g. DIWALI20)." };
  const percentOff = Number(r.percentOff || 0), flatPaise = Number(r.flatPaise || 0), minSubtotalPaise = Number(r.minSubtotalPaise || 0);
  if (!Number.isInteger(percentOff) || !Number.isInteger(flatPaise) || !Number.isInteger(minSubtotalPaise)) return { ok: false, error: "Percent, flat amount and minimum must be whole numbers." };
  if (minSubtotalPaise < 0) return { ok: false, error: "Minimum order cannot be negative." };
  if (percentOff > 0 && flatPaise > 0) return { ok: false, error: "Use either a percent discount or a flat discount, not both." };
  if (percentOff < 0 || percentOff > 100) return { ok: false, error: "Percent discount must be 0–100." };
  if (flatPaise < 0) return { ok: false, error: "Flat discount cannot be negative." };
  if (percentOff === 0 && flatPaise === 0) return { ok: false, error: "A coupon must give a percent or a flat discount." };
  return { ok: true, value: { code, percentOff, flatPaise, minSubtotalPaise } };
}
