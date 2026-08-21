import mongoose from "mongoose";
import { EVENT_STATUS } from "../constants/eventStatus.constants.js";
import { buildEventSlug } from "../utils/event.util.js";

const bannerSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: "",
      trim: true,
    },
    publicId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      default: "",
      trim: true,
    },
    line2: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    postalCode: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const eventLifecycleSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      default: "",
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedAt: {
      type: Date,
      default: null,
    },
    previousStatus: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: null,
    },
    previousStartAt: {
      type: Date,
      default: null,
    },
    previousEndAt: {
      type: Date,
      default: null,
    },
    nextStartAt: {
      type: Date,
      default: null,
    },
    nextEndAt: {
      type: Date,
      default: null,
    },
    nextStatus: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: null,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    banner: {
      type: bannerSchema,
      default: () => ({}),
    },
    venue: {
      type: venueSchema,
      default: () => ({}),
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          if (!this.startAt || !value) {
            return true;
          }

          return value > this.startAt;
        },
        message: "End date and time must be after start date and time",
      },
    },
    capacity: {
      type: Number,
      required: true,
      min: [0, "Capacity cannot be negative"],
    },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lifecycle: {
      type: eventLifecycleSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.pre("validate", function normalizeEventData(next) {
  this.slug = buildEventSlug(this.slug || this.eventName, this._id);
  next();
});

eventSchema.index(
  {
    organization: 1,
    slug: 1,
  },
  {
    unique: true,
  }
);

eventSchema.index({
  organization: 1,
  status: 1,
  startAt: 1,
});

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
