/**
 * =============================================================================
 * AIRPORT PRICING CONTROLLER
 * =============================================================================
 * 
 * CRUD operations for managing airport-specific pricing.
 * Each pricing entry is for a specific Airport + Vehicle combination.
 * 
 * Endpoints:
 * - POST   /api/airport-pricing                    - Create pricing
 * - GET    /api/airport-pricing                    - Get all pricing
 * - GET    /api/airport-pricing/:id                - Get single pricing
 * - PUT    /api/airport-pricing/:id                - Update pricing
 * - DELETE /api/airport-pricing/:id                - Delete pricing
 * - GET    /api/airport-pricing/airport/:airportId - Get all pricing for an airport
 * - GET    /api/airport-pricing/vehicle/:vehicleId - Get all pricing for a vehicle
 * 
 * =============================================================================
 */

import { AirportPricing } from "../models/airportPricing.model.js";
import { Airport } from "../models/airport.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { TryCatch } from "../middlewares/error.js";

// -----------------------------------------------------------------------------
// CREATE AIRPORT PRICING
// -----------------------------------------------------------------------------
export const createAirportPricing = TryCatch(async (req, res, next) => {
    const {
        airport,
        vehicle,
        distanceTiers,
        afterDistanceThreshold,
        afterDistancePricePerMile,
        extras,
        displayParkingInclusive,
        displayVATInclusive,
        priceRoundOff,
    } = req.body;

    // Validate required fields
    if (!airport || !vehicle) {
        return res.status(400).json({
            success: false,
            message: "Airport and vehicle IDs are required",
        });
    }

    // Verify airport exists
    const airportDoc = await Airport.findById(airport);
    if (!airportDoc) {
        return res.status(404).json({
            success: false,
            message: "Airport not found",
        });
    }

    // Verify vehicle exists
    const vehicleDoc = await Vehicle.findById(vehicle);
    if (!vehicleDoc) {
        return res.status(404).json({
            success: false,
            message: "Vehicle not found",
        });
    }

    // Check if pricing already exists for this airport + vehicle
    const existingPricing = await AirportPricing.findOne({ airport, vehicle });
    if (existingPricing) {
        return res.status(400).json({
            success: false,
            message: `Pricing already exists for ${airportDoc.name} + ${vehicleDoc.categoryName}. Use PUT to update.`,
        });
    }

    // Create pricing
    const pricing = await AirportPricing.create({
        airport,
        vehicle,
        distanceTiers: distanceTiers || [],
        afterDistanceThreshold: afterDistanceThreshold || 50,
        afterDistancePricePerMile: afterDistancePricePerMile || 2.5,
        extras: extras || {},
        displayParkingInclusive: displayParkingInclusive ?? true,
        displayVATInclusive: displayVATInclusive ?? true,
        priceRoundOff: priceRoundOff ?? false,
        status: "active",
    });

    // Populate for response
    await pricing.populate("airport", "name iataCode");
    await pricing.populate("vehicle", "categoryName");

    res.status(201).json({
        success: true,
        message: "Airport pricing created successfully",
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// GET ALL AIRPORT PRICING
// -----------------------------------------------------------------------------
export const getAllAirportPricing = TryCatch(async (req, res, next) => {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const pricing = await AirportPricing.find(filter)
        .populate("airport", "name iataCode address")
        .populate("vehicle", "categoryName vehicleType")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: pricing.length,
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// GET SINGLE AIRPORT PRICING
// -----------------------------------------------------------------------------
export const getAirportPricing = TryCatch(async (req, res, next) => {
    const pricing = await AirportPricing.findById(req.params.id)
        .populate("airport", "name iataCode address zone")
        .populate("vehicle", "categoryName vehicleType numberOfPassengers");

    if (!pricing) {
        return res.status(404).json({
            success: false,
            message: "Airport pricing not found",
        });
    }

    res.status(200).json({
        success: true,
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// UPDATE AIRPORT PRICING
// -----------------------------------------------------------------------------
export const updateAirportPricing = TryCatch(async (req, res, next) => {
    const pricing = await AirportPricing.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
        .populate("airport", "name iataCode")
        .populate("vehicle", "categoryName");

    if (!pricing) {
        return res.status(404).json({
            success: false,
            message: "Airport pricing not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Airport pricing updated successfully",
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// DELETE AIRPORT PRICING
// -----------------------------------------------------------------------------
export const deleteAirportPricing = TryCatch(async (req, res, next) => {
    const pricing = await AirportPricing.findByIdAndDelete(req.params.id);

    if (!pricing) {
        return res.status(404).json({
            success: false,
            message: "Airport pricing not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Airport pricing deleted successfully",
    });
});

// -----------------------------------------------------------------------------
// GET ALL PRICING FOR AN AIRPORT
// -----------------------------------------------------------------------------
export const getPricingByAirport = TryCatch(async (req, res, next) => {
    const { airportId } = req.params;

    const pricing = await AirportPricing.find({
        airport: airportId,
        status: "active",
    })
        .populate("vehicle", "categoryName vehicleType numberOfPassengers numberOfBigLuggage image")
        .sort({ "vehicle.categoryName": 1 });

    res.status(200).json({
        success: true,
        count: pricing.length,
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// GET ALL PRICING FOR A VEHICLE
// -----------------------------------------------------------------------------
export const getPricingByVehicle = TryCatch(async (req, res, next) => {
    const { vehicleId } = req.params;

    const pricing = await AirportPricing.find({
        vehicle: vehicleId,
        status: "active",
    })
        .populate("airport", "name iataCode address")
        .sort({ "airport.name": 1 });

    res.status(200).json({
        success: true,
        count: pricing.length,
        data: pricing,
    });
});

// -----------------------------------------------------------------------------
// GET PRICING FOR SPECIFIC AIRPORT + VEHICLE
// -----------------------------------------------------------------------------
/**
 * Used internally by vehicleController to get airport pricing
 */
export const getAirportVehiclePricing = async (airportId, vehicleId) => {
    const pricing = await AirportPricing.findOne({
        airport: airportId,
        vehicle: vehicleId,
        status: "active",
    });

    return pricing;
};
