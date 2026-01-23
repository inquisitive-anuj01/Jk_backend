import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        // Booking Reference Number
        bookingNumber: {
            type: String,
            unique: true,
        },

        // Journey Details
        pickup: {
            address: { type: String, required: true },
            lat: { type: Number },
            lng: { type: Number },
        },
        dropoff: {
            address: { type: String }, // Optional for hourly bookings
            lat: { type: Number },
            lng: { type: Number },
        },
        pickupDate: { type: Date, required: true },
        pickupTime: { type: String, required: true },
        serviceType: {
            type: String,
            enum: ["oneway", "roundtrip", "hourly"],
            default: "oneway",
        },

        // Journey Info
        journeyInfo: {
            distanceMiles: { type: Number },
            durationMinutes: { type: Number },
            hours: { type: Number }, // For hourly bookings
        },

        // Vehicle Details
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
        vehicleDetails: {
            categoryName: { type: String },
            categoryDetails: { type: String },
            numberOfPassengers: { type: Number },
            numberOfBigLuggage: { type: Number },
        },

        // Pricing
        pricing: {
            basePrice: { type: Number },
            airportCharges: { type: Number, default: 0 },
            congestionCharge: { type: Number, default: 0 },
            vatRate: { type: Number, default: 20 },
            tax: { type: Number },
            totalPrice: { type: Number },
        },

        // Passenger Details (User booking the ride)
        passengerDetails: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true },
            countryCode: { type: String, default: "+44" },
            phone: { type: String, required: true },
            numberOfPassengers: { type: Number, default: 1, min: 1 },
            numberOfSuitcases: { type: Number, default: 0, min: 0 },
        },

        // Booking for Someone Else
        isBookingForSomeoneElse: { type: Boolean, default: false },
        guestDetails: {
            firstName: { type: String },
            lastName: { type: String },
            email: { type: String },
            countryCode: { type: String, default: "+44" },
            phone: { type: String },
        },

        // Airport Pickup
        isAirportPickup: { type: Boolean, default: false },
        flightDetails: {
            flightNumber: { type: String },
            nameBoard: { type: String },
        },

        // Additional Requirements
        specialInstructions: { type: String },

        // Booking Status
        status: {
            type: String,
            enum: ["pending", "confirmed", "in-progress", "completed", "cancelled"],
            default: "pending",
        },

        // Payment Status
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded", "failed"],
            default: "pending",
        },
        paymentIntentId: { type: String },

        // Reference to user if registered
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// Auto-generate booking number before saving
bookingSchema.pre("save", async function () {
    if (!this.bookingNumber) {
        // Generate unique booking number: JK-XXXXXXX (7 random digits)
        const randomNum = Math.floor(1000000 + Math.random() * 9000000);
        this.bookingNumber = `JK-${randomNum}`;
    }
});

// Index for faster queries
bookingSchema.index({ "passengerDetails.email": 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);

