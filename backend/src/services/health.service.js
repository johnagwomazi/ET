import mongoose from "mongoose";

export async function getHealthStatus() {
  const databaseConnected = mongoose.connection.readyState === 1;
  return {
    status: databaseConnected ? "ready" : "not_ready",
    database: databaseConnected ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
