export type CartItem = { slug: string; name: string; image: string; type: string; pricePaise: number; quantityCm?: number; quantity?: number; variantId?: string; variantName?: string; allowSplit?: boolean };
const KEY = "hpc-cart-v1";
export function loadCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export function saveCart(c: CartItem[]) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function addToCart(item: CartItem) { const c = loadCart(); const i = c.findIndex(x => x.slug === item.slug && x.variantId === item.variantId && x.quantityCm === item.quantityCm); if (i >= 0) { if (item.type === "FABRIC") c[i].quantityCm = (c[i].quantityCm || 0) + (item.quantityCm || 0); else c[i].quantity = (c[i].quantity || 1) + (item.quantity || 1); } else c.push(item); saveCart(c); }
