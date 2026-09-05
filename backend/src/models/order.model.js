import mongoose from "mongoose";
import { DEFAULT_CURRENCY, ORDER_STATUS, PAYMENT_STATUS } from "../constants/ticketing.constants.js";

const orderItemSchema = new mongoose.Schema(
  {
    ticketType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketType",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const customerInfoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      default: "",
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    fees: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      uppercase: true,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true,
    },
    paymentProvider: {
      type: String,
      default: "paystack",
      trim: true,
    },
    customerInfo: {
      type: customerInfoSchema,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReservedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index(
  { paymentReference: 1 },
  { unique: true, partialFilterExpression: { paymentReference: { $type: "string", $gt: "" } } }
);
orderSchema.index({ organization: 1, event: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paidAt: -1, createdAt: -1 });
orderSchema.index({ organization: 1, event: 1, paymentStatus: 1, paidAt: -1 });
orderSchema.index(
  { customer: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string", $gt: "" },
    },
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
