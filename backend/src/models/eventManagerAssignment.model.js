import mongoose from "mongoose";

const eventManagerAssignmentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    collection: "event_manager_assignments",
    versionKey: false,
  }
);

eventManagerAssignmentSchema.index(
  {
    event: 1,
    user: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      removedAt: null,
    },
  }
);

eventManagerAssignmentSchema.index({
  user: 1,
  removedAt: 1,
  assignedAt: -1,
});

eventManagerAssignmentSchema.index({
  event: 1,
  removedAt: 1,
  assignedAt: -1,
});

const EventManagerAssignment =
  mongoose.models.EventManagerAssignment || mongoose.model("EventManagerAssignment", eventManagerAssignmentSchema);

export default EventManagerAssignment;
