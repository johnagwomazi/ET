import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);


import app from "./app.js";
import appConfig from "./config/app.config.js";
import { connectDatabase, disconnectDatabase } from "./config/database.config.js";
import logger from "./lib/logger.js";
import { seedInitialSuperAdmin } from "./services/seed.service.js";

let server;

async function startServer() {
  try {
    await connectDatabase();
    await seedInitialSuperAdmin();

    server = app.listen(appConfig.port, function onServerStart() {
      logger.info(`Server running on port ${appConfig.port}`);
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

  if (!server) {
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
