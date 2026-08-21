import express from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import organizationRoutes from "./organization.routes.js";
import managerRoutes from "./manager.routes.js";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/organizations", organizationRoutes);
router.use("/manager", managerRoutes);

export default router;
