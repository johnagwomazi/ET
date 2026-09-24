import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import envConfig from "../src/config/env.config.js";
import { ACCOUNT_STATUS } from "../src/constants/accountStatus.constants.js";
import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_TOKEN_EXPIRES_IN,
} from "../src/constants/auth.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import * as authService from "../src/services/auth.service.js";
import { hashToken } from "../src/utils/token.util.js";

const userId = "64b64b64b64b64b64b64b701";

function buildUser(refreshToken, overrides = {}) {
  return {
    _id: { toString: () => userId },
    role: USER_ROLES.CUSTOMER,
    organization: null,
    isDeleted: false,
    isEmailVerified: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    refreshTokenHash: hashToken(refreshToken),
    passwordChangedAt: null,
    ...overrides,
  };
}

function dependenciesFor(user) {
  return {
    authRepository: {
      async findAuthUserByIdWithSecrets(id) {
        assert.equal(id, userId);
        return user;
      },
    },
  };
}

test("the persistent session is configured for seven days while access tokens remain short-lived", () => {
  assert.equal(AUTH_TOKEN_EXPIRES_IN.REFRESH_TOKEN, "7d");
  assert.equal(AUTH_COOKIE_MAX_AGE_MS.REFRESH_TOKEN, 7 * 24 * 60 * 60 * 1000);
  assert.equal(AUTH_TOKEN_EXPIRES_IN.ACCESS_TOKEN, "15m");
});

test("a valid refresh cookie renews a short-lived access token", async () => {
  const refreshToken = jwt.sign(
    { sub: userId, role: USER_ROLES.CUSTOMER, organizationId: null },
    envConfig.jwtRefreshSecret,
    { expiresIn: "7d" }
  );
  const result = await authService.refreshUserSession(
    refreshToken,
    dependenciesFor(buildUser(refreshToken))
  );

  assert.ok(result.accessToken);
  const decodedAccessToken = jwt.verify(result.accessToken, envConfig.jwtAccessSecret);
  assert.equal(decodedAccessToken.sub, userId);
  assert.ok(decodedAccessToken.exp - decodedAccessToken.iat <= 15 * 60);
});

test("expired, revoked, and password-invalidated refresh tokens are rejected", async () => {
  const expiredToken = jwt.sign(
    { sub: userId, role: USER_ROLES.CUSTOMER, organizationId: null },
    envConfig.jwtRefreshSecret,
    { expiresIn: -1 }
  );
  assert.equal((await authService.refreshUserSession(expiredToken, dependenciesFor(buildUser(expiredToken)))).error, "Session expired");

  const validToken = jwt.sign(
    { sub: userId, role: USER_ROLES.CUSTOMER, organizationId: null },
    envConfig.jwtRefreshSecret,
    { expiresIn: "7d" }
  );
  assert.equal(
    (await authService.refreshUserSession(
      validToken,
      dependenciesFor(buildUser(validToken, { refreshTokenHash: "revoked" }))
    )).error,
    "Session expired"
  );
  assert.equal(
    (await authService.refreshUserSession(
      validToken,
      dependenciesFor(buildUser(validToken, { passwordChangedAt: new Date(Date.now() + 1000) }))
    )).error,
    "Session expired"
  );
});
