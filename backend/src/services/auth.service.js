import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import envConfig from "../config/env.config.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import {
  AUTH_TOKEN_EXPIRES_IN,
  EMAIL_VERIFICATION_POLICY,
  PASSWORD_POLICY,
} from "../constants/auth.constants.js";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import * as emailService from "./email.service.js";
import { createOrganization } from "../repositories/organization.repository.js";
import { createUser } from "../repositories/user.repository.js";
import { comparePassword, hashPassword } from "../utils/password.util.js";
import { getOrganizationRolePermissions } from "../utils/organizationPermission.util.js";
import { generateSecureToken, hashToken } from "../utils/token.util.js";
import { mapOrganizationResponse } from "../utils/organizationResponse.util.js";
import { isOrganizationActive } from "../utils/organizationStatus.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function ensurePasswordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

function validatePasswordPolicy(password) {
  if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
    return "Password must be at least 8 characters long";
  }

  return null;
}

function buildAuthTokenPayload(user) {
  return {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organization ? user.organization.toString() : null,
  };
}

function generateAccessToken(user) {
  return jwt.sign(buildAuthTokenPayload(user), envConfig.jwtAccessSecret, {
    expiresIn: envConfig.jwtAccessExpiresIn || AUTH_TOKEN_EXPIRES_IN.ACCESS_TOKEN,
  });
}

function generateRefreshToken(user) {
  return jwt.sign(buildAuthTokenPayload(user), envConfig.jwtRefreshSecret, {
    expiresIn: envConfig.jwtRefreshExpiresIn || AUTH_TOKEN_EXPIRES_IN.REFRESH_TOKEN,
  });
}

function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
  };
}

function buildVerificationCodeRecord(now = new Date()) {
  const minimum = 10 ** (EMAIL_VERIFICATION_POLICY.CODE_LENGTH - 1);
  const maximum = 10 ** EMAIL_VERIFICATION_POLICY.CODE_LENGTH;
  const code = String(crypto.randomInt(minimum, maximum));
  return {
    code,
    tokenHash: hashToken(code),
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_POLICY.EXPIRES_IN_MS),
  };
}

function buildPasswordResetTokenRecord() {
  const token = generateSecureToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
}

function ensureUserCanAuthenticate(user) {
  if (!user) {
    return "Invalid credentials";
  }

  if (user.isDeleted) {
    return "Invalid credentials";
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return "Your account has been suspended";
  }

  if (user.accountStatus === ACCOUNT_STATUS.INACTIVE) {
    return "Your account is inactive";
  }

  if (
    envConfig.requireEmailVerification &&
    !user.isEmailVerified &&
    user.role !== USER_ROLES.SUPER_ADMIN
  ) {
    return "Please verify your email before logging in";
  }

  return null;
}

function tokenPredatesPasswordChange(user, decodedToken) {
  if (!user?.passwordChangedAt || !decodedToken?.iat) return false;
  return Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) > decodedToken.iat;
}

async function attachVerificationCode(userId, options = {}, repository = userRepository) {
  const now = options.now || new Date();
  const verificationCode = buildVerificationCodeRecord(now);
  await repository.updateUserById(userId, {
    emailVerification: {
      tokenHash: verificationCode.tokenHash,
      expiresAt: verificationCode.expiresAt,
      verifiedAt: null,
      attempts: 0,
      lastSentAt: now,
      resendCount: options.resendCount || 0,
      resendWindowStartedAt: options.resendWindowStartedAt || now,
    },
  });
  return verificationCode;
}

function createPurposeToken(payload, expiresIn) {
  return jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn });
}

function createVerificationTicket(user) {
  return createPurposeToken(
    { sub: user._id.toString(), email: user.email, purpose: "email_verification" },
    AUTH_TOKEN_EXPIRES_IN.VERIFICATION_TICKET
  );
}

function readPurposeToken(token, purpose) {
  try {
    const decoded = jwt.verify(token, envConfig.jwtAccessSecret);
    return decoded.purpose === purpose ? decoded : null;
  } catch (error) {
    return null;
  }
}

async function sendVerificationCode(user, code, mailer = emailService) {
  try {
    return await mailer.sendEmailVerificationCode({
      to: user.email,
      firstName: user.firstName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_POLICY.EXPIRES_IN_MS / 60000,
    });
  } catch (error) {
    return { sent: false, deliveryFailed: true };
  }
}

async function createCustomerUser(payload) {
  const email = normalizeEmail(payload.email);
  const emailAlreadyUsed = await authRepository.isEmailAlreadyUsed(email);

  if (emailAlreadyUsed) {
    return {
      error: "Email is already in use",
    };
  }

  const hashedPassword = await hashPassword(payload.password);
  const customerUser = await createUser({
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email,
    phone: payload.phone.trim(),
    password: hashedPassword,
    role: USER_ROLES.CUSTOMER,
    organization: null,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
  });

  const verificationCode = await attachVerificationCode(customerUser._id);
  const delivery = await sendVerificationCode(customerUser, verificationCode.code);

  return {
    user: customerUser,
    verificationEmailSent: delivery.sent === true,
  };
}

async function createOrganizerAndAdmin(payload) {
  const businessEmail = normalizeEmail(payload.businessEmail);
  const emailAlreadyUsed = await authRepository.isEmailAlreadyUsed(businessEmail);

  if (emailAlreadyUsed) {
    return {
      error: "Email is already in use",
    };
  }

  const hashedPassword = await hashPassword(payload.password);
  const organization = await createOrganization({
    organizationName: payload.organizationName.trim(),
    primaryAdmin: null,
    status: ORGANIZATION_STATUS.ACTIVE,
    logo: {},
    businessPhone: payload.businessPhone.trim(),
    businessEmail,
    website: "",
    address: "",
    socialLinks: {},
  });

  const adminUser = await createUser({
    firstName: payload.adminFirstName.trim(),
    lastName: payload.adminLastName.trim(),
    email: businessEmail,
    phone: payload.businessPhone.trim(),
    password: hashedPassword,
    role: USER_ROLES.ADMIN,
    organization: organization._id,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
  });

  await organizationRepository.updateOrganizationById(organization._id, {
    primaryAdmin: adminUser._id,
  });

  const verificationCode = await attachVerificationCode(adminUser._id);
  const delivery = await sendVerificationCode(adminUser, verificationCode.code);

  return {
    organization,
    user: adminUser,
    verificationEmailSent: delivery.sent === true,
  };
}

export async function registerCustomer(payload) {
  const passwordPolicyError = validatePasswordPolicy(payload.password);

  if (passwordPolicyError) {
    return {
      error: passwordPolicyError,
    };
  }

  if (!ensurePasswordsMatch(payload.password, payload.confirmPassword)) {
    return {
      error: "Passwords do not match",
    };
  }

  const result = await createCustomerUser(payload);

  if (result.error) {
    return result;
  }

  return {
    user: mapUserResponse(result.user),
    verificationEmailSent: result.verificationEmailSent,
    verificationTicket: createVerificationTicket(result.user),
  };
}

export async function registerOrganizer(payload) {
  const passwordPolicyError = validatePasswordPolicy(payload.password);

  if (passwordPolicyError) {
    return {
      error: passwordPolicyError,
    };
  }

  if (!ensurePasswordsMatch(payload.password, payload.confirmPassword)) {
    return {
      error: "Passwords do not match",
    };
  }

  const result = await createOrganizerAndAdmin(payload);

  if (result.error) {
    return result;
  }

  return {
    organization: mapOrganizationResponse(result.organization),
    user: mapUserResponse(result.user),
    verificationEmailSent: result.verificationEmailSent,
    verificationTicket: createVerificationTicket(result.user),
  };
}

async function authenticateUser(payload, options = {}) {
  const email = normalizeEmail(payload.email);
  const user = await authRepository.findAuthUserByEmail(email);
  const accountMessage = ensureUserCanAuthenticate(user);

  if (accountMessage) {
    return {
      error: accountMessage,
    };
  }

  const isPasswordValid = await comparePassword(payload.password, user.password);

  if (!isPasswordValid) {
    return {
      error: "Invalid credentials",
    };
  }

  if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
    return {
      error: options.roleError || "Invalid credentials",
    };
  }

  const tokens = generateTokenPair(user);

  await userRepository.updateUserById(user._id, {
    refreshTokenHash: tokens.refreshTokenHash,
    lastLoginAt: new Date(),
  });

  const currentUser = await authRepository.findAuthUserById(user._id);

  return {
    user: mapUserResponse(currentUser),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function loginUser(payload) {
  return authenticateUser(payload, {
    allowedRoles: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
    roleError: "Use the Super Admin login page",
  });
}

export async function loginSuperAdmin(payload) {
  return authenticateUser(payload, {
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
  });
}

async function issueSessionForUser(user, dependencies = {}) {
  const repositories = { authRepository, userRepository, ...dependencies };
  const tokens = generateTokenPair(user);
  await repositories.userRepository.updateUserById(user._id, {
    refreshTokenHash: tokens.refreshTokenHash,
    lastLoginAt: new Date(),
  });
  const currentUser = await repositories.authRepository.findAuthUserById(user._id);
  return {
    user: mapUserResponse(currentUser),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function verifyGoogleCredential(credential, verifier) {
  if (!envConfig.googleClientId) {
    return { error: "Google authentication is not configured", statusCode: 503 };
  }
  try {
    const client = verifier || new OAuth2Client(envConfig.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: envConfig.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
      return { error: "Google could not verify this email address" };
    }
    return {
      profile: {
        subject: payload.sub,
        email: normalizeEmail(payload.email),
        firstName: String(payload.given_name || "").trim(),
        lastName: String(payload.family_name || "").trim(),
      },
    };
  } catch (error) {
    return { error: "Google sign-in could not be verified" };
  }
}

function createGoogleCompletionToken(profile, accountType) {
  return createPurposeToken(
    {
      sub: profile.subject,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      accountType: accountType || null,
      purpose: "google_registration",
    },
    AUTH_TOKEN_EXPIRES_IN.GOOGLE_COMPLETION
  );
}

export async function authenticateWithGoogle(payload, dependencies = {}) {
  const verification = await verifyGoogleCredential(payload.credential, dependencies.googleVerifier);
  if (verification.error) return verification;

  const profile = verification.profile;
  const repositories = { authRepository, userRepository, ...dependencies };
  let user = await repositories.authRepository.findAuthUserByEmail(profile.email);
  if (!user) {
    return {
      requiresProfileCompletion: Boolean(payload.accountType),
      requiresAccountType: !payload.accountType,
      completionToken: createGoogleCompletionToken(profile, payload.accountType),
      profile: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
    };
  }

  if (user.googleSubject && user.googleSubject !== profile.subject) {
    return { error: "This email is linked to a different Google account" };
  }
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return { error: "Use the Super Admin login page" };
  }
  if (user.isDeleted || user.accountStatus === ACCOUNT_STATUS.SUSPENDED || user.accountStatus === ACCOUNT_STATUS.INACTIVE) {
    return { error: ensureUserCanAuthenticate(user) || "This account cannot sign in" };
  }

  if (!user.isEmailVerified || user.accountStatus === ACCOUNT_STATUS.PENDING_VERIFICATION || !user.googleSubject) {
    user = await repositories.userRepository.updateUserById(user._id, {
      googleSubject: profile.subject,
      isEmailVerified: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      emailVerification: {
        tokenHash: null,
        expiresAt: null,
        verifiedAt: new Date(),
        attempts: 0,
        lastSentAt: user.emailVerification?.lastSentAt || null,
        resendCount: user.emailVerification?.resendCount || 0,
        resendWindowStartedAt: user.emailVerification?.resendWindowStartedAt || null,
      },
    });
  }

  return issueSessionForUser(user, repositories);
}

export async function completeGoogleRegistration(payload, dependencies = {}) {
  const repositories = { authRepository, organizationRepository, userRepository, ...dependencies };
  const createOrganizationRecord = dependencies.createOrganization || createOrganization;
  const createUserRecord = dependencies.createUser || createUser;
  const decoded = readPurposeToken(payload.completionToken, "google_registration");
  if (!decoded) return { error: "Your Google registration session has expired. Please try again." };
  if (decoded.accountType && decoded.accountType !== payload.accountType) {
    return { error: "The selected account type does not match this registration session." };
  }
  if (await repositories.authRepository.isEmailAlreadyUsed(decoded.email)) {
    return { error: "An account already exists for this email. Sign in with Google instead." };
  }

  const password = await hashPassword(generateSecureToken());
  let user;
  let organization = null;

  if (payload.accountType === USER_ROLES.ADMIN) {
    organization = await createOrganizationRecord({
      organizationName: payload.organizationName.trim(),
      primaryAdmin: null,
      status: ORGANIZATION_STATUS.ACTIVE,
      logo: {},
      businessPhone: payload.phone.trim(),
      businessEmail: decoded.email,
      website: "",
      address: "",
      socialLinks: {},
    });
    user = await createUserRecord({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: decoded.email,
      phone: payload.phone.trim(),
      password,
      googleSubject: decoded.sub,
      role: USER_ROLES.ADMIN,
      organization: organization._id,
      isEmailVerified: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      emailVerification: { verifiedAt: new Date() },
    });
    await repositories.organizationRepository.updateOrganizationById(organization._id, { primaryAdmin: user._id });
  } else {
    user = await createUserRecord({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: decoded.email,
      phone: payload.phone.trim(),
      password,
      googleSubject: decoded.sub,
      role: USER_ROLES.CUSTOMER,
      organization: null,
      isEmailVerified: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      emailVerification: { verifiedAt: new Date() },
    });
  }

  return {
    ...(await issueSessionForUser(user, repositories)),
    organization: organization ? mapOrganizationResponse(organization) : null,
  };
}

export async function refreshUserSession(refreshToken, dependencies = {}) {
  const repositories = {
    authRepository,
    ...dependencies,
  };

  if (!refreshToken) {
    return { error: "Session expired" };
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(refreshToken, envConfig.jwtRefreshSecret);
  } catch (error) {
    return { error: "Session expired" };
  }

  const user = await repositories.authRepository.findAuthUserByIdWithSecrets(decodedToken.sub);

  if (
    ensureUserCanAuthenticate(user) ||
    tokenPredatesPasswordChange(user, decodedToken) ||
    !user.refreshTokenHash ||
    user.refreshTokenHash !== hashToken(refreshToken)
  ) {
    return { error: "Session expired" };
  }

  return {
    accessToken: generateAccessToken(user),
  };
}

export async function getCurrentUser(userId) {
  const user = await authRepository.findAuthUserById(userId);
  const organizationIsActive =
    Boolean(user?.organization) &&
    isOrganizationActive(user.organization);

  return {
    user: mapUserResponse(user),
    organizationPermissions: organizationIsActive
      ? getOrganizationRolePermissions(user, user.organization)
      : [],
  };
}

export async function logoutUser(userId) {
  await userRepository.updateUserById(userId, {
    refreshTokenHash: null,
  });

  return {};
}

export async function verifyEmail(payload, dependencies = {}) {
  const repositories = { authRepository, userRepository, ...dependencies };
  const user = await repositories.authRepository.findAuthUserByEmail(normalizeEmail(payload.email));

  if (!user || user.isDeleted) {
    return { error: "Invalid verification code" };
  }
  if (user.isEmailVerified) {
    return { user: mapUserResponse(user), alreadyVerified: true };
  }
  if (!user.emailVerification?.expiresAt || new Date(user.emailVerification.expiresAt) < new Date()) {
    return { error: "Verification code has expired. Request a new code." };
  }
  if ((user.emailVerification.attempts || 0) >= EMAIL_VERIFICATION_POLICY.MAX_ATTEMPTS) {
    return { error: "Too many invalid attempts. Request a new code." };
  }

  if (hashToken(payload.code) !== user.emailVerification.tokenHash) {
    const attempts = (user.emailVerification.attempts || 0) + 1;
    await repositories.userRepository.updateUserById(user._id, {
      "emailVerification.attempts": attempts,
    });
    const remaining = Math.max(0, EMAIL_VERIFICATION_POLICY.MAX_ATTEMPTS - attempts);
    return {
      error: remaining > 0
        ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many invalid attempts. Request a new code.",
    };
  }

  const updatedUser = await repositories.userRepository.updateUserById(user._id, {
    isEmailVerified: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    emailVerification: {
      tokenHash: null,
      expiresAt: null,
      verifiedAt: new Date(),
      attempts: 0,
      lastSentAt: user.emailVerification.lastSentAt || null,
      resendCount: user.emailVerification.resendCount || 0,
      resendWindowStartedAt: user.emailVerification.resendWindowStartedAt || null,
    },
  });

  return { user: mapUserResponse(updatedUser) };
}

export async function resendVerificationCode(email, dependencies = {}) {
  const repositories = { authRepository, userRepository, emailService, ...dependencies };
  const user = await repositories.authRepository.findAuthUserByEmail(normalizeEmail(email));
  if (!user || user.isDeleted) return { sent: true };
  if (user.isEmailVerified) return { error: "This email address is already verified" };

  const now = new Date();
  const lastSentAt = user.emailVerification?.lastSentAt
    ? new Date(user.emailVerification.lastSentAt)
    : null;
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < EMAIL_VERIFICATION_POLICY.RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil(
      (EMAIL_VERIFICATION_POLICY.RESEND_COOLDOWN_MS - (now.getTime() - lastSentAt.getTime())) / 1000
    );
    return { error: `Please wait ${retryAfterSeconds} seconds before requesting another code`, retryAfterSeconds };
  }

  const windowStartedAt = user.emailVerification?.resendWindowStartedAt
    ? new Date(user.emailVerification.resendWindowStartedAt)
    : now;
  const withinWindow = now.getTime() - windowStartedAt.getTime() < EMAIL_VERIFICATION_POLICY.RESEND_WINDOW_MS;
  const resendCount = withinWindow ? (user.emailVerification?.resendCount || 0) : 0;
  if (resendCount >= EMAIL_VERIFICATION_POLICY.MAX_RESENDS_PER_WINDOW) {
    return { error: "Too many verification codes requested. Please try again later." };
  }

  const verificationCode = await attachVerificationCode(user._id, {
    now,
    resendCount: resendCount + 1,
    resendWindowStartedAt: withinWindow ? windowStartedAt : now,
  }, repositories.userRepository);
  const delivery = await sendVerificationCode(user, verificationCode.code, repositories.emailService);
  if (!delivery.sent) {
    return { error: delivery.notConfigured ? "Email delivery is not configured" : "Unable to send the verification email. Please try again." };
  }
  return { sent: true, retryAfterSeconds: EMAIL_VERIFICATION_POLICY.RESEND_COOLDOWN_MS / 1000 };
}

export async function updatePendingVerificationEmail(payload, dependencies = {}) {
  const repositories = { authRepository, organizationRepository, userRepository, emailService, ...dependencies };
  const decoded = readPurposeToken(payload.verificationTicket, "email_verification");
  if (!decoded) return { error: "Your verification session has expired. Please register again." };

  const user = await repositories.authRepository.findAuthUserByIdWithSecrets(decoded.sub);
  if (!user || user.isDeleted || user.isEmailVerified || decoded.email !== user.email) {
    return { error: "Your verification session is no longer valid." };
  }

  const email = normalizeEmail(payload.email);
  if (email !== user.email && await repositories.authRepository.isEmailAlreadyUsed(email)) {
    return { error: "Email is already in use" };
  }

  if (user.role === USER_ROLES.ADMIN && user.organization) {
    await repositories.organizationRepository.updateOrganizationById(user.organization, { businessEmail: email });
  }
  const updatedUser = await repositories.userRepository.updateUserById(user._id, { email });
  const verificationCode = await attachVerificationCode(user._id, {}, repositories.userRepository);
  const delivery = await sendVerificationCode(updatedUser, verificationCode.code, repositories.emailService);

  return {
    user: mapUserResponse(updatedUser),
    verificationEmailSent: delivery.sent === true,
    verificationTicket: createVerificationTicket(updatedUser),
  };
}

export async function forgotPassword(email, dependencies = {}) {
  const repositories = { authRepository, userRepository, emailService, ...dependencies };
  const normalizedEmail = normalizeEmail(email);
  const user = await repositories.authRepository.findAuthUserByEmail(normalizedEmail);

  if (!user) {
    return {};
  }

  const passwordResetToken = buildPasswordResetTokenRecord();

  await repositories.userRepository.updateUserById(user._id, {
    passwordReset: {
      tokenHash: passwordResetToken.tokenHash,
      expiresAt: passwordResetToken.expiresAt,
    },
  });

  const frontendOrigin = envConfig.frontendUrl.split(",")[0]?.trim().replace(/\/$/, "");
  const resetUrl = `${frontendOrigin}/reset-password?token=${encodeURIComponent(passwordResetToken.token)}`;
  try {
    await repositories.emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
      token: passwordResetToken.token,
    });
  } catch (error) {
    // Keep this response indistinguishable from an unknown email address.
  }

  return {};
}

export async function resetPassword(payload) {
  if (!ensurePasswordsMatch(payload.password, payload.confirmPassword)) {
    return {
      error: "Passwords do not match",
    };
  }

  const passwordPolicyError = validatePasswordPolicy(payload.password);

  if (passwordPolicyError) {
    return {
      error: passwordPolicyError,
    };
  }

  const tokenHash = hashToken(payload.token);
  const user = await userRepository.findUserByPasswordResetTokenHash(tokenHash);

  if (!user) {
    return {
      error: "Invalid or expired password reset token",
    };
  }

  if (user.passwordReset?.expiresAt && new Date(user.passwordReset.expiresAt) < new Date()) {
    return {
      error: "Invalid or expired password reset token",
    };
  }

  const hashedPassword = await hashPassword(payload.password);

  const updatedUser = await userRepository.updateUserById(user._id, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    passwordReset: {
      tokenHash: null,
      expiresAt: null,
    },
    refreshTokenHash: null,
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}

export async function changePassword(userId, payload) {
  if (!ensurePasswordsMatch(payload.newPassword, payload.confirmPassword)) {
    return {
      error: "Passwords do not match",
    };
  }

  const passwordPolicyError = validatePasswordPolicy(payload.newPassword);

  if (passwordPolicyError) {
    return {
      error: passwordPolicyError,
    };
  }

  const user = await userRepository.findUserByIdWithAuthFields(userId);

  if (!user) {
    return {
      error: "User not found",
    };
  }

  const isCurrentPasswordValid = await comparePassword(payload.currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    return {
      error: "Current password is incorrect",
    };
  }

  const hashedPassword = await hashPassword(payload.newPassword);

  const updatedUser = await userRepository.updateUserById(userId, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    refreshTokenHash: null,
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}
