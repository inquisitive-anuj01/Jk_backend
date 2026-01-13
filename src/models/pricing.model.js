import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      unique: true, // Ensures one active pricing rule per car
    },

    // --- 1. POINT TO POINT (P2P) LOGIC ---
    pointToPoint: {
      isActive: { type: Boolean, default: true },

      // The "Bands" from your screenshot
      distanceTiers: [
        {
          fromDistance: { type: Number, required: true }, // e.g. 0
          toDistance: { type: Number, required: true }, // e.g. 10
          price: { type: Number, required: true }, // e.g. 109.5
          type: {
            type: String,
            enum: ["fixed", "per_mile"],
            required: true,
          }, // "Min Charge" = fixed, "Per Mile" = per_mile
        },
      ],

      // The "After X miles" rule
      afterDistancePrice: {
        distanceThreshold: { type: Number }, // e.g. 40
        pricePerMile: { type: Number }, // e.g. 3.3
      },
    },

    // --- 2. AS DIRECTED (HOURLY) LOGIC ---
    hourly: {
      isActive: { type: Boolean, default: true },
      hourlyRate: { type: Number }, // e.g. 45
      minimumHours: { type: Number }, // e.g. 4
      milesIncludedPerHour: { type: Number }, // e.g. 10 (or total miles included)
      extraHourPrice: { type: Number }, // e.g. 45
      excessMileagePrice: { type: Number }, // e.g. 2.75 per mile over limit
    },

    // --- 3. ADDITIONAL CHARGES (Global for this car) ---
    extras: {
      extraStopPrice: { type: Number, default: 0 },
      childSeatPrice: { type: Number, default: 0 },
      congestionCharge: { type: Number, default: 0 },
      parkingIncluded: { type: Boolean, default: false },
      vatIncluded: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Pricing = mongoose.model("Pricing", pricingSchema);
