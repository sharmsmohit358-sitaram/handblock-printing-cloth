// Product photo upload validation (pure, unit-tested).
// Allowed: JPEG, PNG, WebP only. Max 5 MB. The stored filename is never
// taken from the user's original filename (path traversal / script upload
// risk) — it is a generated id + a safe extension mapped from the MIME type.
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export function validateUploadFile(mime: string, size: number): { ok: boolean; ext?: string; error?: string } {
  const ext = UPLOAD_MIME_TO_EXT[mime];
  if (!ext) return { ok: false, error: "Only JPEG, PNG, or WebP photos are allowed." };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "Empty file." };
  if (size > UPLOAD_MAX_BYTES) return { ok: false, error: "Photo must be 5 MB or smaller." };
  return { ok: true, ext };
}
