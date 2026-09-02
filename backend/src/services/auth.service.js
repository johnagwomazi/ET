import jwt from "jsonwebtoken";
import envConfig from "../config/env.config.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { AUTH_TOKEN_EXPIRES_IN, PASSWORD_POLICY } from "../constants/auth.constants.js";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as authRepository from "../repositories/auth.repository.js";
import * as organizationRepository from "../repositories/organization.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { createOrganization } from "../repositories/organization.repository.js";
import { createUser } from "../repositories/user.repository.js";
import { comparePassword, hashPassword } from "../utils/password.util.js";
import { getOrganizationRolePermissions } from "../utils/organizationPermission.util.js";
import { generateSecureToken, hashToken } from "../utils/token.util.js";
import { mapOrganizationResponse } from "../utils/organizationResponse.util.js";
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

function generateTokenPair(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    organizationId: user.organization ? user.organization.toString() : null,
  };

  const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, {
    expiresIn: envConfig.jwtAccessExpiresIn || AUTH_TOKEN_EXPIRES_IN.ACCESS_TOKEN,
  });

  const refreshToken = jwt.sign(payload, envConfig.jwtRefreshSecret, {
    expiresIn: envConfig.jwtRefreshExpiresIn || AUTH_TOKEN_EXPIRES_IN.REFRESH_TOKEN,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
  };
}

function buildVerificationTokenRecord() {
  const token = generateSecureToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

async function attachVerificationToken(userId) {
  const verificationToken = buildVerificationTokenRecord();

  await userRepository.updateUserById(userId, {
    emailVerification: {
      tokenHash: verificationToken.tokenHash,
      expiresAt: verificationToken.expiresAt,
      verifiedAt: null,
    },
  });

  return verificationToken;
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
    password: hashedPassword,
    role: USER_ROLES.CUSTOMER,
    organization: null,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
  });

  await attachVerificationToken(customerUser._id);

  return {
    user: customerUser,
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
    status: ORGANIZATION_STATUS.PENDING,
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
    password: hashedPassword,
    role: USER_ROLES.ADMIN,
    organization: organization._id,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING_VERIFICATION,
  });

  await organizationRepository.updateOrganizationById(organization._id, {
    primaryAdmin: adminUser._id,
  });

  await attachVerificationToken(adminUser._id);

  return {
    organization,
    user: adminUser,
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

export async function getCurrentUser(userId) {
  const user = await authRepository.findAuthUserById(userId);
  const organizationIsActive =
    Boolean(user?.organization) &&
    !user.organization.isDeleted &&
    user.organization.status === ORGANIZATION_STATUS.APPROVED;

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

export async function verifyEmail(token) {
  const tokenHash = hashToken(token);
  const user = await userRepository.findUserByVerificationTokenHash(tokenHash);

  if (!user) {
    return {
      error: "Invalid or expired verification token",
    };
  }

  if (user.emailVerification?.expiresAt && new Date(user.emailVerification.expiresAt) < new Date()) {
    return {
      error: "Invalid or expired verification token",
    };
  }

  const updatedUser = await userRepository.updateUserById(user._id, {
    isEmailVerified: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    emailVerification: {
      tokenHash: null,
      expiresAt: null,
      verifiedAt: new Date(),
    },
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}

export async function forgotPassword(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepository.findAuthUserByEmail(normalizedEmail);

  if (!user) {
    return {};
  }

  const passwordResetToken = buildPasswordResetTokenRecord();

  await userRepository.updateUserById(user._id, {
    passwordReset: {
      tokenHash: passwordResetToken.tokenHash,
      expiresAt: passwordResetToken.expiresAt,
    },
  });

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
