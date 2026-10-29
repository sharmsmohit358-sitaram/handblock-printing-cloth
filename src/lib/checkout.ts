import { z } from "zod";
import { rowAsync, withTx, uid } from "./db";
import { getProduct, rollsOf, variantsOf } from "./catalog";
import { validateFabricQty, unitPricePaise, parseTiers, fabricSubtotalPaise, allocateRoll, taxPaise, shippingPaise, isServiceablePincode } from "./pricing";
import { createPaymentOrder } from "./payments";
export const CartItemInput = z.object({ slug: z.string(), quantityCm: z.number().int().optional(), quantity: z.number().int().min(1).max(99).optional(), variantId: z.string().optional(), allowSplit: z.boolean().optional() });
export const CheckoutInput = z.object({
  items: z.array(CartItemInput).min(1), name: z.string().min(2), email: z.string().email().optional(), phone: z.string().min(10), line1: z.string().min(3), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^[1-9][0-9]{5}$/), paymentMethod: z.enum(["COD", "PREPAID"]), coupon: z.string().optional(),
});
export type CheckoutResult = { ok: boolean; orderNumber?: string; totalPaise?: number; payment?: unknown; error?: string };
export async function createOrder(input: z.infer<typeof CheckoutInput> & { userId?: string | null }): Promise<CheckoutResult> {
  if (!isServiceablePincode(input.pincode)) return { ok: false, error: "Invalid pincode." };
  try {
    // Order + items + stock updates commit together via withTx (SQLite:
    // BEGIN IMMEDIATE on the same connection; MySQL: one pool connection).
    // Catalog reads (getProduct/rollsOf/variantsOf) use the global async
    // helpers — product data does not change inside this transaction, so
    // that read path is safe; all writes go through tx.
    const { number, total, payment } = await withTx(async (tx) => {
      let subtotal = 0; const lines: { product: Awaited<ReturnType<typeof getProduct>>; item: z.infer<typeof CartItemInput>; unit: number; total: number; rollId: string | null; allocations: { rollId: string; cm: number }[] }[] = [];
      for (const item of input.items) {
        const product = await getProduct(item.slug); if (!product) throw new Error(`Product not found: ${item.slug}`);
        if (product.type === "FABRIC") {
          const cm = item.quantityCm ?? 0; const err = validateFabricQty(cm, product.minCm, product.maxCm, product.incrementCm); if (err) throw new Error(`${product.name}: ${err}`);
          const rolls = await rollsOf(product.id); const alloc = allocateRoll(rolls, cm, item.allowSplit ?? false); if (alloc.error) throw new Error(`${product.name}: ${alloc.error}`);
          const unit = unitPricePaise(product.pricePaise, parseTiers(product.tiersJson), cm); const total = fabricSubtotalPaise(unit, cm);
          lines.push({ product, item, unit, total, rollId: alloc.rollId, allocations: alloc.allocations }); subtotal += total;
        } else {
          const qty = item.quantity ?? 1; let unit = product.pricePaise;
          if (item.variantId) { const v = (await variantsOf(product.id)).find((x: { id: string }) => x.id === item.variantId); if (!v) throw new Error("Variant not found"); if (v.stock < qty) throw new Error(`${product.name}: only ${v.stock} in stock`); unit = v.pricePaise; }
          const total = unit * qty; lines.push({ product, item, unit, total, rollId: null, allocations: [] }); subtotal += total;
        }
      }
      let discount = 0;
      if (input.coupon) { const c = await tx.row<{ percentOff: number; flatPaise: number; minSubtotalPaise: number }>("SELECT * FROM coupons WHERE code=? AND active=1", input.coupon.toUpperCase()); if (!c) throw new Error("Coupon not found or inactive"); if (subtotal < c.minSubtotalPaise) throw new Error("Coupon minimum order not met"); discount = c.percentOff ? Math.round(subtotal * c.percentOff / 100) : c.flatPaise; }
      const after = subtotal - discount; const tax = taxPaise(after, Number(process.env.TAX_RATE_PERCENT || 5)); const shipping = shippingPaise(after, Number(process.env.FREE_SHIPPING_THRESHOLD_PAISE || 199900), Number(process.env.FLAT_SHIPPING_PAISE || 9900)); const total = after + tax + shipping;
      if (input.paymentMethod === "COD" && total > 1000000) throw new Error("COD is available up to Rs 10,000 per order in this configuration.");
      const payment = await createPaymentOrder(total, input.paymentMethod);
      if (input.paymentMethod === "PREPAID" && payment.mode === "disabled") throw new Error(payment.message);
      const orderId = uid("ord_"); const number = "HPC" + Date.now().toString().slice(-8);
      const addressJson = JSON.stringify({ name: input.name, email: input.email || "", phone: input.phone, line1: input.line1, city: input.city, state: input.state, pincode: input.pincode });
      await tx.run("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", orderId, number, input.userId || null, "PLACED", subtotal, discount, tax, shipping, total, input.paymentMethod, payment.mode === "cod" ? "AWAITING_COD" : "AWAITING_PAYMENT", addressJson, input.pincode, new Date().toISOString(), payment.orderId || null, null);
      for (const l of lines) {
        await tx.run("INSERT INTO order_items VALUES(?,?,?,?,?,?,?,?,?,?,?)", uid("oi_"), orderId, l.product!.id, l.product!.name, l.product!.slug, l.unit, l.product!.type === "FABRIC" ? (l.item.quantityCm ?? 0) : null, l.product!.type === "FABRIC" ? 1 : (l.item.quantity ?? 1), l.total, l.product!.type === "FABRIC" ? (l.item.allowSplit ? "Multiple cuts approved" : "One continuous cut") : (l.item.variantId || ""), l.allocations.length > 1 ? l.allocations.map(a => `${a.rollId}:${a.cm}`).join(",") : l.rollId);
        if (l.product!.type === "FABRIC") for (const a of l.allocations) await tx.run("UPDATE fabric_rolls SET remainingCm = remainingCm - ? WHERE id=?", a.cm, a.rollId);
        if (l.item.variantId) await tx.run("UPDATE variants SET stock = stock - ? WHERE id=?", l.item.quantity ?? 1, l.item.variantId);
      }
      await tx.run("INSERT INTO audit_log VALUES(?,?,?,?,?)", uid("aud_"), "checkout", "order_created", number, new Date().toISOString());
      return { number, total, payment };
    });
    // Order email is best-effort: it must never fail the order itself.
    try {
      const toEmail = input.email || (input.userId ? (await rowAsync<{ email: string }>("SELECT email FROM users WHERE id=?", input.userId))?.email : "") || "";
      if (toEmail) {
        const { sendEmail, orderEmail } = await import("./email");
        await sendEmail(orderEmail(toEmail, "placed", { number, totalPaise: total }));
      }
    } catch { /* email failure is logged in email_logs, order stands */ }
    return { ok: true, orderNumber: number, totalPaise: total, payment };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Checkout failed" }; }
}
