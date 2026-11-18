import assert from "node:assert/strict";
import test from "node:test";
import { canViewProjectSection, canWriteProjectRecord } from "../lib/project-permissions";

test("supplier access does not expose project finance, team, or site operations", () => {
  assert.equal(canViewProjectSection("VENDOR", "vendors"), true);
  assert.equal(canViewProjectSection("VENDOR", "money"), false);
  assert.equal(canViewProjectSection("VENDOR", "team"), false);
  assert.equal(canViewProjectSection("VENDOR", "site"), false);
  assert.equal(canWriteProjectRecord("VENDOR", "vendor"), false);
  assert.equal(canWriteProjectRecord("VENDOR", "cash"), false);
});

test("operational roles can update assigned workflows but cannot access restricted areas", () => {
  assert.equal(canViewProjectSection("SITE_SUPERVISOR", "tasks"), true);
  assert.equal(canWriteProjectRecord("SITE_SUPERVISOR", "taskStatus"), true);
  assert.equal(canWriteProjectRecord("SITE_SUPERVISOR", "cash"), true);
  assert.equal(canViewProjectSection("SITE_SUPERVISOR", "money"), false);
  assert.equal(canViewProjectSection("SITE_SUPERVISOR", "team"), false);
  assert.equal(canWriteProjectRecord("SECURITY", "gateEntry"), true);
  assert.equal(canWriteProjectRecord("SECURITY", "budget"), false);
});
