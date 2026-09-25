import test from "node:test";
import assert from "node:assert/strict";

import { activateLegacyOrganizations } from "../src/config/database.config.js";
import {
  LEGACY_ACTIVE_ORGANIZATION_STATUSES,
  ORGANIZATION_STATUS,
} from "../src/constants/organizationStatus.constants.js";
import Organization from "../src/models/organization.model.js";
import {
  isOrganizationActive,
  normalizeOrganizationStatus,
} from "../src/utils/organizationStatus.util.js";

test("new organizations default to Active and suspended organizations are not operational", () => {
  const organization = new Organization({
    organizationName: "Automatic Events",
    businessEmail: "automatic@example.com",
  });

  assert.equal(organization.status, ORGANIZATION_STATUS.ACTIVE);
  assert.equal(isOrganizationActive(organization), true);
  assert.equal(isOrganizationActive({ status: ORGANIZATION_STATUS.SUSPENDED, isDeleted: false }), false);
  assert.equal(isOrganizationActive({ status: ORGANIZATION_STATUS.ACTIVE, isDeleted: true }), false);
});

test("legacy organization statuses normalize to Active during the safe startup migration", async () => {
  let capturedFilter;
  let capturedUpdate;
  const result = await activateLegacyOrganizations({
    async updateMany(filter, update) {
      capturedFilter = filter;
      capturedUpdate = update;
      return { modifiedCount: 3 };
    },
  });

  assert.equal(capturedFilter.isDeleted, false);
  assert.deepEqual(capturedFilter.status.$in, LEGACY_ACTIVE_ORGANIZATION_STATUSES);
  assert.deepEqual(capturedUpdate, { $set: { status: ORGANIZATION_STATUS.ACTIVE } });
  assert.equal(result.modifiedCount, 3);
  assert.equal(normalizeOrganizationStatus("PENDING"), ORGANIZATION_STATUS.ACTIVE);
  assert.equal(normalizeOrganizationStatus("REJECTED"), ORGANIZATION_STATUS.ACTIVE);
  assert.equal(normalizeOrganizationStatus(ORGANIZATION_STATUS.SUSPENDED), ORGANIZATION_STATUS.SUSPENDED);
});
