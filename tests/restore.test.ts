import test from "node:test";
import assert from "node:assert";
import { parseRollAllocations } from "../src/lib/restore";
test("single roll allocation parses", () => assert.deepEqual(parseRollAllocations("roll_1", 350), [{ rollId: "roll_1", cm: 350 }]));
test("split allocation parses", () => assert.deepEqual(parseRollAllocations("roll_a:200,roll_b:150", 350), [{ rollId: "roll_a", cm: 200 }, { rollId: "roll_b", cm: 150 }]));
test("empty roll parses to none", () => assert.deepEqual(parseRollAllocations(null, 350), []));
