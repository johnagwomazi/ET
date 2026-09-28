import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.constants.js";

export const ORGANIZATION_INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REVOKED: "REVOKED",
};

const organizationInvitationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.CUSTOMER], required: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: Object.values(ORGANIZATION_INVITATION_STATUS), default: ORGANIZATION_INVITATION_STATUS.PENDING, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

organizationInvitationSchema.index({ organization: 1, email: 1, status: 1 });
organizationInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const OrganizationInvitation = mongoose.models.OrganizationInvitation
  || mongoose.model("OrganizationInvitation", organizationInvitationSchema);

export default OrganizationInvitation;
