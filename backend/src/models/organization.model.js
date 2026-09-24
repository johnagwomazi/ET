import mongoose from "mongoose";
import { ORGANIZATION_STATUS } from "../constants/organizationStatus.constants.js";

const logoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: "",
      trim: true,
    },
    publicId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const socialLinksSchema = new mongoose.Schema(
  {
    website: {
      type: String,
      default: "",
      trim: true,
    },
    facebook: {
      type: String,
      default: "",
      trim: true,
    },
    instagram: {
      type: String,
      default: "",
      trim: true,
    },
    x: {
      type: String,
      default: "",
      trim: true,
    },
    linkedin: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const payoutDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: "", trim: true },
    accountNumberLast4: { type: String, default: "", trim: true },
    bankCode: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
    currency: { type: String, default: "NGN", uppercase: true, trim: true },
    recipientCode: { type: String, default: "", trim: true, select: false },
    verifiedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const financeLockSchema = new mongoose.Schema(
  {
    token: { type: String, default: "", trim: true },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    primaryAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: [
        ...Object.values(ORGANIZATION_STATUS),
        "PENDING",
        "APPROVED",
        "REJECTED",
      ],
      default: ORGANIZATION_STATUS.ACTIVE,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: "",
      trim: true,
    },
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reactivatedAt: {
      type: Date,
      default: null,
    },
    logo: {
      type: logoSchema,
      default: () => ({}),
    },
    businessPhone: {
      type: String,
      default: "",
      trim: true,
    },
    businessEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    socialLinks: {
      type: socialLinksSchema,
      default: () => ({}),
    },
    payoutDetails: {
      type: payoutDetailsSchema,
      default: () => ({}),
    },
    financeLock: {
      type: financeLockSchema,
      default: () => ({}),
      select: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({
  isDeleted: 1,
  status: 1,
  createdAt: -1,
});

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
