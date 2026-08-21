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

const authRouter = express.Router();

authRouter.post("/register/customer", validate(customerRegisterSchema), authController.registerCustomer);
authRouter.post("/register/organizer", validate(organizerRegisterSchema), authController.registerOrganizer);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

authRouter.use(protectRoute);

authRouter.get("/me", authController.getCurrentUser);
authRouter.post("/logout", authController.logout);
authRouter.patch("/change-password", validate(changePasswordSchema), authController.changePassword);

export default authRouter;
