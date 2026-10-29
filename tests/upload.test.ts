import test from "node:test";
import assert from "node:assert/strict";
import { validateUploadFile, UPLOAD_MAX_BYTES } from "../src/lib/upload";

test("photo upload allows jpeg/png/webp, rejects others and oversize", () => {
  assert.equal(validateUploadFile("image/jpeg", 1000).ok, true);
  assert.equal(validateUploadFile("image/jpeg", 1000).ext, "jpg");
  assert.equal(validateUploadFile("image/png", 1000).ext, "png");
  assert.equal(validateUploadFile("image/webp", 1000).ext, "webp");
  assert.equal(validateUploadFile("image/svg+xml", 1000).ok, false);
  assert.equal(validateUploadFile("application/pdf", 1000).ok, false);
  assert.equal(validateUploadFile("image/jpeg", UPLOAD_MAX_BYTES + 1).ok, false);
  assert.equal(validateUploadFile("image/jpeg", 0).ok, false);
});
