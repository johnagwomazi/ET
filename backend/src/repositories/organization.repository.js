import Organization from "../models/organization.model.js";
import { trustedOperator } from "../utils/trustedFilter.util.js";

export async function createOrganization(organizationData) {
  return Organization.create(organizationData);
}

export async function findOrganizationById(organizationId) {
  return Organization.findById(organizationId).populate("primaryAdmin");
}

export async function findOrganizationByBusinessEmail(businessEmail) {
  return Organization.findOne({ businessEmail });
}

export async function updateOrganizationById(organizationId, updateData) {
  return Organization.findOneAndUpdate({ _id: organizationId, isDeleted: false }, updateData, {
    new: true,
    runValidators: true,
  });
}

export async function countOrganizations(filter = {}) {
  return Organization.countDocuments(filter);
}

export async function findOrganizations(filter = {}, options = {}) {
  return Organization.find(filter)
    .populate("primaryAdmin")
    .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

export async function findOrganizationDetailsById(organizationId) {
  return Organization.findOne({ _id: organizationId, isDeleted: false }).populate("primaryAdmin");
}

export async function findOrganizationWithPayoutDetailsById(organizationId) {
  return Organization.findOne({ _id: organizationId, isDeleted: false })
    .select("+payoutDetails.recipientCode +financeLock")
    .populate("primaryAdmin");
}

export async function updateOrganizationPayoutDetails(organizationId, payoutDetails) {
  return Organization.findOneAndUpdate(
    { _id: organizationId, isDeleted: false },
    { $set: { payoutDetails } },
    { new: true, runValidators: true }
  ).select("+payoutDetails.recipientCode");
}

export async function acquireOrganizationFinanceLock(organizationId, token, expiresAt, now = new Date()) {
  return Organization.findOneAndUpdate(
    {
      _id: organizationId,
      isDeleted: false,
      $or: [
        { "financeLock.expiresAt": trustedOperator({ $exists: false }) },
        { "financeLock.expiresAt": null },
        { "financeLock.expiresAt": trustedOperator({ $lte: now }) },
      ],
    },
    { $set: { financeLock: { token, expiresAt } } },
    { new: true }
  ).select("+payoutDetails.recipientCode +financeLock");
}

export async function releaseOrganizationFinanceLock(organizationId, token) {
  return Organization.updateOne(
    { _id: organizationId, "financeLock.token": token },
    { $set: { financeLock: { token: "", expiresAt: null } } }
  );
}

export async function updateOrganizationStatusById(organizationId, updateData) {
  return Organization.findOneAndUpdate({ _id: organizationId, isDeleted: false }, updateData, {
    new: true,
    runValidators: true,
  }).populate("primaryAdmin");
}

export async function softDeleteOrganizationById(organizationId, updateData) {
  return Organization.findOneAndUpdate({ _id: organizationId, isDeleted: false }, updateData, {
    new: true,
    runValidators: true,
  }).populate("primaryAdmin");
}
