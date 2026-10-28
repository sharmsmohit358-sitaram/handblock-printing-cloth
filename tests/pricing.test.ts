import test from "node:test";
import assert from "node:assert";
import { fabricSubtotalPaise, validateFabricQty, unitPricePaise, allocateRoll, taxPaise, shippingPaise } from "../src/lib/pricing";
test("3.5m at Rs250/m = Rs875", () => assert.equal(fabricSubtotalPaise(25000, 350), 87500));
test("rejects non-increment quantity", () => assert.ok(validateFabricQty(360, 50, 10000, 50)));
test("accepts 0.5m steps", () => assert.equal(validateFabricQty(350, 50, 10000, 50), null));
test("tier pricing drops at 10m", () => assert.equal(unitPricePaise(25000, [{minCm:1000,pricePaise:23000}], 1000), 23000));
test("continuous cut needs a single long roll", () => {
  const r = allocateRoll([{id:"a",remainingCm:300,rollCode:"A"},{id:"b",remainingCm:400,rollCode:"B"}], 500, false);
  assert.equal(r.error !== null, true);
  assert.equal(allocateRoll([{id:"a",remainingCm:600,rollCode:"A"}], 500, false).rollId, "a");
});
test("tax and shipping", () => { assert.equal(taxPaise(87500, 5), 4375); assert.equal(shippingPaise(87500), 9900); assert.equal(shippingPaise(250000), 0); });
