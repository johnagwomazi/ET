import envConfig from "../config/env.config.js";
import { NOTIFICATION_DEFAULTS } from "../constants/notification.constants.js";
import logger from "../lib/logger.js";
import {
  processDueEventReminders,
  retryPendingNotificationEmails,
} from "./notification.service.js";

let workerTimer = null;
let workerRunning = false;

export async function runNotificationWorker() {
  if (workerRunning) return { skipped: true };
  workerRunning = true;
  try {
    const [reminders, emailRetries] = await Promise.all([
      processDueEventReminders(),
      retryPendingNotificationEmails(),
    ]);
    return { reminders, emailRetries };
  } catch (error) {
    logger.error(`Notification worker failed: ${error.message || error}`);
    return { error: true };
  } finally {
    workerRunning = false;
  }
}

export function startNotificationScheduler() {
  if (!envConfig.notificationWorkerEnabled || workerTimer) return;
  void runNotificationWorker();
  workerTimer = setInterval(runNotificationWorker, NOTIFICATION_DEFAULTS.WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  logger.info("Notification reminder and email retry worker started");
}

export function stopNotificationScheduler() {
  if (!workerTimer) return;
  clearInterval(workerTimer);
  workerTimer = null;
}
