import { findOrganizationByBusinessEmail } from "./organization.repository.js";
import {
  findUserByEmail,
  findUserByEmailWithAuthFields,
  findUserById,
  findUserByIdWithAuthFields,
} from "./user.repository.js";

export async function isEmailAlreadyUsed(email) {
  const [user, organization] = await Promise.all([
    findUserByEmail(email),
    findOrganizationByBusinessEmail(email),
  ]);

  return Boolean(user || organization);
}

export async function findAuthUserByEmail(email) {
  return findUserByEmailWithAuthFields(email);
}

export async function findAuthUserById(userId) {
  return findUserById(userId);
}

export async function findAuthUserByIdWithSecrets(userId) {
  return findUserByIdWithAuthFields(userId);
}
