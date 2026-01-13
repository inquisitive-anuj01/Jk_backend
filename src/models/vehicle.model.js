import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    // Basic Category Info
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    categoryDetails: {
      type: String,
      required: true,
      trim: true,
    },

    // Vehicle Image (Single)
    image: {
      url: { type: String, required: true },
      filename: { type: String },
    },

    // Capacity & Luggage
    numberOfPassengers: {
      type: Number,
      required: true,
      min: 1,
      max: 50, // Changed from 10 to 50 (for larger vehicles)
    },

    numberOfBigLuggage: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },

    numberOfSmallLuggage: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },

    // Display Priority (lower number = shows first)
    listPriority: {
      type: Number,
      default: 0,
      min: 0,
    },

    // VAT & Pricing Options
    vatExempt: {
      type: Boolean,
      default: false,
    },

    dontCalculateVatForCashJobs: {
      type: Boolean,
      default: false,
    },

    // Display Settings
    displayVehicles: {
      type: Boolean,
      default: true,
    },

    displayPrice: {
      type: Boolean,
      default: true,
    },

    // Booking Notice Period (in minutes)
    minimumNoticePeriod: {
      type: Number,
      default: 120, // 120 minutes = 2 hours
      min: 0,
    },

    // Warning Settings
    displayWarningIfBookingWithinNoticePeriod: {
      type: Boolean,
      default: false,
    },

    warningMessage: {
      type: String,
      default:
        "Please note for the future reference, the usable notice period for booking this vehicle is 4 hours, however, we will go ahead and process this booking as a special case.",
    },

    preventBookingWithinNoticePeriod: {
      type: Boolean,
      default: false,
    },

    // Company Features/Offerings (Same for all vehicles)
    companyFeatures: [
      {
        type: String,
        trim: true,
      },
    ],

    // Vehicle Type (for filtering)
    vehicleType: {
      type: String,
      enum: [
        "Sedan",
        "SUV",
        "Luxury",
        "Van",
        "Business",
        "First Class",
        "Executive",
      ],
      required: true,
    },

    // Admin Control
    isActive: {
      type: Boolean,
      default: true,
    },

    availability: {
      type: String,
      enum: ["available", "unavailable", "maintenance"],
      default: "available",
    },

    // Additional metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
vehicleSchema.index({ categoryName: 1 });
vehicleSchema.index({ listPriority: 1 });
vehicleSchema.index({ isActive: 1, availability: 1 });
vehicleSchema.index({ displayVehicles: 1 });
vehicleSchema.index({ vehicleType: 1 });

// Virtual for full image URL
vehicleSchema.virtual("imageUrl").get(function () {
  return this.image?.url ? `${this.image.url}` : null;
});

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
