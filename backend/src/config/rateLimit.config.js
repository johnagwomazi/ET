import rateLimit from "express-rate-limit";
import envConfig from "./env.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import { errorResponse } from "../utils/apiResponse.js";

export default function createRateLimiter() {
  return rateLimit({
    windowMs: envConfig.rateLimitWindowMs,
    max: envConfig.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
        errorResponse("Too many requests, please try again later")
      );
    },
  });
}
