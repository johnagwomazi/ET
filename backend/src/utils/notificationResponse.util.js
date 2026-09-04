export function mapNotificationResponse(notificationDocument) {
  if (!notificationDocument) return null;
  const notification = typeof notificationDocument.toObject === "function"
    ? notificationDocument.toObject()
    : notificationDocument;

  return {
    id: notification._id?.toString?.() || notification.id?.toString?.() || "",
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt || null,
    relatedEntity: {
      type: notification.relatedEntity?.type || null,
      id: notification.relatedEntity?.id?.toString?.() || null,
    },
    navigation: {
      key: notification.navigation?.key || null,
      params: notification.navigation?.params || {},
    },
    metadata: notification.metadata || {},
    createdAt: notification.createdAt || null,
    updatedAt: notification.updatedAt || null,
  };
}
