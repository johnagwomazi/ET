import multer from "multer";
import { HTTP_STATUS } from "../constants/httpStatus.constants.js";
import AppError from "../utils/appError.js";

const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_BANNER_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasExpectedImageSignature(file) {
  const buffer = file?.buffer;

  if (!buffer || buffer.length < 12) {
    return false;
  }

  if (file.mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (file.mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (file.mimetype === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BANNER_SIZE_BYTES,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_BANNER_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError("Banner must be a JPG, PNG, or WebP image", HTTP_STATUS.BAD_REQUEST));
      return;
    }

    callback(null, true);
  },
}).single("banner");

export function uploadEventBanner(req, res, next) {
  bannerUpload(req, res, (error) => {
    if (!error) {
      if (req.file && !hasExpectedImageSignature(req.file)) {
        next(new AppError("Banner file content is not a valid image", HTTP_STATUS.BAD_REQUEST));
        return;
      }

      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Banner image must be 5 MB or smaller", HTTP_STATUS.BAD_REQUEST));
      return;
    }

    if (error instanceof multer.MulterError) {
      next(new AppError("Unable to process the banner image", HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  });
}

export function parseMultipartEventPayload(req, res, next) {
  if (!req.is("multipart/form-data")) {
    next();
    return;
  }

  if (typeof req.body?.payload !== "string") {
    next(new AppError("Event payload is required", HTTP_STATUS.BAD_REQUEST));
    return;
  }

  try {
    const payload = JSON.parse(req.body.payload);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid event payload");
    }

    req.body = payload;
    next();
  } catch (error) {
    next(new AppError("Invalid event payload", HTTP_STATUS.BAD_REQUEST));
  }
}
