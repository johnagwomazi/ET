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

const ticketingRouter = express.Router();

ticketingRouter.use(protectRoute);
ticketingRouter.use(authorizeRoles(USER_ROLES.CUSTOMER));

ticketingRouter.get("/history", validate(customerHistoryQuerySchema, "query"), ticketingController.getCustomerHistory);
ticketingRouter.post("/checkout", validate(checkoutSchema), ticketingController.createCheckoutOrder);
ticketingRouter.post("/payments/verify", validate(paymentVerifySchema), ticketingController.verifyPayment);
ticketingRouter.get("/orders", validate(listQuerySchema, "query"), ticketingController.getCustomerOrders);
ticketingRouter.get("/tickets", validate(listQuerySchema, "query"), ticketingController.getCustomerTickets);

export default ticketingRouter;
