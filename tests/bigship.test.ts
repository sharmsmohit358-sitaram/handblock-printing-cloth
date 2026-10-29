import test from "node:test";
import assert from "node:assert/strict";
import { estimateParcel } from "../src/lib/bigship";

// Pure, no-network tests for the Bigship parcel estimator.
test("fabric weight from GSM x area", () => {
  // 150 GSM, 110 cm wide, 350 cm long = 1.1 x 3.5 = 3.85 m2 x 150 = 577.5 g
  const b = estimateParcel([{ gsm: 150, widthCm: 110, quantityCm: 350 }]);
  assert.equal(b.weightKg, 0.58);
  assert.equal(b.length, 40);
});
test("non-fabric pieces default to 0.5 kg each, minimum 0.5 kg", () => {
  const b = estimateParcel([{ quantity: 2 }]);
  assert.equal(b.weightKg, 1);
  const empty = estimateParcel([]);
  assert.equal(empty.weightKg, 0.5);
});
