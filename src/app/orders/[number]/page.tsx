import { notFound } from "next/navigation";
import { rowAsync, allAsync } from "@/lib/db";
import { inr } from "@/lib/pricing";
const STEPS = ["PLACED", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
export default async function OrderPage({ params }: { params: { number: string } }) {
  const o = await rowAsync<{ number: string; status: string; subtotalPaise: number; discountPaise: number; taxPaise: number; shippingPaise: number; totalPaise: number; paymentMethod: string; paymentStatus: string; addressJson: string }>("SELECT * FROM orders WHERE number=?", params.number); if (!o) notFound();
  const items = await allAsync<{ nameSnapshot: string; quantityCm: number | null; quantity: number; unitPricePaise: number; totalPaise: number; cutInstructions: string }>("SELECT * FROM order_items WHERE orderId=(SELECT id FROM orders WHERE number=?)", params.number);
  const addr = JSON.parse(o.addressJson || "{}");
  const ship = await rowAsync<{ awb: string; courierName: string; status: string; bigshipOrderId: string }>("SELECT * FROM shipments WHERE orderNumber=?", params.number);
  return (<div><h1 className="text-3xl font-bold">Order {o.number}</h1><p className="mt-2">Status: <strong>{o.status}</strong> · Payment: {o.paymentMethod} / {o.paymentStatus}</p>
    {ship && <p className="mt-2 text-sm">Shipment (Bigship): AWB <strong>{ship.awb}</strong>{ship.courierName ? ` · ${ship.courierName}` : ""} · Bigship status: {ship.status} · <a className="underline" href={`/api/shipments?orderNumber=${params.number}`}>Refresh tracking (JSON)</a></p>}
    {o.status === "DELIVERED" && <p className="mt-2 text-sm"><a className="underline" href={`/returns/request`}>Request a return for this order</a> (delivered orders only, admin review required)</p>}
    <ol className="flex flex-wrap gap-2 mt-4">{STEPS.map(s => <li key={s} className={`px-3 py-1 rounded-full text-sm ${STEPS.indexOf(s) <= STEPS.indexOf(o.status) ? "bg-forest text-white" : "bg-white border"}`}>{s}</li>)}</ol>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-6"><h2 className="font-bold">Items (immutable purchase snapshot)</h2>{items.map((i, idx) => <p key={idx} className="text-sm mt-2">{i.nameSnapshot} — {i.quantityCm ? `${i.quantityCm / 100} m, ${i.cutInstructions}` : `Qty ${i.quantity}`} — {inr(i.unitPricePaise)} → {inr(i.totalPaise)}</p>)}
    <p className="mt-4 text-sm">Subtotal {inr(o.subtotalPaise)} · Discount −{inr(o.discountPaise)} · Tax {inr(o.taxPaise)} · Shipping {inr(o.shippingPaise)}</p><p className="font-bold mt-1">Total {inr(o.totalPaise)}</p><p className="text-sm text-gray-600 mt-2">Deliver to: {addr.name}, {addr.line1}, {addr.city}, {addr.state} {addr.pincode}</p></div>
  </div>);
}
