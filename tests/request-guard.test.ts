import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedHost, isTrustedRequest } from "../lib/security/request-guard";

test("only the configured host is accepted", () => {
  assert.equal(isTrustedHost("onsite.example.com", "https://onsite.example.com"), true);
  assert.equal(isTrustedHost("attacker.example", "https://onsite.example.com"), false);
  assert.equal(isTrustedHost("onsite.example.com:8443", "https://onsite.example.com"), false);
  assert.equal(isTrustedHost(null, "https://onsite.example.com"), false);
});

test("requests with an Origin header must match the configured origin", () => {
  assert.equal(isTrustedRequest("POST", "https://onsite.example.com", "https://onsite.example.com"), true);
  assert.equal(isTrustedRequest("POST", "https://evil.example", "https://onsite.example.com"), false);
  assert.equal(isTrustedRequest("GET", "https://evil.example", "https://onsite.example.com"), false);
  assert.equal(isTrustedRequest("POST", null, "https://onsite.example.com"), false);
  assert.equal(isTrustedRequest("GET", null, "https://onsite.example.com"), true);
});
