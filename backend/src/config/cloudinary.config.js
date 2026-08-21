import { v2 as cloudinary } from "cloudinary";
import envConfig from "./env.config.js";

export function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = envConfig.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}
