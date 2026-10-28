import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { row } from "@/lib/db";
import type { ReactNode } from "react";
export const metadata = { title: "Handblock Printing Cloth — Handblock Printed Fabric by the Metre", description: "Handblock-printed cotton fabric by the metre, bedsheets and home textiles from Jaipur, India." };
export default function RootLayout({ children }: { children: ReactNode }) {
  const token = cookies().get("hpc-session")?.value; const sess = token ? row<{ userId: string; expiresAt: string }>("SELECT * FROM sessions WHERE token=?", token) : undefined; const loggedIn = !!(sess && new Date(sess.expiresAt) > new Date());
  return (<html lang="en"><body>
    <div className="bg-indigo2 text-white text-center text-sm py-2 px-4">Free shipping over ₹1,999 · Handblock-printed textiles, cut to your length</div>
    <header className="sticky top-0 bg-ivory/95 backdrop-blur border-b border-sand z-10"><div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
      <Link href="/" className="font-bold text-xl text-indigo2">Handblock Printing Cloth</Link>
      <form action="/products" className="flex-1 min-w-[200px]"><input name="q" placeholder="Search floral cotton, bedsheets…" className="w-full border rounded-full px-4 py-2 bg-white" /></form>
      <nav className="flex gap-4 text-sm font-medium"><Link href="/products?type=FABRIC">Fabric by Metre</Link><Link href="/products?type=BEDSHEET">Bedsheets</Link><Link href="/products">All Products</Link><Link href="/cart">Cart</Link>{loggedIn ? <Link href="/account">My Account</Link> : <><Link href="/login">Login</Link><Link href="/register">Register</Link></>}<Link href="/admin">Admin</Link></nav>
    </div></header>
    <main className="max-w-6xl mx-auto px-4 py-6 min-h-[70vh]">{children}</main>
    <footer className="bg-charcoal text-white mt-12"><div className="max-w-6xl mx-auto px-4 py-10 grid gap-6 sm:grid-cols-4">
      <div><h3 className="font-bold">Handblock Printing Cloth</h3><p className="text-sm text-gray-300 mt-2">Authentic handblock textiles, sold by the metre and as finished home textiles.</p></div>
      <div><h4 className="font-semibold">Shop</h4><ul className="text-sm mt-2 space-y-1"><li><Link href="/products?type=FABRIC">Fabric by Metre</Link></li><li><Link href="/products?type=BEDSHEET">Bedsheets</Link></li><li><Link href="/products?type=HOME">Home Furnishing</Link></li></ul></div>
      <div><h4 className="font-semibold">Help</h4><ul className="text-sm mt-2 space-y-1"><li><Link href="/shipping">Shipping Policy</Link></li><li><Link href="/returns">Return Policy</Link></li><li><Link href="/faq">FAQ</Link></li><li><Link href="/contact">Contact</Link></li></ul></div>
      <div><h4 className="font-semibold">Business</h4><ul className="text-sm mt-2 space-y-1"><li><Link href="/wholesale">Wholesale</Link></li><li><Link href="/about">Our Craftsmanship</Link></li><li><Link href="/privacy">Privacy</Link></li><li><Link href="/terms">Terms</Link></li></ul></div>
    </div><p className="text-center text-xs text-gray-400 pb-6">Prices in INR. Claims about material, origin and technique on each product page reflect that product&apos;s stored data.</p></footer>
  </body></html>);
}
