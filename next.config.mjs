/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security headers (deployment prep, 28 Oct 2026). No strict CSP yet:
  // Razorpay Checkout + Next.js inline scripts would need a carefully
  // tested allow-list first; these headers are safe without breaking
  // checkout. Add CSP only after testing it against Razorpay Checkout.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // HSTS: browsers ignore it on localhost, and it only matters once
        // the permanent HTTPS domain is live.
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
};
export default nextConfig;
