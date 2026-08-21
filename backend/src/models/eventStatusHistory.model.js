import mongoose from "mongoose";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";

const eventStatusHistorySchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      required: true,
    },
    newStatus: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      required: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    previousStartAt: {
      type: Date,
      default: null,
    },
    previousEndAt: {
      type: Date,
      default: null,
    },
    newStartAt: {
      type: Date,
      default: null,
    },
    newEndAt: {
      type: Date,
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    collection: "event_status_histories",
    versionKey: false,
  }
);

eventStatusHistorySchema.index({
  event: 1,
  changedAt: 1,
  _id: 1,
});

const EventStatusHistory =
  mongoose.models.EventStatusHistory || mongoose.model("EventStatusHistory", eventStatusHistorySchema);

export default EventStatusHistory;
