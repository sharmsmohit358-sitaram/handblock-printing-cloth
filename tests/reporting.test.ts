import test from "node:test";
import assert from "node:assert";
import { summarizeByStatus, summarizeByDay } from "../src/lib/reporting";
const orders = [
  { status: "PLACED", totalPaise: 62400, createdAt: new Date().toISOString() },
  { status: "DELIVERED", totalPaise: 100000, createdAt: new Date().toISOString() },
  { status: "CANCELLED", totalPaise: 50000, createdAt: new Date().toISOString() },
  { status: "PLACED", totalPaise: 20000, createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString() },
];
test("status summary groups and sums", () => {
  const s = summarizeByStatus(orders);
  assert.equal(s.find(x => x.status === "PLACED")?.n, 2);
  assert.equal(s.find(x => x.status === "PLACED")?.s, 82400);
});
test("day summary excludes orders older than 30 days", () => {
  const d = summarizeByDay(orders, 30);
  assert.equal(d.reduce((a, x) => a + x.n, 0), 3);
  assert.equal(d.reduce((a, x) => a + x.s, 0), 212400);
});
