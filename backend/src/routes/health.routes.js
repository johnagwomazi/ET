import express from "express";
import * as healthController from "../controllers/health.controller.js";

const healthRouter = express.Router();

healthRouter.get("/", healthController.getHealthStatus);

export default healthRouter;
