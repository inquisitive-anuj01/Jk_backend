import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Unique Identifier
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // User Reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Journey Details
    pickup: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      date: { type: Date, required: true },
      time: { type: String, required: true },
    },

    dropoff: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },

    // Trip Statistics
    distanceKm: { type: Number, required: true },
    durationMins: { type: Number, required: true },

    // Vehicle & Extras
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    selectedExtras: [
      {
        extraId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Extra",
        },
        name: { type: String },
        price: { type: Number },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],

    // Passenger Details
    passengerDetails: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      isGuestBooking: { type: Boolean, default: false },
      guestName: { type: String },
      guestPhone: { type: String },
    },

    // Flight Details (for airport pickups)
    flightDetails: {
      isAirportPickup: { type: Boolean, default: false },
      flightNumber: { type: String },
      airline: { type: String },
      terminal: { type: String },
      nameBoard: { type: String },
    },

    // Special Instructions
    specialInstructions: { type: String },

    // Pricing Breakdown
    pricing: {
      baseFare: { type: Number, required: true },
      distanceFare: { type: Number, required: true },
      timeFare: { type: Number, default: 0 },
      extrasFare: { type: Number, default: 0 },
      surcharges: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },

    // Payment Information
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },

    // Booking Status
    status: {
      type: String,
      enum: [
        "draft",
        "confirmed",
        "driver_assigned",
        "on_trip",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },

    // Cancellation
    cancelledAt: { type: Date },
    cancellationReason: { type: String },

    // Admin Notes
    adminNotes: { type: String },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
