import "dotenv/config";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const LOCAL_PUBLIC_ID_PREFIX = "local:event-banners/";
const CLOUDINARY_FOLDER = "events/event-banners/migrated";
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(currentDirectory, "..");
const defaultBannerDirectory = path.join(backendDirectory, "uploads", "event-banners");

export function isCloudinaryUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "res.cloudinary.com" || hostname.endsWith(".cloudinary.com");
  } catch {
    return false;
  }
}

export function getLegacyBannerFileName(banner = {}) {
  if (banner.publicId?.startsWith(LOCAL_PUBLIC_ID_PREFIX)) {
    const fileName = banner.publicId.slice(LOCAL_PUBLIC_ID_PREFIX.length);
    return path.basename(fileName) === fileName ? fileName : "";
  }

  try {
    const fileName = path.basename(decodeURIComponent(new URL(banner.url).pathname));
    return fileName && path.basename(fileName) === fileName ? fileName : "";
  } catch {
    return "";
  }
}

export function getImageMimeType(buffer) {
  if (!buffer || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return "";
}

function getArguments(argv) {
  const reportArgument = argv.find((argument) => argument.startsWith("--report="));
  return {
    apply: argv.includes("--apply"),
    reportPath: reportArgument ? path.resolve(reportArgument.slice("--report=".length)) : "",
  };
}

function getSourceDirectories() {
  const configuredDirectories = String(process.env.EVENT_BANNER_BACKUP_DIRS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.resolve(value));

  return [...new Set([defaultBannerDirectory, ...configuredDirectories])];
}

async function findLocalOriginal(fileName, directories) {
  if (!fileName) return "";

  for (const directory of directories) {
    const candidate = path.resolve(directory, fileName);
    const directoryPrefix = `${path.resolve(directory)}${path.sep}`;
    if (!candidate.startsWith(directoryPrefix)) continue;

    try {
      await access(candidate);
      const fileStats = await stat(candidate);
      if (fileStats.isFile() && fileStats.size <= MAX_IMAGE_BYTES) return candidate;
    } catch {
      // Continue through explicitly configured backup locations.
    }
  }

  return "";
}

async function verifyImageUrl(url) {
  if (!url?.startsWith("https://")) return { ok: false, reason: "URL is not HTTPS" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-31" },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    await response.body?.cancel();

    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    if (!contentType.toLowerCase().startsWith("image/")) {
      return { ok: false, reason: `Unexpected content type: ${contentType || "missing"}` };
    }

    return { ok: true, status: response.status, contentType };
  } catch (error) {
    return { ok: false, reason: error.name === "AbortError" ? "Request timed out" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadOriginal(url) {
  if (!/^https?:\/\//i.test(url || "")) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
    if (!response.ok) return null;

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES || !getImageMimeType(buffer)) return null;
    return buffer;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadBuffer(buffer, eventId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: String(eventId),
        overwrite: true,
        unique_filename: false,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function getRecoverableCloudinaryAsset(banner) {
  if (!banner?.publicId || banner.publicId.startsWith(LOCAL_PUBLIC_ID_PREFIX)) return null;

  try {
    const resource = await cloudinary.api.resource(banner.publicId, { resource_type: "image" });
    if (!resource?.secure_url) return null;
    const verification = await verifyImageUrl(resource.secure_url);
    return verification.ok ? { url: resource.secure_url, publicId: resource.public_id } : null;
  } catch {
    return null;
  }
}

function getEventLabel(event) {
  return {
    id: String(event._id),
    eventName: event.eventName || "Untitled event",
    slug: event.slug || "",
    organizationId: event.organization ? String(event.organization) : "",
  };
}

function getConditionalBannerFilter(event) {
  const filter = { _id: event._id };
  if (event.banner?.url) filter["banner.url"] = event.banner.url;
  else filter["banner.publicId"] = event.banner?.publicId || "";
  return filter;
}

export async function migrateEventBanners({ apply = false, reportPath = "" } = {}) {
  const mongoUri = process.env.MONGODB_URI || "";
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  if (!mongoUri) throw new Error("MONGODB_URI is required");
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary environment variables are required");

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const sourceDirectories = getSourceDirectories();
  const report = {
    mode: apply ? "apply" : "dry-run",
    startedAt: new Date().toISOString(),
    sourceDirectories,
    summary: {
      scanned: 0,
      alreadyValid: 0,
      recoverable: 0,
      migrated: 0,
      repairedCloudinaryUrl: 0,
      requiresReupload: 0,
      failed: 0,
    },
    migrated: [],
    requiresReupload: [],
    failures: [],
  };

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  try {
    const events = await mongoose.connection.db.collection("events").find({
      $or: [
        { "banner.url": { $type: "string", $ne: "" } },
        { "banner.publicId": { $type: "string", $ne: "" } },
      ],
    }).project({
      eventName: 1,
      slug: 1,
      organization: 1,
      banner: 1,
    }).toArray();

    report.summary.scanned = events.length;

    for (const event of events) {
      const label = getEventLabel(event);
      const banner = event.banner || {};

      try {
        if (isCloudinaryUrl(banner.url)) {
          const verification = await verifyImageUrl(banner.url);
          if (verification.ok) {
            report.summary.alreadyValid += 1;
            continue;
          }

          const recoveredAsset = await getRecoverableCloudinaryAsset(banner);
          if (recoveredAsset) {
            if (apply) {
              const updateResult = await mongoose.connection.db.collection("events").updateOne(
                getConditionalBannerFilter(event),
                { $set: { "banner.url": recoveredAsset.url, "banner.publicId": recoveredAsset.publicId } }
              );
              if (updateResult.matchedCount !== 1) throw new Error("Event changed during migration");
              report.summary.repairedCloudinaryUrl += 1;
            } else {
              report.summary.recoverable += 1;
            }
            report.migrated.push({ ...label, source: "cloudinary-resource", url: recoveredAsset.url });
            continue;
          }
        }

        const fileName = getLegacyBannerFileName(banner);
        const localPath = await findLocalOriginal(fileName, sourceDirectories);
        let buffer = localPath ? await readFile(localPath) : null;
        let source = localPath ? `local:${localPath}` : "";

        if (buffer && !getImageMimeType(buffer)) {
          buffer = null;
          source = "";
        }

        if (!buffer) {
          buffer = await downloadOriginal(banner.url);
          if (buffer) source = `remote:${banner.url}`;
        }

        if (!buffer) {
          report.summary.requiresReupload += 1;
          report.requiresReupload.push({
            ...label,
            missingUrl: banner.url || "",
            expectedFileName: fileName,
            reason: "Original image could not be found or downloaded",
          });
          continue;
        }

        if (!apply) {
          report.summary.recoverable += 1;
          report.migrated.push({ ...label, source, status: "ready-to-migrate" });
          continue;
        }

        const uploadResult = await uploadBuffer(buffer, event._id);
        if (!uploadResult?.secure_url?.startsWith("https://") || !uploadResult?.public_id) {
          throw new Error("Cloudinary did not return a valid HTTPS image URL");
        }

        const verification = await verifyImageUrl(uploadResult.secure_url);
        if (!verification.ok) {
          throw new Error(`Uploaded Cloudinary image failed verification: ${verification.reason}`);
        }

        const updateResult = await mongoose.connection.db.collection("events").updateOne(
          getConditionalBannerFilter(event),
          { $set: { "banner.url": uploadResult.secure_url, "banner.publicId": uploadResult.public_id } }
        );
        if (updateResult.matchedCount !== 1) throw new Error("Event changed during migration");

        report.summary.migrated += 1;
        report.migrated.push({ ...label, source, url: uploadResult.secure_url });
      } catch (error) {
        report.summary.failed += 1;
        report.failures.push({ ...label, url: banner.url || "", reason: error.message });
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  report.completedAt = new Date().toISOString();

  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

async function main() {
  const options = getArguments(process.argv.slice(2));
  const report = await migrateEventBanners(options);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.summary.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Event banner migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
