import test from "node:test";
import assert from "node:assert/strict";

import { ORGANIZATION_PERMISSIONS } from "../src/constants/organizationPermissions.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import { requireOrganizationPermission } from "../src/middleware/organizationPermission.middleware.js";

function createResponseMock() {
  const response = {
    statusCode: null,
    body: null,
  };

  response.status = function status(code) {
    this.statusCode = code;
    return this;
  };

  response.json = function json(payload) {
    this.body = payload;
    return this;
  };

  return response;
}

test("permission middleware denies unauthenticated requests", () => {
  const middleware = requireOrganizationPermission(ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW);
  const request = {
    user: null,
    organization: {},
  };
  const response = createResponseMock();
  let nextCalled = false;

  middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("permission middleware denies requests without organization context", () => {
  const middleware = requireOrganizationPermission(ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW);
  const request = {
    user: {
      role: USER_ROLES.ADMIN,
    },
    organization: null,
  };
  const response = createResponseMock();
  let nextCalled = false;

  middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
});

test("permission middleware allows authorized organization users", () => {
  const middleware = requireOrganizationPermission(ORGANIZATION_PERMISSIONS.DASHBOARD_VIEW);
  const request = {
    user: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    organization: {
      _id: "org_1",
      status: "ACTIVE",
      isDeleted: false,
      primaryAdmin: "user_1",
    },
  };
  const response = createResponseMock();
  let nextCalled = false;

  middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, null);
  assert.equal(response.body, null);
});

test("permission middleware denies suspended organizations", () => {
  const middleware = requireOrganizationPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE);
  const request = {
    user: {
      _id: "user_1",
      role: USER_ROLES.ADMIN,
      organization: "org_1",
    },
    organization: {
      _id: "org_1",
      status: "SUSPENDED",
      isDeleted: false,
      primaryAdmin: "user_1",
    },
  };
  const response = createResponseMock();
  let nextCalled = false;

  middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
});
