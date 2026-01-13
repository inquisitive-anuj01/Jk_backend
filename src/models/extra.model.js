import mongoose from "mongoose";

const extraSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    }, // e.g., "Child Seat", "Meet & Greet", "Additional Stop"
    description: { type: String },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["seat", "service", "other"],
      default: "other",
    },
    icon: { type: String }, // URL for icon
    maxQuantity: {
      type: Number,
      default: 2,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Extra = mongoose.model("Extra", extraSchema);
