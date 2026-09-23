import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureCloudinary } from "../config/cloudinary.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import AppError from "../utils/appError.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const eventBannerDirectory = path.resolve(currentDirectory, "../../uploads/event-banners");
const LOCAL_PUBLIC_ID_PREFIX = "local:event-banners/";
const CLOUDINARY_FOLDER = "events/event-banners";

function getCloudinaryUploadFailure(error) {
  const message = String(error?.message || "");
  const httpCode = Number(error?.http_code || error?.httpCode || 0) || null;
  const errorCode = typeof error?.code === "string" ? error.code : null;

  if (
    httpCode === HTTP_STATUS.UNAUTHORIZED ||
    /invalid cloud_name|unknown api key|invalid signature|authentication/i.test(message)
  ) {
    return {
      clientMessage: "Image storage configuration is invalid",
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      logDetails: {
        provider: "cloudinary",
        reason: /invalid cloud_name/i.test(message) ? "invalid-cloud-name" : "authentication-failed",
        httpCode,
        errorCode,
      },
    };
  }

  if (httpCode === HTTP_STATUS.BAD_REQUEST) {
    return {
      clientMessage: "Image storage rejected the banner image",
      statusCode: HTTP_STATUS.BAD_REQUEST,
      logDetails: {
        provider: "cloudinary",
        reason: "image-rejected",
        httpCode,
        errorCode,
      },
    };
  }

  return {
    clientMessage: "Image storage is temporarily unavailable",
    statusCode: HTTP_STATUS.BAD_GATEWAY,
    logDetails: {
      provider: "cloudinary",
      reason: "provider-unavailable",
      httpCode,
      errorCode,
    },
  };
}

async function uploadToCloudinary(file, cloudinaryClient, logger) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryClient.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) {
          const failure = getCloudinaryUploadFailure(error);
          logger.error("[event-banner] Cloudinary upload failed", failure.logDetails);
          reject(new AppError(failure.clientMessage, failure.statusCode));
          return;
        }

        if (!result?.secure_url?.startsWith("https://") || !result?.public_id) {
          reject(new AppError("Image storage returned an invalid banner URL", HTTP_STATUS.BAD_GATEWAY));
          return;
        }

        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    uploadStream.end(file.buffer);
  });
}

export async function storeEventBanner(file, options = {}) {
  if (!file?.buffer) {
    return null;
  }

  const cloudinaryClient = options.cloudinaryClient === undefined
    ? configureCloudinary()
    : options.cloudinaryClient;

  if (cloudinaryClient) {
    return uploadToCloudinary(file, cloudinaryClient, options.logger || console);
  }

  throw new AppError("Banner image storage is not configured", HTTP_STATUS.SERVICE_UNAVAILABLE);
}

function getLocalBannerPath(publicId) {
  if (!publicId?.startsWith(LOCAL_PUBLIC_ID_PREFIX)) {
    return null;
  }

  const fileName = publicId.slice(LOCAL_PUBLIC_ID_PREFIX.length);

  if (!fileName || path.basename(fileName) !== fileName) {
    return null;
  }

  const resolvedPath = path.resolve(eventBannerDirectory, fileName);
  const directoryPrefix = `${eventBannerDirectory}${path.sep}`;

  return resolvedPath.startsWith(directoryPrefix) ? resolvedPath : null;
}

export async function removeEventBanner(publicId, options = {}) {
  if (!publicId) {
    return false;
  }

  const localPath = getLocalBannerPath(publicId);

  if (localPath) {
    try {
      await unlink(localPath);
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return false;
      }

      throw error;
    }
  }

  const cloudinaryClient = options.cloudinaryClient === undefined
    ? configureCloudinary()
    : options.cloudinaryClient;

  if (!cloudinaryClient) {
    return false;
  }

  await cloudinaryClient.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  return true;
}
