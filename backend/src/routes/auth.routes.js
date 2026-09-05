import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  customerRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  organizerRegisterSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";
import createRateLimiter from "../config/rateLimit.config.js";
import envConfig from "../config/env.config.js";

const authRouter = express.Router();
const authLimiter = createRateLimiter({ max: envConfig.authRateLimitMax, skipSuccessfulRequests: true });
const recoveryLimiter = createRateLimiter({ max: Math.max(3, Math.floor(envConfig.authRateLimitMax / 2)) });

authRouter.post("/register/customer", authLimiter, validate(customerRegisterSchema), authController.registerCustomer);
authRouter.post("/register/organizer", authLimiter, validate(organizerRegisterSchema), authController.registerOrganizer);
authRouter.post("/login", authLimiter, validate(loginSchema), authController.login);
authRouter.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post("/forgot-password", recoveryLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", recoveryLimiter, validate(resetPasswordSchema), authController.resetPassword);

authRouter.use(protectRoute);

authRouter.get("/me", authController.getCurrentUser);
authRouter.post("/logout", authController.logout);
authRouter.patch("/change-password", validate(changePasswordSchema), authController.changePassword);

export default authRouter;
