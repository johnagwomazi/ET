import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureCloudinary } from "../config/cloudinary.config.js";
import envConfig from "../config/env.config.js";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import AppError from "../utils/appError.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const eventBannerDirectory = path.resolve(currentDirectory, "../../uploads/event-banners");
const LOCAL_PUBLIC_ID_PREFIX = "local:event-banners/";
const CLOUDINARY_FOLDER = "events/event-banners";
const FILE_EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function normalizeBaseUrl(baseUrl) {
  return typeof baseUrl === "string" ? baseUrl.replace(/\/$/, "") : "";
}

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

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function uploadToLocalStorage(file, baseUrl) {
  const extension = FILE_EXTENSION_BY_MIME_TYPE[file.mimetype];

  if (!extension) {
    throw new AppError("Unsupported banner image type", HTTP_STATUS.BAD_REQUEST);
  }

  const fileName = `${randomUUID()}${extension}`;
  await mkdir(eventBannerDirectory, { recursive: true });
  await writeFile(path.join(eventBannerDirectory, fileName), file.buffer, { flag: "wx" });

  return {
    url: `${normalizeBaseUrl(baseUrl)}/uploads/event-banners/${fileName}`,
    publicId: `${LOCAL_PUBLIC_ID_PREFIX}${fileName}`,
  };
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

  const nodeEnv = options.nodeEnv || envConfig.nodeEnv;

  if (nodeEnv === "production") {
    throw new AppError("Banner image storage is not configured", HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  return uploadToLocalStorage(file, options.baseUrl || "");
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
