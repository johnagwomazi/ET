import morgan from "morgan";
import envConfig from "../config/env.config.js";
import logger from "../lib/logger.js";

export default function createRequestLogger() {
  const format = envConfig.nodeEnv === "production" ? "combined" : "dev";

  return morgan(format, {
    stream: {
      write(message) {
        logger.info(message.trim());
      },
    },
  });
}
