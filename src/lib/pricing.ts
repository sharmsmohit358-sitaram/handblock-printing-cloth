// Money = integer paise. Fabric = integer centimetres. Never floats for money/measure.
export type Tier = { minCm: number; pricePaise: number };
export function inr(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
export function parseTiers(json: string): Tier[] {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function unitPricePaise(basePaise: number, tiers: Tier[], qtyCm: number): number {
  let p = basePaise;
  for (const t of [...tiers].sort((a, b) => a.minCm - b.minCm)) if (qtyCm >= t.minCm) p = t.pricePaise;
  return p;
}
export function validateFabricQty(cm: number, minCm: number, maxCm: number, incCm: number): string | null {
  if (!Number.isInteger(cm) || cm <= 0) return "Quantity must be a positive whole number of centimetres.";
  if (cm < minCm) return `Minimum order is ${minCm / 100} m.`;
  if (cm > maxCm) return `Maximum order is ${maxCm / 100} m.`;
  if (cm % incCm !== 0) return `Quantity must be in steps of ${incCm / 100} m.`;
  return null;
}
// Acceptance example: 3.5 m = 350 cm at Rs 250/m = 25000 paise/m -> 87500 paise = Rs 875
export function fabricSubtotalPaise(unitPaisePerM: number, qtyCm: number): number {
  // (paise/m * cm) / 100, exact when qty is a multiple of 50 cm and price is whole paise
  return Math.round((unitPaisePerM * qtyCm) / 100);
}
export type Roll = { id: string; remainingCm: number; rollCode: string };
export type Allocation = { rollId: string; cm: number };
export function allocateRoll(rolls: Roll[], neededCm: number, allowSplit: boolean): { rollId: string | null; split: boolean; error: string | null; allocations: Allocation[] } {
  const single = rolls.filter(r => r.remainingCm >= neededCm).sort((a, b) => a.remainingCm - b.remainingCm)[0];
  if (single) return { rollId: single.id, split: false, error: null, allocations: [{ rollId: single.id, cm: neededCm }] };
  if (!allowSplit) return { rollId: null, split: false, error: "No single roll is long enough for one continuous cut. Approve multiple cuts, or choose a shorter length.", allocations: [] };
  const total = rolls.reduce((s, r) => s + r.remainingCm, 0);
  if (total < neededCm) return { rollId: null, split: true, error: "Not enough fabric in stock for this length.", allocations: [] };
  // Split: consume smallest rolls first, preserving long rolls for future continuous cuts.
  const allocs: Allocation[] = []; let left = neededCm;
  for (const r of [...rolls].sort((a, b) => a.remainingCm - b.remainingCm)) { if (left <= 0) break; const take = Math.min(r.remainingCm, left); allocs.push({ rollId: r.id, cm: take }); left -= take; }
  return { rollId: null, split: true, error: null, allocations: allocs };
}
export function taxPaise(subtotalAfterDiscount: number, ratePercent = 5): number {
  return Math.round((subtotalAfterDiscount * ratePercent) / 100);
}
export function shippingPaise(subtotalAfterDiscount: number, freeThreshold = 199900, flat = 9900): number {
  return subtotalAfterDiscount >= freeThreshold ? 0 : flat;
}
export function isServiceablePincode(p: string): boolean {
  return /^[1-9][0-9]{5}$/.test(p);
}
