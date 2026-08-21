import test from "node:test";
import assert from "node:assert/strict";

import { ACCOUNT_STATUS } from "../src/constants/accountStatus.constants.js";
import { ORGANIZATION_PERMISSIONS } from "../src/constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import {
  getOrganizationRolePermissions,
  hasOrganizationPermission,
  isOrganizationOwner,
} from "../src/utils/organizationPermission.util.js";
import {
  organizationMemberInviteSchema,
  organizationMemberRoleUpdateSchema,
} from "../src/validators/admin.validator.js";

test("organization admins receive the expected permissions", () => {
  const organization = {
    _id: "org_1",
    status: "APPROVED",
    isDeleted: false,
    primaryAdmin: "user_1",
  };

  const adminUser = {
    _id: "user_1",
    role: USER_ROLES.ADMIN,
    organization: "org_1",
  };

  const permissions = getOrganizationRolePermissions(adminUser, organization);

  assert.equal(isOrganizationOwner(adminUser, organization), true);
  assert.equal(hasOrganizationPermission(adminUser, ORGANIZATION_PERMISSIONS.MEMBERS_INVITE, organization), true);
  assert.equal(hasOrganizationPermission(adminUser, ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE, organization), true);
  assert.equal(permissions.includes(ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW), true);
});

test("manager permissions stay limited", () => {
  const organization = {
    _id: "org_1",
    status: "APPROVED",
    isDeleted: false,
    primaryAdmin: "user_1",
  };

  const managerUser = {
    _id: "user_2",
    role: USER_ROLES.MANAGER,
    organization: "org_1",
  };

  assert.equal(hasOrganizationPermission(managerUser, ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW, organization), true);
  assert.equal(hasOrganizationPermission(managerUser, ORGANIZATION_PERMISSIONS.MEMBERS_INVITE, organization), false);
  assert.equal(hasOrganizationPermission(managerUser, ORGANIZATION_PERMISSIONS.MEMBERS_REMOVE, organization), false);
});

test("suspended organizations do not expose organization permissions", () => {
  const organization = {
    _id: "org_1",
    status: "SUSPENDED",
    isDeleted: false,
    primaryAdmin: "user_1",
  };

  const adminUser = {
    _id: "user_1",
    role: USER_ROLES.ADMIN,
    organization: "org_1",
  };

  assert.deepEqual(getOrganizationRolePermissions(adminUser, organization), []);
});

test("member invitation rejects invalid roles", () => {
  const validInvite = organizationMemberInviteSchema.safeParse({
    email: "person@example.com",
    role: USER_ROLES.ADMIN,
  });
  const invalidInvite = organizationMemberInviteSchema.safeParse({
    email: "person@example.com",
    role: "SUPER_ADMIN",
  });

  assert.equal(validInvite.success, true);
  assert.equal(invalidInvite.success, false);
});

test("member role updates reject invalid roles", () => {
  const validRole = organizationMemberRoleUpdateSchema.safeParse({
    role: USER_ROLES.MANAGER,
  });
  const invalidRole = organizationMemberRoleUpdateSchema.safeParse({
    role: "ROOT",
  });

  assert.equal(validRole.success, true);
  assert.equal(invalidRole.success, false);
});

test("account status constants remain intact", () => {
  assert.equal(ACCOUNT_STATUS.PENDING_VERIFICATION, "PENDING_VERIFICATION");
  assert.equal(ACCOUNT_STATUS.SUSPENDED, "SUSPENDED");
});
