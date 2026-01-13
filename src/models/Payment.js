import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },  
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "GBP",
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    stripeCustomerId: { type: String },
    status: {
      type: String,
      required: true,
      enum: [
        "requires_payment_method",
        "requires_confirmation",
        "processing",
        "requires_action",
        "succeeded",
        "failed",
      ],
    },
    paymentMethod: { type: String },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
