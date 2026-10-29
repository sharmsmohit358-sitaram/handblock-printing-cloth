import type { MetadataRoute } from "next";
import { allAsync } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticPages = ["", "/products", "/about", "/faq", "/shipping", "/returns", "/terms", "/privacy", "/wholesale", "/contact"];
  const entries: MetadataRoute.Sitemap = staticPages.map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
  try {
    const products = await allAsync<{ slug: string }>("SELECT slug FROM products WHERE isActive=1");
    for (const p of products) entries.push({ url: `${base}/products/${p.slug}`, lastModified: new Date() });
  } catch { /* sitemap must never break the build if DB is unavailable */ }
  return entries;
}
