import mongoose from "mongoose";
import {
  EMAIL_DELIVERY_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_NAVIGATION_KEY,
  NOTIFICATION_TYPE,
} from "../constants/notification.constants.js";

const relatedEntitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(NOTIFICATION_ENTITY_TYPE), required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const navigationSchema = new mongoose.Schema(
  {
    key: { type: String, enum: Object.values(NOTIFICATION_NAVIGATION_KEY), required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { _id: false }
);

const emailDeliverySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(EMAIL_DELIVERY_STATUS),
      default: EMAIL_DELIVERY_STATUS.NOT_REQUESTED,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    failureCode: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPE), required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    relatedEntity: { type: relatedEntitySchema, required: true },
    navigation: { type: navigationSchema, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    channels: {
      type: [{ type: String, enum: Object.values(NOTIFICATION_CHANNEL) }],
      default: () => [NOTIFICATION_CHANNEL.IN_APP],
    },
    emailDelivery: { type: emailDeliverySchema, default: () => ({}) },
    deduplicationKey: { type: String, required: true, trim: true, maxlength: 400 },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ "relatedEntity.type": 1, "relatedEntity.id": 1 });
notificationSchema.index({ deduplicationKey: 1 }, { unique: true });
notificationSchema.index({ "emailDelivery.status": 1, "emailDelivery.nextAttemptAt": 1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
