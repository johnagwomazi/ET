import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import appConfig from "./config/app.config.js";
import envConfig from "./config/env.config.js";
import corsOptions from "./config/cors.config.js";
import { helmetOptions } from "./config/security.config.js";
import createRateLimiter from "./config/rateLimit.config.js";
import createRequestLogger from "./middleware/requestLogger.middleware.js";
import routes from "./routes/index.routes.js";
import notFoundMiddleware from "./middleware/notFound.middleware.js";
import errorHandlerMiddleware from "./middleware/errorHandler.middleware.js";
import cacheControlMiddleware from "./middleware/cacheControl.middleware.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadsDirectory = path.resolve(currentDirectory, "../uploads");
const escapedApiPrefix = appConfig.apiPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const eventOperationsPattern = new RegExp(
  `^${escapedApiPrefix}/(?:manager/events/[^/]+|organizations/me/events/[^/]+)/(?:tickets|attendance)(?:/|$)`
);

function isHighVolumeOperationalRequest(req) {
  return eventOperationsPattern.test(req.path) || req.path === `${appConfig.apiPrefix}/payments/paystack/webhook`;
}

app.set("trust proxy", appConfig.trustProxy);

app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    dotfiles: "deny",
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);
app.use(`${appConfig.apiPrefix}/payments/paystack/webhook`, express.raw({ type: "application/json" }));
app.use(express.json({ limit: appConfig.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.requestBodyLimit }));
app.use(createRequestLogger());
app.use(cacheControlMiddleware);
app.use(createRateLimiter({ skip: isHighVolumeOperationalRequest }));
app.use(
  [
    `${appConfig.apiPrefix}/manager/events/:eventId/tickets`,
    `${appConfig.apiPrefix}/manager/events/:eventId/attendance`,
    `${appConfig.apiPrefix}/organizations/me/events/:eventId/tickets`,
    `${appConfig.apiPrefix}/organizations/me/events/:eventId/attendance`,
  ],
  createRateLimiter({ max: envConfig.eventOperationsRateLimitMax })
);
app.use(
  `${appConfig.apiPrefix}/payments/paystack/webhook`,
  createRateLimiter({ max: envConfig.eventOperationsRateLimitMax })
);

app.get("/", function rootHandler(req, res) {
  return res.json({
    success: true,
    message: "Operation successful",
    data: {
      service: appConfig.appName,
      status: "running",
    },
  });
});

app.use(appConfig.apiPrefix, routes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
