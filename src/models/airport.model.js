/**
 * =============================================================================
 * AIRPORT MODEL
 * =============================================================================
 * 
 * Stores UK airports for airport-specific pricing.
 * When a user selects an airport as pickup/dropoff, we use this to find
 * the matching airport and get its specific pricing.
 * 
 * =============================================================================
 */

import mongoose from "mongoose";

const airportSchema = new mongoose.Schema(
    {
        // ----- Basic Info -----
        name: {
            type: String,
            required: [true, "Airport name is required"],
            trim: true,
            // Example: "Heathrow Airport (LHR)"
        },

        // Full address from Google Places
        address: {
            type: String,
            required: [true, "Airport address is required"],
            // Example: "Heathrow Airport (LHR), Hounslow, UK"
        },

        // Google Place ID - used for matching user-selected addresses
        placeId: {
            type: String,
            unique: true,
            sparse: true,
            // Example: "ChIJeWH4dJJxdkgROmC1a9L2rhA"
        },

        // ----- Optional Airport Codes -----
        iataCode: {
            type: String,
            uppercase: true,
            trim: true,
            // Example: "LHR" (3-letter IATA code)
        },

        icaoCode: {
            type: String,
            uppercase: true,
            trim: true,
            // Example: "EGLL" (4-letter ICAO code)
        },

        // ----- Location -----
        coordinates: {
            lat: { type: Number },
            lng: { type: Number },
        },

        // Coverage zone (for filtering)
        zone: {
            type: String,
            default: "Entire UK Cover",
            // Example: "Entire UK Cover", "London Zone", etc.
        },

        // ----- Location Type -----
        // What kind of special location is this?
        locationType: {
            type: String,
            enum: ["airport", "stadium", "circuit", "venue", "other"],
            default: "airport",
            // Examples: Heathrow=airport, Wembley=stadium, Silverstone=circuit
        },

        // ----- Coverage Radius -----
        // How far from the center coordinates should this location be detected?
        // Admin can configure this per location
        radiusKm: {
            type: Number,
            default: 5,    // Default 5km radius
            min: 1,      // Minimum 1km
            max: 50,       // Maximum 50km
            // Examples: Heathrow=8km (all terminals), Wembley=1.5km
        },

        // ----- Status -----
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups
airportSchema.index({ placeId: 1 });
airportSchema.index({ iataCode: 1 });
airportSchema.index({ name: "text", address: "text" });

export const Airport = mongoose.model("Airport", airportSchema);
