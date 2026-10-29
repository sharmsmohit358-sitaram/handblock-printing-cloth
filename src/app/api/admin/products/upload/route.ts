import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { isAdminRequest, audit } from "@/lib/auth";
import { validateUploadFile } from "@/lib/upload";
import { uid } from "@/lib/db";

// Admin product photo upload. Admin token only.
// POST multipart/form-data with a single `file` field.
// Validation: JPEG/PNG/WebP only, <= 5 MB (see lib/upload.ts).
// Storage: public/uploads/<generated-id>.<ext> — the original filename
// is never used, so no path traversal or script upload via filename.
// Returns { url: "/uploads/....jpg" } for the product form's image field.
// Note: on a serverless host this file would not persist — this upload
// is for the persistent-disk deployment path (see docs/REVIEW). For
// Vercel-style deployment, swap this for S3/Cloudinary before launch.
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Admin sign-in required." }, { status: 403 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, error: "Expected multipart form data with a file field." }, { status: 400 }); }
  const file = form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) return NextResponse.json({ ok: false, error: "No photo file uploaded." }, { status: 400 });
  const v = validateUploadFile(file.type, file.size);
  if (!v.ok || !v.ext) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  const name = `${uid("img_")}.${v.ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await audit("admin", "product_photo_uploaded", `/uploads/${name}`);
  return NextResponse.json({ ok: true, url: `/uploads/${name}` });
}
