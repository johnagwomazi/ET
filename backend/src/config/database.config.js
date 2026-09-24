import mongoose from "mongoose";
import dns from "node:dns";
import envConfig from "./env.config.js";
import logger from "../lib/logger.js";
import EventAttendance from "../models/eventAttendance.model.js";
import Organization from "../models/organization.model.js";
import {
  LEGACY_ACTIVE_ORGANIZATION_STATUSES,
  ORGANIZATION_STATUS,
} from "../constants/organizationStatus.constants.js";

let isConnected = false;

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

export async function connectDatabase() {
  if (!envConfig.mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (isConnected) {
    return mongoose.connection;
  }

  if (envConfig.dnsServers.length > 0) {
    dns.setServers(envConfig.dnsServers);
  }

  await mongoose.connect(envConfig.mongoUri);
  const organizationMigration = await Organization.updateMany(
    {
      isDeleted: false,
      status: { $in: LEGACY_ACTIVE_ORGANIZATION_STATUSES },
    },
    { $set: { status: ORGANIZATION_STATUS.ACTIVE } }
  );
  await EventAttendance.createIndexes();
  isConnected = true;

  if (organizationMigration.modifiedCount > 0) {
    logger.info(`Activated ${organizationMigration.modifiedCount} legacy organization records`);
  }

  logger.info("MongoDB connection established");

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (!isConnected) {
    return;
  }

  await mongoose.disconnect();
  isConnected = false;

  logger.info("MongoDB connection closed");
}
