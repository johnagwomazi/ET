import mongoose from "mongoose";
import logger from "../lib/logger.js";
import * as couponRepository from "../repositories/coupon.repository.js";

const RESERVATION_TTL_MS = 30 * 60 * 1000;
let cleanupRunning = false;
const defaultDependencies = { mongoose, couponRepository };

export async function runCouponReservationCleanup(dependencies = defaultDependencies) {
  if (cleanupRunning || dependencies.mongoose.connection.readyState !== 1) return { skipped: true, released: 0 };
  cleanupRunning = true;
  const session = await dependencies.mongoose.startSession();
  try {
    let released = 0;
    await session.withTransaction(async () => {
      released = await dependencies.couponRepository.releaseExpiredCouponReservations(
        new Date(Date.now() - RESERVATION_TTL_MS),
        { session }
      );
    });
    return { skipped: false, released };
  } catch (error) {
    logger.warn(`Coupon reservation cleanup failed: ${error.message || error}`);
    return { skipped: false, released: 0, error: true };
  } finally {
    await session.endSession();
    cleanupRunning = false;
  }
}
