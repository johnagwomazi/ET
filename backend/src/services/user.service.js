import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import * as userRepository from "../repositories/user.repository.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import { mapUserResponse } from "../utils/userResponse.util.js";

function buildUserFilter(query = {}) {
  const filter = {
    isDeleted: false,
  };

  if (query.role) {
    filter.role = query.role;
  }

  if (query.status) {
    filter.accountStatus = query.status;
  }

  if (query.search) {
    const searchExpression = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { firstName: searchExpression },
      { lastName: searchExpression },
      { email: searchExpression },
    ];
  }

  return filter;
}

function canSuspendUser(user) {
  return user.accountStatus !== ACCOUNT_STATUS.SUSPENDED && !user.isDeleted;
}

function canReactivateUser(user) {
  return user.accountStatus === ACCOUNT_STATUS.SUSPENDED && !user.isDeleted;
}

function getRestoredAccountStatus(user) {
  if (user.previousAccountStatus) {
    return user.previousAccountStatus;
  }

  if (user.isEmailVerified) {
    return ACCOUNT_STATUS.ACTIVE;
  }

  return ACCOUNT_STATUS.PENDING_VERIFICATION;
}

export async function getUsers(query) {
  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
  });
  const filter = buildUserFilter(query);
  const [users, totalItems] = await Promise.all([
    userRepository.findUsers(filter, pagination),
    userRepository.countUsers(filter),
  ]);

  return {
    users: users.map(mapUserResponse),
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}

export async function getUserById(userId) {
  const user = await userRepository.findUserDetailsById(userId);

  if (!user) {
    return {
      error: "User not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  return {
    user: mapUserResponse(user),
  };
}

export async function suspendUser(userId, actorUserId, suspensionReason) {
  const user = await userRepository.findUserDetailsById(userId);

  if (!user) {
    return {
      error: "User not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return {
      error: "Super admin cannot be suspended",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  if (!canSuspendUser(user)) {
    return {
      error: "This user cannot be suspended from its current state",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedUser = await userRepository.updateUserStatusById(userId, {
    accountStatus: ACCOUNT_STATUS.SUSPENDED,
    suspendedAt: new Date(),
    suspendedBy: actorUserId,
    suspensionReason,
    previousAccountStatus: user.accountStatus,
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}

export async function reactivateUser(userId, actorUserId) {
  const user = await userRepository.findUserDetailsById(userId);

  if (!user) {
    return {
      error: "User not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return {
      error: "Super admin does not require reactivation",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  if (!canReactivateUser(user)) {
    return {
      error: "Only suspended users can be reactivated",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedUser = await userRepository.updateUserStatusById(userId, {
    accountStatus: getRestoredAccountStatus(user),
    reactivatedAt: new Date(),
    reactivatedBy: actorUserId,
    reactivationReason: "",
    previousAccountStatus: null,
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}

export async function deleteUser(userId, actorUserId) {
  const user = await userRepository.findUserDetailsById(userId);

  if (!user) {
    return {
      error: "User not found",
      statusCode: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return {
      error: "Super admin cannot be deleted",
      statusCode: HTTP_STATUS.BAD_REQUEST,
    };
  }

  const updatedUser = await userRepository.softDeleteUserById(userId, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: actorUserId,
    deletedReason: "",
  });

  return {
    user: mapUserResponse(updatedUser),
  };
}
