import test from "node:test";
import assert from "node:assert/strict";
import { canTransition } from "../src/lib/fulfilment";

test("fulfilment chain allows forward moves, blocks jumps backwards", () => {
  assert.equal(canTransition("CONFIRMED", "PROCESSING"), true);
  assert.equal(canTransition("PROCESSING", "PACKED"), true);
  assert.equal(canTransition("PACKED", "SHIPPED"), true);
  assert.equal(canTransition("SHIPPED", "DELIVERED"), true);
  assert.equal(canTransition("DELIVERED", "SHIPPED"), false);
  assert.equal(canTransition("PLACED", "DELIVERED"), false);
  assert.equal(canTransition("CANCELLED", "PROCESSING"), false);
  assert.equal(canTransition("DELIVERED", "RETURNED"), true);
});
