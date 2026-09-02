import mongoose from "mongoose";

const eventAttendanceSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attendeeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    attendeePhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    attendeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    checkedInAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    collection: "event_attendance",
    autoIndex: false,
    versionKey: false,
    timestamps: true,
  }
);

eventAttendanceSchema.index(
  {
    event: 1,
    attendeeEmail: 1,
  },
  {
    unique: true,
    name: "unique_manual_attendance_email_per_event",
    partialFilterExpression: {
      ticket: { $type: "null" },
    },
  }
);

eventAttendanceSchema.index(
  {
    ticket: 1,
  },
  {
    unique: true,
    name: "unique_ticket_attendance",
    partialFilterExpression: {
      ticket: { $type: "objectId" },
    },
  }
);

eventAttendanceSchema.index({
  event: 1,
  checkedInAt: -1,
});

eventAttendanceSchema.index({
  event: 1,
  attendeeName: 1,
});

eventAttendanceSchema.index({
  organization: 1,
  event: 1,
  checkedInAt: -1,
});

const EventAttendance =
  mongoose.models.EventAttendance || mongoose.model("EventAttendance", eventAttendanceSchema);

export default EventAttendance;
