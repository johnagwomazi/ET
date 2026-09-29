import "dotenv/config";
import mongoose from "mongoose";
import { buildEventSlug, isReservedEventSlug } from "../src/utils/event.util.js";

function allocateSlug(sourceValue, usedSlugs) {
  const normalized = buildEventSlug(sourceValue);
  const baseSlug = isReservedEventSlug(normalized) ? `${normalized}-event` : normalized;
  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeAliases(values = [], canonicalSlug, usedSlugs) {
  const aliases = [];

  for (const value of Array.isArray(values) ? values : []) {
    const alias = buildEventSlug(value);
    if (
      !alias
      || alias === canonicalSlug
      || isReservedEventSlug(alias)
      || usedSlugs.has(alias)
      || aliases.includes(alias)
    ) {
      continue;
    }
    aliases.push(alias);
    usedSlugs.add(alias);
  }

  return aliases;
}

export async function migrateEventSlugs({ apply = false } = {}) {
  const mongoUri = process.env.MONGODB_URI || "";
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  try {
    const events = mongoose.connection.db.collection("events");
    const cursor = events.find(
      {},
      { projection: { _id: 1, eventName: 1, slug: 1, slugAliases: 1, createdAt: 1 } }
    ).sort({ createdAt: 1, _id: 1 });
    const usedSlugs = new Set();
    const updates = [];
    let scanned = 0;
    let renamed = 0;

    for await (const event of cursor) {
      scanned += 1;
      const slug = allocateSlug(event.slug || event.eventName || event._id, usedSlugs);
      if (slug !== event.slug) renamed += 1;
      usedSlugs.add(slug);
      const slugAliases = normalizeAliases(event.slugAliases, slug, usedSlugs);
      updates.push({
        updateOne: {
          filter: { _id: event._id },
          update: slugAliases.length
            ? { $set: { slug, slugAliases } }
            : { $set: { slug }, $unset: { slugAliases: "" } },
        },
      });
    }

    const report = {
      apply,
      scanned,
      renamed,
      indexesCreated: false,
    };

    if (!apply) return report;
    if (updates.length) await events.bulkWrite(updates, { ordered: true });

    const indexes = await events.indexes();
    const legacyIndex = indexes.find((index) => index.name === "organization_1_slug_1");
    if (legacyIndex) await events.dropIndex(legacyIndex.name);
    await events.createIndex({ slug: 1 }, { unique: true, name: "slug_1" });
    await events.createIndex(
      { slugAliases: 1 },
      { unique: true, sparse: true, name: "slugAliases_1" }
    );
    report.indexesCreated = true;
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

const apply = process.argv.includes("--apply");
migrateEventSlugs({ apply })
  .then((report) => {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  })
  .catch((error) => {
    process.stderr.write(String(error?.stack || error) + "\n");
    process.exitCode = 1;
  });
