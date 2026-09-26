import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";

function createCheckInCode() {
  return crypto.randomInt(0, 10_000_000_000).toString().padStart(10, "0");
}

export async function migrateTicketIdentifiers({ apply = false } = {}) {
  const mongoUri = process.env.MONGODB_URI || "";
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  try {
    const database = mongoose.connection.db;
    const tickets = database.collection("tickets");
    const orders = database.collection("orders");
    const events = database.collection("events");
    const ticketTypes = database.collection("tickettypes");

    const missingCodeQuery = {
      $or: [
        { checkInCode: { $exists: false } },
        { checkInCode: null },
        { checkInCode: "" },
      ],
    };
    const [missingTicketCodes, eventsToBackfill] = await Promise.all([
      tickets.countDocuments(missingCodeQuery),
      events.countDocuments({}),
    ]);

    const report = {
      apply,
      missingTicketCodes,
      eventsToBackfill,
      ticketsUpdated: 0,
      ordersUpdated: 0,
      eventsUpdated: 0,
    };
    if (!apply) return report;

    await orders.updateMany(
      { source: { $exists: false } },
      { $set: { source: "PAID" } }
    ).then((result) => { report.ordersUpdated = result.modifiedCount; });
    await tickets.updateMany(
      { source: { $exists: false } },
      { $set: { source: "PAID" } }
    );

    const usedCodes = new Set(
      await tickets.distinct("checkInCode", { checkInCode: { $type: "string" } })
    );
    const cursor = tickets.find(missingCodeQuery, { projection: { _id: 1 } });
    for await (const ticket of cursor) {
      let code = createCheckInCode();
      while (usedCodes.has(code)) code = createCheckInCode();
      const result = await tickets.updateOne(
        { _id: ticket._id, ...missingCodeQuery },
        { $set: { checkInCode: code } }
      );
      if (result.modifiedCount === 1) {
        usedCodes.add(code);
        report.ticketsUpdated += 1;
      }
    }

    const allocatedByEvent = await ticketTypes.aggregate([
      { $group: { _id: "$event", allocated: { $sum: { $ifNull: ["$soldQuantity", 0] } } } },
    ]).toArray();
    const allocationMap = new Map(allocatedByEvent.map((row) => [String(row._id), Number(row.allocated || 0)]));
    const eventCursor = events.find({}, { projection: { _id: 1 } });
    const operations = [];
    for await (const event of eventCursor) {
      operations.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $max: { allocatedTicketQuantity: allocationMap.get(String(event._id)) || 0 } },
        },
      });
    }
    if (operations.length) {
      const result = await events.bulkWrite(operations, { ordered: false });
      report.eventsUpdated = result.modifiedCount;
    }

    await tickets.createIndex(
      { checkInCode: 1 },
      { unique: true, sparse: true, name: "checkInCode_1" }
    );
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

const apply = process.argv.includes("--apply");
migrateTicketIdentifiers({ apply })
  .then((report) => {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  })
  .catch((error) => {
    process.stderr.write("Ticket identifier migration failed: " + error.message + "\n");
    process.exitCode = 1;
  });
