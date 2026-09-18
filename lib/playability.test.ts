import assert from "node:assert/strict";
import { isAgeGate, isBotWall, isPlayerBlocked } from "./playability.ts";

assert.equal(isAgeGate("error message"), false);
assert.equal(isAgeGate("usage page"), false);
assert.equal(isAgeGate("Age-restricted content"), true);
assert.equal(isAgeGate("Sign in to confirm your age"), true);
assert.equal(isBotWall("both formats"), false);
assert.equal(isBotWall("Sign in to confirm you’re not a bot"), true);
assert.equal(isPlayerBlocked("IOS:status code 400"), true);
assert.equal(isPlayerBlocked("TV:UNPLAYABLE The page needs to be reloaded."), true);
assert.equal(isPlayerBlocked("ok"), false);
console.log("ok");
