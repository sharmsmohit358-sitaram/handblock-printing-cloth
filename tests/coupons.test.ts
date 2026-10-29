import test from "node:test";
import assert from "node:assert";
import { validateCouponInput } from "../src/lib/coupons";
test("valid percent coupon", () => assert.equal(validateCouponInput({ code: "diwali20", percentOff: 20, flatPaise: 0, minSubtotalPaise: 200000 }).ok, true));
test("valid flat coupon", () => { const r = validateCouponInput({ code: "FESTIVE500", percentOff: 0, flatPaise: 50000, minSubtotalPaise: 0 }); assert.equal(r.ok, true); if (r.ok) assert.equal(r.value.code, "FESTIVE500"); });
test("both percent and flat rejected", () => assert.equal(validateCouponInput({ code: "BAD1", percentOff: 10, flatPaise: 1000, minSubtotalPaise: 0 }).ok, false));
test("neither discount rejected", () => assert.equal(validateCouponInput({ code: "BAD2", percentOff: 0, flatPaise: 0, minSubtotalPaise: 0 }).ok, false));
test("percent over 100 rejected, short code rejected", () => {
  assert.equal(validateCouponInput({ code: "BIG", percentOff: 101, flatPaise: 0, minSubtotalPaise: 0 }).ok, false);
  assert.equal(validateCouponInput({ code: "AB", percentOff: 10, flatPaise: 0, minSubtotalPaise: 0 }).ok, false);
});
