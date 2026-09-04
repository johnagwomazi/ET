import mongoose from "mongoose";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";
import User from "../models/user.model.js";

function getOrganizationObjectId(organizationId) {
  if (!organizationId) {
    return null;
  }

  if (organizationId instanceof mongoose.Types.ObjectId) {
    return organizationId;
  }

  return new mongoose.Types.ObjectId(organizationId);
}

export async function createUser(userData) {
  return User.create(userData);
}

export async function findUserById(userId) {
  return User.findById(userId).populate("organization");
}

export async function findUserByIdWithAuthFields(userId) {
  return User.findById(userId).select(
    "+password +refreshTokenHash +emailVerification.tokenHash +emailVerification.expiresAt +passwordReset.tokenHash +passwordReset.expiresAt"
  );
}

export async function findUserByEmail(email) {
  return User.findOne({ email });
}

export async function findUserByEmailIncludingDeleted(email) {
  return User.findOne({ email, isDeleted: false });
}

export async function findUserByEmailWithAuthFields(email) {
  return User.findOne({ email }).select(
    "+password +refreshTokenHash +emailVerification.tokenHash +emailVerification.expiresAt +passwordReset.tokenHash +passwordReset.expiresAt"
  );
}

export async function findUserByVerificationTokenHash(tokenHash) {
  return User.findOne({ "emailVerification.tokenHash": tokenHash }).select(
    "+password +refreshTokenHash +emailVerification.tokenHash +emailVerification.expiresAt +emailVerification.verifiedAt"
  );
}

export async function findUserByPasswordResetTokenHash(tokenHash) {
  return User.findOne({ "passwordReset.tokenHash": tokenHash }).select(
    "+password +passwordReset.tokenHash +passwordReset.expiresAt"
  );
}

export async function updateUserById(userId, updateData) {
  return User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });
}

export async function updateUserByEmail(email, updateData) {
  return User.findOneAndUpdate({ email }, updateData, {
    new: true,
    runValidators: true,
  });
}

export async function countUsers(filter = {}) {
  return User.countDocuments(filter);
}

export async function findUsers(filter = {}, options = {}) {
  return User.find(filter)
    .populate("organization")
    .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

export async function findActiveUsersByRole(role) {
  return User.find({ role, accountStatus: ACCOUNT_STATUS.ACTIVE, isDeleted: false });
}

export async function findOrganizationMembers(filter = {}, options = {}) {
  return User.find(filter)
    .populate("organization")
    .select("-password -refreshTokenHash -emailVerification -passwordReset")
    .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

export async function findUserDetailsById(userId) {
  return User.findOne({ _id: userId, isDeleted: false })
    .populate("organization")
    .select("-password -refreshTokenHash -emailVerification -passwordReset");
}

export async function findOrganizationMemberByIdAndOrganization(userId, organizationId) {
  return User.findOne({
    _id: userId,
    organization: organizationId,
    isDeleted: false,
  })
    .populate("organization")
    .select("-password -refreshTokenHash -emailVerification -passwordReset");
}

export async function findOrganizationMemberByEmailAndOrganization(email, organizationId) {
  return User.findOne({
    email,
    organization: organizationId,
    isDeleted: false,
  })
    .populate("organization")
    .select("-password -refreshTokenHash -emailVerification -passwordReset");
}

export async function updateUserStatusById(userId, updateData) {
  return User.findOneAndUpdate({ _id: userId, isDeleted: false }, updateData, {
    new: true,
    runValidators: true,
  });
}

export async function softDeleteUserById(userId, updateData) {
  return User.findOneAndUpdate({ _id: userId, isDeleted: false }, updateData, {
    new: true,
    runValidators: true,
  });
}

export async function updateOrganizationMemberByIdAndOrganization(userId, organizationId, updateData) {
  return User.findOneAndUpdate(
    {
      _id: userId,
      organization: organizationId,
      isDeleted: false,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("organization");
}

export async function getOrganizationMemberStatistics(organizationId) {
  const organizationObjectId = getOrganizationObjectId(organizationId);

  if (!organizationObjectId) {
    return {
      totalMembers: 0,
      activeMembers: 0,
      suspendedMembers: 0,
      pendingVerificationMembers: 0,
      inactiveMembers: 0,
    };
  }

  const [statistics] = await User.aggregate([
    {
      $match: {
        organization: organizationObjectId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalMembers: { $sum: 1 },
        activeMembers: {
          $sum: {
            $cond: [{ $eq: ["$accountStatus", ACCOUNT_STATUS.ACTIVE] }, 1, 0],
          },
        },
        suspendedMembers: {
          $sum: {
            $cond: [{ $eq: ["$accountStatus", ACCOUNT_STATUS.SUSPENDED] }, 1, 0],
          },
        },
        pendingVerificationMembers: {
          $sum: {
            $cond: [{ $eq: ["$accountStatus", ACCOUNT_STATUS.PENDING_VERIFICATION] }, 1, 0],
          },
        },
        inactiveMembers: {
          $sum: {
            $cond: [{ $eq: ["$accountStatus", ACCOUNT_STATUS.INACTIVE] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    totalMembers: statistics?.totalMembers || 0,
    activeMembers: statistics?.activeMembers || 0,
    suspendedMembers: statistics?.suspendedMembers || 0,
    pendingVerificationMembers: statistics?.pendingVerificationMembers || 0,
    inactiveMembers: statistics?.inactiveMembers || 0,
  };
}

export async function findOrganizationRecentMemberActivity(organizationId, limit = 5) {
  const organizationObjectId = getOrganizationObjectId(organizationId);

  if (!organizationObjectId) {
    return [];
  }

  return User.aggregate([
    {
      $match: {
        organization: organizationObjectId,
        isDeleted: false,
      },
    },
    {
      $addFields: {
        activityAt: {
          $max: [
            { $ifNull: ["$createdAt", null] },
            { $ifNull: ["$suspendedAt", null] },
            { $ifNull: ["$reactivatedAt", null] },
            { $ifNull: ["$deletedAt", null] },
          ],
        },
      },
    },
    {
      $match: {
        activityAt: { $ne: null },
      },
    },
    {
      $sort: {
        activityAt: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        accountStatus: 1,
        createdAt: 1,
        suspendedAt: 1,
        suspendedBy: 1,
        suspensionReason: 1,
        reactivatedAt: 1,
        reactivatedBy: 1,
        deletedAt: 1,
        deletedBy: 1,
        activityAt: 1,
      },
    },
  ]);
}
