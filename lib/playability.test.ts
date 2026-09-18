import assert from "node:assert/strict";
import { isAgeGate, isBotWall } from "./playability.ts";

assert.equal(isAgeGate("error message"), false);
assert.equal(isAgeGate("usage page"), false);
assert.equal(isAgeGate("Age-restricted content"), true);
assert.equal(isAgeGate("Sign in to confirm your age"), true);
assert.equal(isBotWall("both formats"), false);
assert.equal(isBotWall("Sign in to confirm you’re not a bot"), true);
console.log("ok");
