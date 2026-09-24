import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.constants.js";
import { ACCOUNT_STATUS } from "../constants/accountStatus.constants.js";

const emailVerificationSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastSentAt: { type: Date, default: null },
    resendCount: { type: Number, default: 0, min: 0 },
    resendWindowStartedAt: { type: Date, default: null },
  },
  { _id: false }
);

const passwordResetSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.PENDING_VERIFICATION,
    },
    emailVerification: {
      type: emailVerificationSchema,
      default: () => ({}),
    },
    passwordReset: {
      type: passwordResetSchema,
      default: () => ({}),
    },
    refreshTokenHash: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    suspensionReason: {
      type: String,
      default: "",
      trim: true,
    },
    previousAccountStatus: {
      type: String,
      default: null,
    },
    reactivatedAt: {
      type: Date,
      default: null,
    },
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reactivationReason: {
      type: String,
      default: "",
      trim: true,
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
    deletedReason: {
      type: String,
      default: "",
      trim: true,
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

userSchema.index({
  organization: 1,
  isDeleted: 1,
  accountStatus: 1,
  role: 1,
  createdAt: -1,
});

const User = mongoose.model("User", userSchema);

export default User;
