import { rowAsync, withTx, uid } from "../src/lib/db";
// Seed works on both backends: SQLite locally (tables auto-created by db())
// and Hostinger MySQL (tables must first be imported from prisma/schema-mysql.sql).
async function main() {
  const exists = await rowAsync<{ n: number }>("SELECT COUNT(*) n FROM products");
  if (exists && exists.n > 0) { console.log("Seed skipped: products already present"); return; }
  await withTx(async (tx) => {
    const cat = async (slug: string, name: string) => { const id = uid("cat_"); await tx.run("INSERT INTO categories VALUES(?,?,?,?,?)", id, slug, name, null, name); return id; };
    const cFabric = await cat("fabric-by-meter", "Fabric by Meter"), cBed = await cat("bedsheets", "Bedsheets & Bedding"), cHome = await cat("home-furnishing", "Home Furnishing"), cDress = await cat("dress-materials", "Dress Materials"), cCloth = await cat("clothing", "Clothing & Accessories");
    type P = [string, string, string, string, string, string, string, string, number | null, number | null, number, string, string, string];
    const prod = async (p: P, categoryId: string) => {
      const [slug, name, type, desc, material, tech, pattern, color, width, gsm, price, image, wash, origin] = p;
      const id = uid("prod_");
      await tx.run("INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)", id, slug, name, type, categoryId, desc, material, tech, pattern, color, width, gsm, price, 50, 10000, 50, JSON.stringify(type === "FABRIC" ? [{ minCm: 1000, pricePaise: Math.round(price * 0.92) }, { minCm: 5000, pricePaise: Math.round(price * 0.84) }] : []), image, wash, origin);
      return id;
    };
    const f1 = await prod(["blue-floral-handblock-cotton", "Blue Floral Handblock Cotton", "FABRIC", "Handblock-printed cotton with a blue floral motif. Sold by the metre, cut from a single roll.", "Cotton", "Handblock", "Floral", "Blue", 112, 110, 25000, "/patterns/floral.svg", "Machine wash cold, dry in shade", "Jaipur, Rajasthan"], cFabric);
    const f2 = await prod(["indigo-geometric-cotton", "Indigo Geometric Cotton", "FABRIC", "Bold indigo geometric handblock print on soft cotton.", "Cotton", "Handblock", "Geometric", "Indigo", 112, 120, 28000, "/patterns/geometric.svg", "Machine wash cold", "Bagru, Rajasthan"], cFabric);
    const f3 = await prod(["bagru-rust-cotton", "Bagru Rust Cotton", "FABRIC", "Bagru-inspired rust print, a traditional Rajasthani style.", "Cotton", "Bagru-inspired", "Traditional", "Rust", 112, 115, 22000, "/patterns/bagru.svg", "Hand wash recommended", "Bagru, Rajasthan"], cFabric);
    const f4 = await prod(["ajrakh-inspired-cotton", "Ajrakh-Inspired Cotton", "FABRIC", "Ajrakh-inspired resist print in deep indigo and rust.", "Cotton", "Ajrakh-inspired", "Traditional", "Indigo", 112, 130, 32000, "/patterns/ajrakh.svg", "Dry clean first wash", "Kutch, Gujarat"], cFabric);
    const f5 = await prod(["white-mulmul-cotton", "White Mulmul Cotton", "FABRIC", "Feather-light mulmul for kurtas, scarves and summer dresses.", "Mulmul Cotton", "Handblock", "Plain", "White", 112, 80, 18000, "/patterns/plain.svg", "Gentle machine wash", "Jaipur, Rajasthan"], cFabric);
    const f6 = await prod(["natural-linen-blend", "Natural Linen Blend", "FABRIC", "Breathable linen blend with a subtle handblock border print.", "Linen Blend", "Handblock", "Border", "Natural", 140, 150, 45000, "/patterns/linen.svg", "Machine wash cold", "India"], cFabric);
    const b1 = await prod(["indigo-handblock-bedsheet-set", "Indigo Handblock Bedsheet Set", "BEDSHEET", "Handblock-printed bedsheet set. Dimensions and contents vary by variant — see variant details.", "Cotton", "Handblock", "Floral", "Indigo", null, 140, 149900, "/patterns/bedsheet.svg", "Machine wash cold", "Jaipur, Rajasthan"], cBed);
    const b2 = await prod(["terracotta-bedsheet-set", "Terracotta Handblock Bedsheet Set", "BEDSHEET", "Warm terracotta block print bedsheet set.", "Cotton", "Handblock", "Geometric", "Terracotta", null, 140, 119900, "/patterns/bedsheet2.svg", "Machine wash cold", "Jaipur, Rajasthan"], cBed);
    await prod(["floral-cushion-covers-pair", "Floral Cushion Covers (Pair)", "HOME", "Pair of handblock cushion covers, 16 x 16 inches.", "Cotton", "Handblock", "Floral", "Blue", null, null, 49900, "/patterns/floral.svg", "Machine wash cold", "Jaipur, Rajasthan"], cHome);
    await prod(["indigo-table-runner", "Indigo Table Runner", "HOME", "Handblock table runner, 60 x 14 inches.", "Cotton", "Handblock", "Geometric", "Indigo", null, null, 69900, "/patterns/geometric.svg", "Machine wash cold", "Jaipur, Rajasthan"], cHome);
    await prod(["unstitched-cotton-suit-set", "Unstitched Cotton Suit Set", "CLOTHING", "Unstitched suit set: top, bottom and dupatta fabric.", "Cotton", "Handblock", "Floral", "Green", null, null, 129900, "/patterns/floral.svg", "Machine wash cold", "Jaipur, Rajasthan"], cDress);
    await prod(["handblock-cotton-dupatta", "Handblock Cotton Dupatta", "CLOTHING", "Soft cotton dupatta, 2.5 metres, handblock printed.", "Cotton", "Handblock", "Floral", "Rust", null, null, 59900, "/patterns/bagru.svg", "Hand wash", "Jaipur, Rajasthan"], cCloth);
    const roll = async (pid: string, code: string, lot: string, cm: number) => tx.run("INSERT INTO fabric_rolls VALUES(?,?,?,?,?,?,?)", uid("roll_"), pid, code, lot, cm, cm, "Jaipur WH-1");
    for (const [i, pid] of [f1, f2, f3, f4, f5, f6].entries()) { await roll(pid, `R-${i + 1}A`, `LOT-2026-${i + 1}`, 1200); await roll(pid, `R-${i + 1}B`, `LOT-2026-${i + 1}`, 800); await roll(pid, `R-${i + 1}C`, `LOT-2026-${i + 1}`, 500); }
    const variant = async (pid: string, name: string, dim: string, inc: string, price: number, stock: number) => tx.run("INSERT INTO variants VALUES(?,?,?,?,?,?,?)", uid("var_"), pid, name, dim, inc, price, stock);
    await variant(b1, "King Size", "108 x 108 in", "1 Bedsheet + 2 Pillow Covers", 149900, 12); await variant(b1, "Queen Size", "90 x 108 in", "1 Bedsheet + 2 Pillow Covers", 129900, 15); await variant(b1, "Double", "90 x 90 in", "1 Bedsheet + 2 Pillow Covers", 109900, 20);
    await variant(b2, "Double", "90 x 90 in", "1 Bedsheet + 2 Pillow Covers", 119900, 10); await variant(b2, "King Size", "108 x 108 in", "1 Bedsheet + 2 Pillow Covers", 139900, 8);
    await tx.run("INSERT INTO coupons VALUES(?,?,?,?,?,1)", uid("cp_"), "WELCOME10", 10, 0, 0);
    await tx.run("INSERT INTO coupons VALUES(?,?,?,?,?,1)", uid("cp_"), "FESTIVE500", 0, 50000, 200000);
    await tx.run("INSERT INTO reviews VALUES(?,?,?,?,?,1)", uid("rev_"), f1, "Priya S.", 5, "Beautiful print, colours match the photos. The 3.5 m cut arrived as one continuous piece.");
    await tx.run("INSERT INTO reviews VALUES(?,?,?,?,?,1)", uid("rev_"), b1, "Anita R.", 5, "Soft cotton, fits our king bed well. Pillow covers included as described.");
  });
  console.log("Seeded products, rolls, variants, coupons, reviews");
}
main().catch((e) => { console.error(e); process.exit(1); });
