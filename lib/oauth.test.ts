import assert from "node:assert/strict";
import { parseOauth } from "./oauth.ts";

const full = parseOauth(
  JSON.stringify({
    access_token: "ya29.a",
    refresh_token: "1//r",
    expiry_date: "2099-01-01T00:00:00.000Z",
  }),
);
assert.equal(full?.refresh_token, "1//r");

const quoted = parseOauth(`'{"access_token":"ya29.a","refresh_token":"1//r","expiry_date":"2099-01-01T00:00:00.000Z"}'`);
assert.equal(quoted?.access_token, "ya29.a");

const bareAccess = parseOauth("ya29.only-access");
assert.equal(bareAccess?.access_token, "ya29.only-access");
assert.ok(bareAccess?.refresh_token);

const bareRefresh = parseOauth("1//refresh-only");
assert.equal(bareRefresh?.refresh_token, "1//refresh-only");
assert.equal(bareRefresh?.expiry_date, new Date(0).toISOString());

assert.equal(parseOauth(""), undefined);
assert.equal(parseOauth("not-json {"), undefined);
console.log("ok");
