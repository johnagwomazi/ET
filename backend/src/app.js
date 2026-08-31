import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import appConfig from "./config/app.config.js";
import corsOptions from "./config/cors.config.js";
import { helmetOptions } from "./config/security.config.js";
import createRateLimiter from "./config/rateLimit.config.js";
import createRequestLogger from "./middleware/requestLogger.middleware.js";
import routes from "./routes/index.routes.js";
import notFoundMiddleware from "./middleware/notFound.middleware.js";
import errorHandlerMiddleware from "./middleware/errorHandler.middleware.js";

const app = express();

app.set("trust proxy", appConfig.trustProxy);

app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use(`${appConfig.apiPrefix}/payments/paystack/webhook`, express.raw({ type: "application/json" }));
app.use(express.json({ limit: appConfig.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.requestBodyLimit }));
app.use(createRequestLogger());
app.use(createRateLimiter());

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
