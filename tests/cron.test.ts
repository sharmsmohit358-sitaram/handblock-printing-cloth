import test from "node:test";
import assert from "node:assert";
import { isCronAuthorized } from "../src/lib/cron";
function req(url: string, headers: Record<string, string> = {}) { return new Request(url, { headers }); }
test("cron auth: bearer secret passes, wrong secret fails", () => {
  process.env.CRON_SECRET = "test-secret-123";
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid", { authorization: "Bearer test-secret-123" })), true);
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid", { authorization: "Bearer wrong" })), false);
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid?token=test-secret-123")), true);
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid?token=nope")), false);
  delete process.env.CRON_SECRET;
});
test("cron auth: no secret falls back to admin cookie", () => {
  delete process.env.CRON_SECRET; process.env.ADMIN_TOKEN = "adm-1";
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid", { cookie: "hpc-admin=adm-1" })), true);
  assert.equal(isCronAuthorized(req("https://example.com/api/cron/expire-unpaid", { cookie: "hpc-admin=wrong" })), false);
  delete process.env.ADMIN_TOKEN;
});
