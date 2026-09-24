import express from "express";
import * as ticketingController from "../controllers/ticketing.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { USER_ROLES } from "../constants/roles.constants.js";
import {
  checkoutSchema,
  customerHistoryQuerySchema,
  listQuerySchema,
  paymentVerifySchema,
} from "../validators/ticketing.validator.js";
import createRateLimiter from "../config/rateLimit.config.js";
import envConfig from "../config/env.config.js";

const ticketingRouter = express.Router();
const paymentLimiter = createRateLimiter({ max: envConfig.paymentMutationRateLimitMax });

ticketingRouter.use(protectRoute);

const authorizeMarketplaceBuyer = authorizeRoles(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN);

ticketingRouter.get("/history", authorizeMarketplaceBuyer, validate(customerHistoryQuerySchema, "query"), ticketingController.getCustomerHistory);
ticketingRouter.post("/checkout", authorizeMarketplaceBuyer, paymentLimiter, validate(checkoutSchema), ticketingController.createCheckoutOrder);
ticketingRouter.post("/payments/verify", authorizeMarketplaceBuyer, paymentLimiter, validate(paymentVerifySchema), ticketingController.verifyPayment);
ticketingRouter.get("/orders", authorizeMarketplaceBuyer, validate(listQuerySchema, "query"), ticketingController.getCustomerOrders);
ticketingRouter.get("/tickets", authorizeMarketplaceBuyer, validate(listQuerySchema, "query"), ticketingController.getCustomerTickets);

export default ticketingRouter;
