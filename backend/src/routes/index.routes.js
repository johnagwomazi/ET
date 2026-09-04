import express from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import publicEventRoutes from "./publicEvent.routes.js";
import organizationRoutes from "./organization.routes.js";
import managerRoutes from "./manager.routes.js";
import ticketingRoutes from "./ticketing.routes.js";
import paymentRoutes from "./payment.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/events", publicEventRoutes);
router.use("/organizations", organizationRoutes);
router.use("/manager", managerRoutes);
router.use("/ticketing", ticketingRoutes);
router.use("/payments", paymentRoutes);
router.use("/notifications", notificationRoutes);

export default router;
