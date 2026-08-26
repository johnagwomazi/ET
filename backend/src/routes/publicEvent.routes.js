import express from "express";
import * as eventDiscoveryController from "../controllers/eventDiscovery.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { publicEventDiscoveryQuerySchema } from "../validators/publicEventDiscovery.validator.js";

const publicEventRouter = express.Router();

publicEventRouter.get(
  "/discover",
  validate(publicEventDiscoveryQuerySchema, "query"),
  eventDiscoveryController.discoverPublicEvents
);

export default publicEventRouter;
