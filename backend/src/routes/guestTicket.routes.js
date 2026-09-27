import express from "express";

import envConfig from "../config/env.config.js";
import createRateLimiter from "../config/rateLimit.config.js";
import * as ticketingController from "../controllers/ticketing.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { guestTicketAccessParamSchema } from "../validators/ticketing.validator.js";

const guestTicketRouter = express.Router();
const guestAccessLimiter = createRateLimiter({ max: Math.min(envConfig.rateLimitMax, 30) });

guestTicketRouter.get(
  "/access/:token",
  guestAccessLimiter,
  validate(guestTicketAccessParamSchema, "params"),
  ticketingController.getGuestTicket
);

export default guestTicketRouter;
