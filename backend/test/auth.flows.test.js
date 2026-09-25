import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import envConfig from "../src/config/env.config.js";
import { ACCOUNT_STATUS } from "../src/constants/accountStatus.constants.js";
import { ORGANIZATION_STATUS } from "../src/constants/organizationStatus.constants.js";
import { USER_ROLES } from "../src/constants/roles.constants.js";
import authRoutes from "../src/routes/auth.routes.js";
import * as authService from "../src/services/auth.service.js";
import {
  customerRegisterSchema,
  googleRegistrationSchema,
  organizerRegisterSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../src/validators/auth.validator.js";
import { hashToken } from "../src/utils/token.util.js";

const customerId = "64b64b64b64b64b64b64b901";
const organizationId = "64b64b64b64b64b64b64b902";

function user(overrides = {}) {
  return {
    _id: { toString: () => customerId },
    firstName: "Ada",
    lastName: "User",
    email: "ada@example.com",
    phone: "+2348012345678",
    role: USER_ROLES.CUSTOMER,
    organization: null,
    isDeleted: false,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
    emailVerification: {
      tokenHash: hashToken("123456"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(Date.now() - 2 * 60 * 1000),
      resendCount: 0,
      resendWindowStartedAt: new Date(),
    },
    ...overrides,
  };
}

function googleVerifier(profile = {}) {
  return {
    async verifyIdToken({ idToken, audience }) {
      assert.equal(idToken, "google-id-token");
      assert.equal(audience, envConfig.googleClientId);
      return {
        getPayload() {
          return {
            sub: "google-subject",
            email: "ada@example.com",
            email_verified: true,
            given_name: "Ada",
            family_name: "User",
            ...profile,
          };
        },
      };
    },
  };
}

test("manual customer and organizer signup validation requires phone and keeps the simple password policy", () => {
  assert.equal(customerRegisterSchema.safeParse({
    firstName: "Ada",
    lastName: "User",
    email: "ada@example.com",
    password: "abcdefgh",
    confirmPassword: "abcdefgh",
  }).success, false);
  assert.equal(customerRegisterSchema.safeParse({
    firstName: "Ada",
    lastName: "User",
    phone: "+2348012345678",
    email: "ada@example.com",
    password: "abcdefgh",
    confirmPassword: "abcdefgh",
  }).success, true);
  assert.equal(organizerRegisterSchema.safeParse({
    organizationName: "Ada Events",
    adminFirstName: "Ada",
    adminLastName: "User",
    businessEmail: "ada@example.com",
    businessPhone: "+2348012345678",
    password: "abcdefgh",
    confirmPassword: "abcdefgh",
  }).success, true);
  assert.equal(resetPasswordSchema.safeParse({
    token: "reset-token",
    password: "abcdefgh",
    confirmPassword: "abcdefgh",
  }).success, true);
});

test("email verification accepts a valid OTP and tracks invalid attempts", async () => {
  let validUpdate;
  const validUser = user();
  const valid = await authService.verifyEmail(
    { email: validUser.email, code: "123456" },
    {
      authRepository: { async findAuthUserByEmail() { return validUser; } },
      userRepository: {
        async updateUserById(id, update) {
          assert.equal(id, validUser._id);
          validUpdate = update;
          return { ...validUser, ...update };
        },
      },
    }
  );
  assert.equal(valid.error, undefined);
  assert.equal(validUpdate.isEmailVerified, true);
  assert.equal(validUpdate.accountStatus, ACCOUNT_STATUS.ACTIVE);

  let invalidUpdate;
  const invalidUser = user();
  const invalid = await authService.verifyEmail(
    { email: invalidUser.email, code: "654321" },
    {
      authRepository: { async findAuthUserByEmail() { return invalidUser; } },
      userRepository: {
        async updateUserById(id, update) {
          invalidUpdate = update;
          return invalidUser;
        },
      },
    }
  );
  assert.match(invalid.error, /4 attempts remaining/);
  assert.equal(invalidUpdate["emailVerification.attempts"], 1);
  assert.equal(verifyEmailSchema.safeParse({ email: invalidUser.email, code: "12345" }).success, false);

  const expired = await authService.verifyEmail(
    { email: "expired@example.com", code: "123456" },
    {
      authRepository: {
        async findAuthUserByEmail() {
          return user({ email: "expired@example.com", emailVerification: { ...user().emailVerification, expiresAt: new Date(Date.now() - 1000) } });
        },
      },
    }
  );
  assert.match(expired.error, /expired/i);

  const locked = await authService.verifyEmail(
    { email: "locked@example.com", code: "123456" },
    {
      authRepository: {
        async findAuthUserByEmail() {
          return user({ email: "locked@example.com", emailVerification: { ...user().emailVerification, attempts: 5 } });
        },
      },
    }
  );
  assert.match(locked.error, /Too many invalid attempts/);
});

test("verification resend rotates the OTP and enforces its cooldown", async () => {
  let storedVerification;
  let deliveredCode;
  const pendingUser = user();
  const result = await authService.resendVerificationCode(pendingUser.email, {
    authRepository: { async findAuthUserByEmail() { return pendingUser; } },
    userRepository: {
      async updateUserById(id, update) {
        storedVerification = update.emailVerification;
        return pendingUser;
      },
    },
    emailService: {
      async sendEmailVerificationCode(message) {
        deliveredCode = message.code;
        return { sent: true };
      },
    },
  });
  assert.equal(result.sent, true);
  assert.match(deliveredCode, /^\d{6}$/);
  assert.equal(storedVerification.tokenHash, hashToken(deliveredCode));
  assert.equal(storedVerification.attempts, 0);

  const cooldown = await authService.resendVerificationCode(pendingUser.email, {
    authRepository: {
      async findAuthUserByEmail() {
        return user({ emailVerification: { ...pendingUser.emailVerification, lastSentAt: new Date() } });
      },
    },
  });
  assert.match(cooldown.error, /Please wait/);
  assert.ok(cooldown.retryAfterSeconds > 0);

  const limited = await authService.resendVerificationCode(pendingUser.email, {
    authRepository: {
      async findAuthUserByEmail() {
        return user({
          emailVerification: {
            ...pendingUser.emailVerification,
            lastSentAt: new Date(Date.now() - 2 * 60 * 1000),
            resendCount: 5,
            resendWindowStartedAt: new Date(),
          },
        });
      },
    },
  });
  assert.match(limited.error, /Too many verification codes requested/);
});

test("a pending signup can correct its email and receives a fresh OTP", async () => {
  const pendingUser = user();
  const verificationTicket = jwt.sign(
    { sub: customerId, email: pendingUser.email, purpose: "email_verification" },
    envConfig.jwtAccessSecret,
    { expiresIn: "1h" }
  );
  let currentUser = pendingUser;
  let deliveredTo;
  const result = await authService.updatePendingVerificationEmail(
    { verificationTicket, email: "corrected@example.com" },
    {
      authRepository: {
        async findAuthUserByIdWithSecrets() { return currentUser; },
        async isEmailAlreadyUsed() { return false; },
      },
      userRepository: {
        async updateUserById(id, update) {
          if (update.email) currentUser = { ...currentUser, email: update.email };
          return currentUser;
        },
      },
      emailService: {
        async sendEmailVerificationCode(message) {
          deliveredTo = message.to;
          return { sent: true };
        },
      },
    }
  );
  assert.equal(result.user.email, "corrected@example.com");
  assert.equal(result.verificationEmailSent, true);
  assert.equal(deliveredTo, "corrected@example.com");
  assert.ok(result.verificationTicket);
});

test("Google login reuses an existing account and new customer/organizer signup collects required profile data", async () => {
  const originalClientId = envConfig.googleClientId;
  envConfig.googleClientId = "google-client-id.apps.googleusercontent.com";
  try {
    const existing = user({
      isEmailVerified: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      googleSubject: "google-subject",
    });
    const existingResult = await authService.authenticateWithGoogle(
      { credential: "google-id-token" },
      {
        googleVerifier: googleVerifier(),
        authRepository: {
          async findAuthUserByEmail() { return existing; },
          async findAuthUserById() { return existing; },
        },
        userRepository: { async updateUserById() { return existing; } },
      }
    );
    assert.equal(existingResult.user.email, existing.email);
    assert.ok(existingResult.accessToken);
    assert.ok(existingResult.refreshToken);

    const newCustomerStart = await authService.authenticateWithGoogle(
      { credential: "google-id-token", accountType: USER_ROLES.CUSTOMER },
      {
        googleVerifier: googleVerifier(),
        authRepository: { async findAuthUserByEmail() { return null; } },
      }
    );
    assert.equal(newCustomerStart.requiresProfileCompletion, true);

    const accountChoice = await authService.authenticateWithGoogle(
      { credential: "google-id-token" },
      {
        googleVerifier: googleVerifier({ email: "choose@example.com" }),
        authRepository: { async findAuthUserByEmail() { return null; } },
      }
    );
    assert.equal(accountChoice.requiresAccountType, true);
    assert.ok(accountChoice.completionToken);

    let createdCustomer;
    const completedCustomer = await authService.completeGoogleRegistration(
      {
        completionToken: newCustomerStart.completionToken,
        accountType: USER_ROLES.CUSTOMER,
        firstName: "Ada",
        lastName: "User",
        phone: "+2348012345678",
      },
      {
        authRepository: {
          async isEmailAlreadyUsed() { return false; },
          async findAuthUserById() { return createdCustomer; },
        },
        userRepository: { async updateUserById() { return createdCustomer; } },
        async createUser(data) {
          createdCustomer = { ...data, _id: { toString: () => customerId } };
          return createdCustomer;
        },
      }
    );
    assert.equal(createdCustomer.role, USER_ROLES.CUSTOMER);
    assert.equal(createdCustomer.phone, "+2348012345678");
    assert.equal(createdCustomer.isEmailVerified, true);
    assert.ok(completedCustomer.accessToken);

    const organizerStart = await authService.authenticateWithGoogle(
      { credential: "google-id-token", accountType: USER_ROLES.ADMIN },
      {
        googleVerifier: googleVerifier({ email: "organizer@example.com" }),
        authRepository: { async findAuthUserByEmail() { return null; } },
      }
    );
    let createdOrganizer;
    let createdOrganization;
    await authService.completeGoogleRegistration(
      {
        completionToken: organizerStart.completionToken,
        accountType: USER_ROLES.ADMIN,
        firstName: "Ola",
        lastName: "Organizer",
        phone: "+2348098765432",
        organizationName: "Ola Events",
      },
      {
        authRepository: {
          async isEmailAlreadyUsed() { return false; },
          async findAuthUserById() { return createdOrganizer; },
        },
        userRepository: { async updateUserById() { return createdOrganizer; } },
        organizationRepository: { async updateOrganizationById() { return createdOrganization; } },
        async createOrganization(data) {
          createdOrganization = { ...data, _id: { toString: () => organizationId } };
          return createdOrganization;
        },
        async createUser(data) {
          createdOrganizer = { ...data, _id: { toString: () => customerId } };
          return createdOrganizer;
        },
      }
    );
    assert.equal(createdOrganizer.role, USER_ROLES.ADMIN);
    assert.equal(createdOrganizer.isEmailVerified, true);
    assert.equal(createdOrganization.organizationName, "Ola Events");
    assert.equal(createdOrganization.status, ORGANIZATION_STATUS.ACTIVE);
    assert.equal(googleRegistrationSchema.safeParse({
      completionToken: organizerStart.completionToken,
      accountType: USER_ROLES.ADMIN,
      firstName: "Ola",
      lastName: "Organizer",
      phone: "+2348098765432",
    }).success, false);
  } finally {
    envConfig.googleClientId = originalClientId;
  }
});

test("forgot password stores an expiring token and sends the reset link without exposing it in the response", async () => {
  let storedReset;
  let emailMessage;
  const result = await authService.forgotPassword("ADA@example.com", {
    authRepository: { async findAuthUserByEmail(email) { assert.equal(email, "ada@example.com"); return user(); } },
    userRepository: {
      async updateUserById(id, update) {
        storedReset = update.passwordReset;
        return user();
      },
    },
    emailService: {
      async sendPasswordResetEmail(message) {
        emailMessage = message;
        return { sent: true };
      },
    },
  });
  assert.deepEqual(result, {});
  assert.ok(storedReset.tokenHash);
  assert.ok(storedReset.expiresAt > new Date());
  assert.match(emailMessage.resetUrl, /reset-password\?token=/);
  assert.equal(Object.hasOwn(result, "token"), false);
});

test("all new public auth endpoints are registered", () => {
  const routes = new Set(
    authRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`)
  );
  for (const route of [
    "POST /google",
    "POST /google/complete",
    "POST /verify-email",
    "POST /verify-email/resend",
    "PATCH /verify-email",
  ]) {
    assert.equal(routes.has(route), true, route);
  }
});
