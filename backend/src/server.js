import { createServer } from "node:http";

import app from "./app.js";
import appConfig from "./config/app.config.js";
import { validateEnvironment } from "./config/env.config.js";
import { connectDatabase, disconnectDatabase } from "./config/database.config.js";
import logger from "./lib/logger.js";
import { createSocketServer } from "./socket/socket.server.js";
import { seedInitialSuperAdmin } from "./services/seed.service.js";
import {
  startNotificationScheduler,
  stopNotificationScheduler,
} from "./services/notificationScheduler.service.js";

const server = createServer(app);
const io = createSocketServer(server);

async function startServer() {
  try {
    validateEnvironment();
    await connectDatabase();
    await seedInitialSuperAdmin();

    server.listen(appConfig.port, function onServerStart() {
      logger.info(`Server running on port ${appConfig.port}`);
      startNotificationScheduler();
    });

    setupProcessHandlers();
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

function setupProcessHandlers() {
  process.on("SIGINT", function handleSigint() {
    shutdownServer("SIGINT");
  });

  process.on("SIGTERM", function handleSigterm() {
    shutdownServer("SIGTERM");
  });

  process.on("unhandledRejection", function handleUnhandledRejection(error) {
    logger.error(error);
    shutdownServer("unhandledRejection");
  });

  process.on("uncaughtException", function handleUncaughtException(error) {
    logger.error(error);
    shutdownServer("uncaughtException");
  });
}

async function shutdownServer(signal) {
  logger.warn(`${signal} received. Starting graceful shutdown.`);
  stopNotificationScheduler();
  io.disconnectSockets(true);

  if (!server.listening) {
    await disconnectDatabase();
    process.exit(0);
    return;
  }

  server.close(async function onServerClosed() {
    await disconnectDatabase();
    process.exit(0);
  });
}

startServer();
