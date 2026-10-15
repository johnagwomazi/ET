import dns from "node:dns";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import envConfig from "../src/config/env.config.js";

export const EMPTY_SLUG_ALIASES_FILTER = Object.freeze({
  slugAliases: { $size: 0 },
});

export async function migrateEmptyEventSlugAliases({ apply = false, collection = null } = {}) {
  let ownsConnection = false;
  let events = collection;

  if (!events) {
    if (!envConfig.mongoUri) {
      throw new Error("MONGODB_URI is required");
    }

    if (envConfig.dnsServers.length > 0) {
      dns.setServers(envConfig.dnsServers);
    }

    await mongoose.connect(envConfig.mongoUri, { serverSelectionTimeoutMS: 15000 });
    ownsConnection = true;
    events = mongoose.connection.db.collection("events");
  }

  try {
    const matched = await events.countDocuments(EMPTY_SLUG_ALIASES_FILTER);
    const report = { apply, matched, modified: 0 };

    if (apply && matched > 0) {
      const result = await events.updateMany(
        EMPTY_SLUG_ALIASES_FILTER,
        { $unset: { slugAliases: "" } }
      );
      report.modified = Number(result.modifiedCount || 0);
    }

    return report;
  } finally {
    if (ownsConnection) {
      await mongoose.disconnect();
    }
  }
}

const executedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (executedPath === import.meta.url) {
  const apply = process.argv.includes("--apply");
  migrateEmptyEventSlugAliases({ apply })
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${String(error?.stack || error)}\n`);
      process.exitCode = 1;
    });
}
