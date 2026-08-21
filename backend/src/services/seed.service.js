import envConfig from "../config/env.config.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import logger from "../lib/logger.js";
import { hashPassword } from "../utils/password.util.js";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";

export async function seedInitialSuperAdmin() {
  const { firstName, lastName, email, password } = envConfig.superAdmin;

  if (!firstName || !lastName || !email || !password) {
    logger.warn("Super admin seed configuration is incomplete. Skipping seed.");
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingSuperAdmin = await findUserByEmail(normalizedEmail);

  if (existingSuperAdmin) {
    return existingSuperAdmin;
  }

  const hashedPassword = await hashPassword(password);

  return createUser({
    firstName,
    lastName,
    email: normalizedEmail,
    password: hashedPassword,
    role: USER_ROLES.SUPER_ADMIN,
    organization: null,
    isEmailVerified: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    emailVerification: {
      tokenHash: null,
      expiresAt: null,
      verifiedAt: new Date(),
    },
    passwordReset: {
      tokenHash: null,
      expiresAt: null,
    },
  });
}
