import { create } from "zustand";
import { RECENT_NOTIFICATION_LIMIT } from "../constants/notification.constants";
import * as notificationService from "../services/notification.service";

let countController = null;
let listController = null;

const initialState = {
  currentUserId: null,
  isInitialized: false,
  unreadCount: 0,
  notifications: [],
  pagination: null,
  isCountLoading: false,
  isListLoading: false,
  listError: "",
};

function friendlyError() {
  return "Notifications could not be loaded. Please try again.";
}

function abortRequests() {
  countController?.abort();
  listController?.abort();
  countController = null;
  listController = null;
}

export const useNotificationStore = create((set, get) => ({
  ...initialState,

  reset() {
    abortRequests();
    set(initialState);
  },

  async initializeForUser(userId) {
    const normalizedUserId = userId ? String(userId) : null;
    if (!normalizedUserId) {
      get().reset();
      return;
    }

    const state = get();
    if (state.currentUserId === normalizedUserId && state.isInitialized) return;

    abortRequests();
    set({ ...initialState, currentUserId: normalizedUserId, isInitialized: true });
    await get().refreshUnreadCount();
  },

  async refreshUnreadCount() {
    const userId = get().currentUserId;
    if (!userId) return;

    countController?.abort();
    const controller = new AbortController();
    countController = controller;
    set({ isCountLoading: true });

    try {
      const response = await notificationService.getUnreadCount({ signal: controller.signal });
      if (!controller.signal.aborted && get().currentUserId === userId) {
        set({ unreadCount: Math.max(0, Number(response?.unreadCount || 0)) });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        // A count failure should not replace usable notification-list content.
        set({ unreadCount: get().unreadCount });
      }
    } finally {
      if (!controller.signal.aborted && get().currentUserId === userId) set({ isCountLoading: false });
      if (countController === controller) countController = null;
    }
  },

  async loadRecent() {
    const userId = get().currentUserId;
    if (!userId) return;

    listController?.abort();
    const controller = new AbortController();
    listController = controller;
    set({ isListLoading: true, listError: "" });

    try {
      const response = await notificationService.getNotifications(
        { page: 1, limit: RECENT_NOTIFICATION_LIMIT },
        { signal: controller.signal }
      );
      if (!controller.signal.aborted && get().currentUserId === userId) {
        set({ notifications: response?.notifications || [], pagination: response?.pagination || null });
      }
    } catch (error) {
      if (error.name !== "AbortError" && get().currentUserId === userId) {
        set({ listError: friendlyError() });
      }
    } finally {
      if (!controller.signal.aborted && get().currentUserId === userId) set({ isListLoading: false });
      if (listController === controller) listController = null;
    }
  },

  async openPanel() {
    await Promise.allSettled([get().refreshUnreadCount(), get().loadRecent()]);
  },

  async markRead(notification) {
    if (!notification?.id) return null;
    const response = await notificationService.markNotificationRead(notification.id);
    const updatedNotification = response?.notification;
    if (!updatedNotification) throw new Error("Notification could not be updated");

    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === notification.id ? updatedNotification : item
      ),
      unreadCount: notification.isRead ? state.unreadCount : Math.max(0, state.unreadCount - 1),
    }));
    return updatedNotification;
  },

  async markAllRead() {
    await notificationService.markAllNotificationsRead();
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    }));
  },
}));

