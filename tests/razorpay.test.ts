import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
process.env.RAZORPAY_KEY_SECRET = "test_secret_123";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_123";
import { verifyRazorpaySignature, verifyWebhookSignature } from "../src/lib/payments";
test("razorpay checkout signature verifies, wrong signature fails", () => {
  const sig = crypto.createHmac("sha256", "test_secret_123").update("order_1|pay_1").digest("hex");
  assert.equal(verifyRazorpaySignature("order_1", "pay_1", sig), true);
  assert.equal(verifyRazorpaySignature("order_1", "pay_1", "0".repeat(64)), false);
  assert.equal(verifyRazorpaySignature("order_1", "pay_1", "short"), false);
});
test("webhook signature verifies, wrong signature fails", () => {
  const raw = JSON.stringify({ event: "payment.captured" });
  const sig = crypto.createHmac("sha256", "test_webhook_123").update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, sig), true);
  assert.equal(verifyWebhookSignature(raw, "bad"), false);
  assert.equal(verifyWebhookSignature(raw, null), false);
});
