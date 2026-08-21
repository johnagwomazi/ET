import envConfig from "./env.config.js";
import { APP_NAME, API_PREFIX, REQUEST_BODY_LIMIT } from "../constants/app.constants.js";

const appConfig = {
  appName: APP_NAME,
  apiPrefix: API_PREFIX,
  port: envConfig.port,
  nodeEnv: envConfig.nodeEnv,
  requestBodyLimit: REQUEST_BODY_LIMIT,
  trustProxy: envConfig.nodeEnv === "production" ? 1 : 0,
};

export default appConfig;
