import { EMAIL_DELIVERY_STATUS } from "../constants/notification.constants.js";
import Notification from "../models/notification.model.js";

export async function createNotification(data) {
  return Notification.create(data);
}

export async function findNotificationByDeduplicationKey(deduplicationKey) {
  return Notification.findOne({ deduplicationKey });
}

export async function findNotificationsForRecipient(recipientId, filter = {}, options = {}) {
  return Notification.find({ recipient: recipientId, ...filter })
    .sort({ createdAt: -1, _id: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
}

export async function countNotificationsForRecipient(recipientId, filter = {}) {
  return Notification.countDocuments({ recipient: recipientId, ...filter });
}

export async function countUnreadNotifications(recipientId) {
  return Notification.countDocuments({ recipient: recipientId, isRead: false });
}

export async function markNotificationReadForRecipient(notificationId, recipientId, readAt = new Date()) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { isRead: true, readAt },
    { new: true, runValidators: true }
  );
}

export async function markAllNotificationsReadForRecipient(recipientId, readAt = new Date()) {
  return Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { isRead: true, readAt }
  );
}

export async function claimNotificationEmail(notificationId, maxAttempts, now = new Date()) {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      "emailDelivery.status": { $in: [EMAIL_DELIVERY_STATUS.PENDING, EMAIL_DELIVERY_STATUS.FAILED] },
      "emailDelivery.attempts": { $lt: maxAttempts },
      $or: [
        { "emailDelivery.nextAttemptAt": null },
        { "emailDelivery.nextAttemptAt": { $lte: now } },
      ],
    },
    {
      $set: {
        "emailDelivery.status": EMAIL_DELIVERY_STATUS.SENDING,
        "emailDelivery.lastAttemptAt": now,
      },
      $inc: { "emailDelivery.attempts": 1 },
    },
    { new: true }
  ).populate("recipient");
}

export async function markNotificationEmailSent(notificationId, sentAt = new Date()) {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      "emailDelivery.status": EMAIL_DELIVERY_STATUS.SENT,
      "emailDelivery.sentAt": sentAt,
      "emailDelivery.nextAttemptAt": null,
      "emailDelivery.failureCode": "",
    },
    { new: true }
  );
}

export async function markNotificationEmailFailed(notificationId, failureCode, nextAttemptAt) {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      "emailDelivery.status": EMAIL_DELIVERY_STATUS.FAILED,
      "emailDelivery.failureCode": failureCode,
      "emailDelivery.nextAttemptAt": nextAttemptAt,
    },
    { new: true }
  );
}

export async function markNotificationEmailNotConfigured(notificationId) {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      "emailDelivery.status": EMAIL_DELIVERY_STATUS.NOT_CONFIGURED,
      "emailDelivery.nextAttemptAt": null,
      "emailDelivery.failureCode": "SMTP_NOT_CONFIGURED",
    },
    { new: true }
  );
}

export async function markNotificationEmailUndeliverable(notificationId) {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      "emailDelivery.status": EMAIL_DELIVERY_STATUS.UNDELIVERABLE,
      "emailDelivery.nextAttemptAt": null,
      "emailDelivery.failureCode": "RECIPIENT_UNAVAILABLE",
    },
    { new: true }
  );
}

export async function findRetryableNotificationEmails(maxAttempts, now = new Date(), limit = 50) {
  return Notification.find({
    channels: "EMAIL",
    "emailDelivery.status": { $in: [EMAIL_DELIVERY_STATUS.PENDING, EMAIL_DELIVERY_STATUS.FAILED] },
    "emailDelivery.attempts": { $lt: maxAttempts },
    $or: [
      { "emailDelivery.nextAttemptAt": null },
      { "emailDelivery.nextAttemptAt": { $lte: now } },
    ],
  })
    .select("_id")
    .sort({ "emailDelivery.nextAttemptAt": 1, createdAt: 1 })
    .limit(limit)
    .lean();
}
