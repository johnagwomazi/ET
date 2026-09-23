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

async function uploadToCloudinary(file, cloudinaryClient) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryClient.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) {
          reject(new AppError("Unable to upload the banner image", HTTP_STATUS.BAD_REQUEST));
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
    return uploadToCloudinary(file, cloudinaryClient);
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
