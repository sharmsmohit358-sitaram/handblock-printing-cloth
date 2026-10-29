import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never index auth, account, cart, checkout, or admin.
        disallow: ["/account", "/admin", "/cart", "/checkout", "/login", "/register", "/forgot", "/reset", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
