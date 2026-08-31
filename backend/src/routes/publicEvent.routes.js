import express from "express";
import * as eventDiscoveryController from "../controllers/eventDiscovery.controller.js";
import * as ticketingController from "../controllers/ticketing.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { eventIdParamSchema } from "../validators/event.validator.js";
import { publicEventDiscoveryQuerySchema } from "../validators/publicEventDiscovery.validator.js";

const publicEventRouter = express.Router();

publicEventRouter.get(
  "/discover",
  validate(publicEventDiscoveryQuerySchema, "query"),
  eventDiscoveryController.discoverPublicEvents
);

publicEventRouter.get(
  "/:eventId/ticket-types",
  validate(eventIdParamSchema, "params"),
  ticketingController.getPublicEventTicketTypes
);

publicEventRouter.get(
  "/:eventId",
  validate(eventIdParamSchema, "params"),
  eventDiscoveryController.getPublicEventById
);

export default publicEventRouter;
