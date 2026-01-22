/**
 * =============================================================================
 * AIRPORT PRICING MODEL
 * =============================================================================
 * 
 * Stores pricing for each Airport + Vehicle combination.
 * Each airport can have different pricing for each vehicle type.
 * 
 * Example: Heathrow Airport pricing for Mercedes E Class
 * - 0-18 miles: £109.50 (min charge)
 * - 19-40 miles: £2.50/mile
 * - 41-50 miles: £2.50/mile
 * - After 50 miles: £2.50/mile
 * - Extra Stop: £15
 * - Airport Pickup Charge: £5
 * - Airport Dropoff Charge: £3
 * 
 * =============================================================================
 */

import mongoose from "mongoose";

const airportPricingSchema = new mongoose.Schema(
    {
        // ----- References -----
        airport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Airport",
            required: [true, "Airport reference is required"],
        },

        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: [true, "Vehicle reference is required"],
        },

        // ----- Distance Tiers -----
        // Same structure as standard pricing
        distanceTiers: [
            {
                fromDistance: { type: Number, required: true }, // Start miles (e.g., 0)
                toDistance: { type: Number, required: true },   // End miles (e.g., 18)
                price: { type: Number, required: true },        // Price (e.g., 109.50)
                type: {
                    type: String,
                    enum: ["fixed", "per_mile"],
                    default: "fixed",
                    // "fixed" for minimum charge, "per_mile" for rate per mile
                },
            },
        ],

        // For distances beyond all tiers
        afterDistanceThreshold: {
            type: Number,
            default: 50,
            // Example: After 50 miles, use afterDistancePricePerMile
        },

        afterDistancePricePerMile: {
            type: Number,
            default: 2.5,
            // Example: £2.50 per mile after threshold
        },

        // ----- Additional Charges -----
        extras: {
            // Extra stop charge
            extraStopPrice: {
                type: Number,
                default: 15,
            },

            // Child seat charge
            childSeatPrice: {
                type: Number,
                default: 0,
            },

            // Congestion charge (London zone)
            congestionCharge: {
                type: Number,
                default: 0,
            },

            // Airport-specific charges
            airportPickupCharge: {
                type: Number,
                default: 0,
                // Charge when PICKING UP from this airport
            },

            airportDropoffCharge: {
                type: Number,
                default: 0,
                // Charge when DROPPING OFF at this airport
            },
        },

        // ----- Display Settings -----
        displayParkingInclusive: {
            type: Boolean,
            default: true,
        },

        displayVATInclusive: {
            type: Boolean,
            default: true,
        },

        priceRoundOff: {
            type: Boolean,
            default: false,
        },

        // ----- Status -----
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

// Ensure unique pricing per airport + vehicle
airportPricingSchema.index({ airport: 1, vehicle: 1 }, { unique: true });

export const AirportPricing = mongoose.model("AirportPricing", airportPricingSchema);
