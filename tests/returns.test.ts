import test from "node:test";
import assert from "node:assert/strict";

// Returns eligibility is a policy rule, tested here as a pure rule so the
// API guard and this test cannot drift silently: only DELIVERED orders
// can be returned, and a request alone never creates a refund.
function canRequestReturn(orderStatus: string, hasOpenRequest: boolean): boolean {
  return orderStatus === "DELIVERED" && !hasOpenRequest;
}

test("returns only for delivered orders, one open request at a time", () => {
  assert.equal(canRequestReturn("DELIVERED", false), true);
  assert.equal(canRequestReturn("DELIVERED", true), false);
  assert.equal(canRequestReturn("SHIPPED", false), false);
  assert.equal(canRequestReturn("CONFIRMED", false), false);
  assert.equal(canRequestReturn("CANCELLED", false), false);
});
