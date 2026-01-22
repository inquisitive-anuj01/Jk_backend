import mongoose from "mongoose";

// Distance tier schema for P2P pricing
const distanceTierSchema = new mongoose.Schema(
  {
    fromDistance: { type: Number, required: true }, // e.g. 0
    toDistance: { type: Number, required: true }, // e.g. 10
    price: { type: Number, required: true }, // e.g. 109.5 or 3.2
    type: {
      type: String,
      enum: ["fixed", "per_mile"],
      required: true,
    }, // "fixed" = Min Charge (first tier), "per_mile" = Per Mile rate
  },
  { _id: false }
);

// Point-to-Point pricing schema
const pointToPointSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },

    // Distance tiers (e.g., 0-10: fixed £109.5, 11-30: £3.2/mile, etc.)
    distanceTiers: [distanceTierSchema],

    // "After X miles" rate for distances beyond all tiers
    afterDistanceThreshold: { type: Number, default: 40 }, // e.g. 40 miles
    afterDistancePricePerMile: { type: Number, default: 2.5 }, // e.g. £2.5/mile
  },
  { _id: false }
);

// Hourly (As Directed) pricing schema
const hourlySchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    hourlyRate: { type: Number, default: 0 }, // e.g. £45/hr
    minimumHours: { type: Number, default: 4 }, // e.g. 4 hours minimum
    additionalHourCharge: { type: Number, default: 0 }, // charge per extra hour
    milesIncluded: { type: Number, default: 0 }, // e.g. 48 miles included
    excessMileageCharge: { type: Number, default: 0 }, // e.g. £2.75/mile over limit
  },
  { _id: false }
);

// Additional charges schema
const extrasSchema = new mongoose.Schema(
  {
    extraStopPrice: { type: Number, default: 0 }, // per stop
    childSeatPrice: { type: Number, default: 0 }, // per seat
    congestionCharge: { type: Number, default: 0 }, // flat charge
    parkingIncluded: { type: Boolean, default: false },
  },
  { _id: false }
);

// Main pricing schema
const pricingSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    // Pricing type: 'p2p' (Point to Point) or 'hourly' (As Directed)
    pricingType: {
      type: String,
      enum: ["p2p", "hourly"],
      required: true,
    },

    // Coverage zone (for multi-zone pricing support)
    coverageZone: {
      type: String,
      default: "Entire UK Cover",
      trim: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Display options
    displayVATInclusive: { type: Boolean, default: true },
    displayParkingInclusive: { type: Boolean, default: false },
    priceRoundOff: { type: Boolean, default: false },

    // Point-to-Point pricing configuration
    pointToPoint: pointToPointSchema,

    // Hourly (As Directed) pricing configuration
    hourly: hourlySchema,

    // Additional charges
    extras: extrasSchema,
  },
  { timestamps: true }
);

// Compound index: One pricing config per vehicle + type + zone
pricingSchema.index(
  { vehicle: 1, pricingType: 1, coverageZone: 1 },
  { unique: true }
);

// Index for quick lookups
pricingSchema.index({ vehicle: 1, status: 1 });
pricingSchema.index({ pricingType: 1, status: 1 });

export const Pricing = mongoose.model("Pricing", pricingSchema);
