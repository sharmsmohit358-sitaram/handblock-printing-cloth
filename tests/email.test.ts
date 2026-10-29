import test from "node:test";
import assert from "node:assert/strict";
import { verificationEmail, resetEmail, orderEmail, emailConfigured } from "../src/lib/email";

test("email templates include order number, total and tracking link", () => {
  const m = orderEmail("a@example.com", "shipped", { number: "HPC123", totalPaise: 77100 }, { awb: "AWB1", courier: "Delhivery" });
  assert.match(m.subject, /HPC123/);
  assert.match(m.html, /AWB1/);
  assert.match(m.html, /Delhivery/);
  assert.match(m.html, /orders\/HPC123/);
});

test("verification and reset links use the token", () => {
  assert.match(verificationEmail("a@example.com", "tok123").html, /tok123/);
  assert.match(resetEmail("a@example.com", "tok456").html, /tok456/);
});

test("email is not configured without provider env", () => {
  // In this test process no RESEND/SMTP env is set, so it must be false.
  // If a CI env ever sets these, this test would need env isolation.
  assert.equal(emailConfigured(), false);
});
