import mongoose from "mongoose";
import envConfig from "./env.config.js";
import logger from "../lib/logger.js";
import EventAttendance from "../models/eventAttendance.model.js";

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

  await mongoose.connect(envConfig.mongoUri);
  await EventAttendance.syncIndexes();
  isConnected = true;

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
