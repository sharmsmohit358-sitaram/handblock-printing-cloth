# Bigship integration — Handblock Printing Cloth

Shipping provider: **Bigship, not Shiprocket** (user choice, 28 Oct 2026).
Source API doc: `Documentation-for-Unified-Outbound-API.pdf`
(Bigship Direct, Unified Outbound API v1.4, 09-06-2026), supplied by the user.
Base URL: `https://api.bigship.direct/` — amounts in the API are in **rupees**,
not paise. Rate limit: 100 requests/min/IP.

## Flow (domestic_b2c)

1. Login: `POST /api/outbound/login` with `username` (email), `password`,
   `access_key` -> Bearer token + `tokenExpiringAt`. Token is cached in
   memory until 60s before expiry, then re-fetched. No other call works
   without it.
2. Pincode / rate check: `POST /api/outbound/user-rate-calculator`
   (`segment_type=domestic_b2c`, source + dest pincode, invoice value,
   paymentModeId 1=Prepaid / 2=COD, boxes with length/breadth/height/
   dead weight). Used by the store's pincode checker when Bigship is
   configured; otherwise the labelled local rule is used.
3. Draft order: `POST /api/outbound/create-order` (`segment_type=
   domestic_b2c`, pickup + return warehouse IDs, UTC order date,
   invoice number = store order number, invoice amount = sum of product
   totals in rupees, receiver address, 1 box, products with qty/amount/
   total/collectable). Returns `CustomGlobalOrderId`.
4. Courier rates: `POST /api/outbound/courier-wise-shipment-cost`
   with `MasterCustomOrderId` -> `calculatedRates` (courierId, name,
   total, tat, zone).
5. Place/manifest: `POST /api/outbound/place-order` as
   **multipart/form-data** (domestic requirement in the PDF) with
   `MasterCustomOrderId`, `courierId`, `riskTypeId` (2 = Owner Risk).
   Returns `reference_number` + `awb_assigned`. No invoice file is sent
   for B2C (invoice file is B2B-only in the doc).
6. Track: `POST /api/outbound/track-order` with `CustomGlobalOrderId`
   -> tracking number, courier, status/tag, checkpoint histories.
7. Details: `POST /api/outbound/order-shipment-details` with
   `MasterCustomOrderId` -> AWB, status, consignor/consignee.
8. Documents: `POST /api/outbound/download-shipment-documents` with
   `CustomGlobalOrderId` + `document_type` (invoice/label/ewaybill/
   manifest) -> PDF URL.
9. Cancel: `POST /api/outbound/cancel-order` before Rider-Assigned.
   The PDF's field name is inconsistent (MasterCustomOrderId in the
   field list, CustomGlobalOrderId in the sample); the adapter sends both.

## Store wiring

- `src/lib/bigship.ts` — adapter above, 15s timeout on every call.
- `src/lib/payments.ts` `checkShipping()` — Bigship live check when
  `BIGSHIP_*` + `BIGSHIP_PICKUP_PINCODE` are set, else local rule.
- `POST /api/admin/shipments` (admin token only) — step 1: draft + rates;
  step 2: place with `bigshipOrderId` + `courierId`, store shipment,
  move store order to SHIPPED.
- `GET /api/shipments?orderNumber=HPC...` (order owner or admin) —
  live Bigship track, stored in `shipments.trackingJson`;
  `&document=label|invoice|manifest|ewaybill` returns the document URL.
- Admin page: `/admin/shipments` — two-step draft -> place UI.
- Order page: shows Bigship AWB + courier + Bigship status when shipped.
- Parcel weight: `estimateParcel()` in `bigship.ts` — fabric weight =
  GSM x width x length, non-fabric 0.5 kg/piece, minimum 0.5 kg.
  This is an estimate; the courier-weighed value governs the final charge.

## Setup (user machine only, never in chat)

Copy `.env.example` to `.env` and fill, from your Bigship account/POC:

```
BIGSHIP_USERNAME="your Bigship login email"
BIGSHIP_PASSWORD="your Bigship login password"
BIGSHIP_ACCESS_KEY="your Bigship access_key"
BIGSHIP_WAREHOUSE_ID="your pickup warehouse ID from Bigship"
BIGSHIP_PICKUP_PINCODE="your pickup pincode"
BIGSHIP_SEGMENT="domestic_b2c"
```

Restart the store after changing `.env`. Create/save the warehouse in
Bigship first if you do not have a warehouse ID yet
(`save-warehouse-data` / warehouse list in the PDF).

## What is NOT yet verified live

- No Bigship credentials have been used yet, so no live draft, AWB,
  label, or tracking has been proven. The adapter is code-complete and
  unit-tested for the parcel estimator, but a live test needs the user's
  Bigship credentials in their local `.env` only, plus a warehouse ID.
- Do not send Bigship username/password/access_key in chat. Like the
  Razorpay keys, they belong in the local `.env` only and should be
  regenerated if ever shared in chat.
- The old Shiprocket placeholder has been removed from `payments.ts`
  and `.env.example`.
