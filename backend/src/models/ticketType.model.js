import mongoose from "mongoose";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_PAYMENT_CURRENCIES,
  TICKET_TYPE_STATUS,
} from "../constants/ticketing.constants.js";

const ticketTypeSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      enum: SUPPORTED_PAYMENT_CURRENCIES,
      uppercase: true,
      trim: true,
      maxlength: 3,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: [0, "Sold quantity cannot be negative"],
    },
    saleStartsAt: {
      type: Date,
      default: null,
    },
    saleEndsAt: {
      type: Date,
      default: null,
    },
    maxPerOrder: {
      type: Number,
      default: 10,
      min: [1, "Max per order must be at least 1"],
    },
    status: {
      type: String,
      enum: Object.values(TICKET_TYPE_STATUS),
      default: TICKET_TYPE_STATUS.ACTIVE,
    },
    position: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ticketTypeSchema.virtual("remainingQuantity").get(function getRemainingQuantity() {
  return Math.max(0, Number(this.quantity || 0) - Number(this.soldQuantity || 0));
});

ticketTypeSchema.index({ event: 1, position: 1, createdAt: 1 });
ticketTypeSchema.index({ organization: 1, event: 1, status: 1 });
ticketTypeSchema.index({ event: 1, name: 1 }, { unique: true });

const TicketType = mongoose.models.TicketType || mongoose.model("TicketType", ticketTypeSchema);

export default TicketType;
