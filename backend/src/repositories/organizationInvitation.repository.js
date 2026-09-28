import OrganizationInvitation, { ORGANIZATION_INVITATION_STATUS } from "../models/organizationInvitation.model.js";

const INVITATION_POPULATE = [
  { path: "organization", select: "organizationName status logo" },
  { path: "events", select: "eventName status startAt endAt" },
  { path: "invitedBy", select: "firstName lastName email" },
];

function populateInvitation(query) {
  INVITATION_POPULATE.forEach((entry) => query.populate(entry));
  return query;
}

export async function upsertPendingInvitation(filter, invitationData) {
  return OrganizationInvitation.findOneAndUpdate(
    { ...filter, status: ORGANIZATION_INVITATION_STATUS.PENDING },
    { $set: invitationData },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function findInvitationByTokenHash(tokenHash) {
  return populateInvitation(OrganizationInvitation.findOne({ tokenHash }).select("+tokenHash"));
}

export async function acceptPendingInvitation(invitationId, userId) {
  return OrganizationInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      status: ORGANIZATION_INVITATION_STATUS.PENDING,
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: ORGANIZATION_INVITATION_STATUS.ACCEPTED, acceptedAt: new Date(), acceptedBy: userId } },
    { new: true, runValidators: true }
  );
}
