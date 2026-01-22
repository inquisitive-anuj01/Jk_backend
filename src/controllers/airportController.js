import { Airport } from "../models/airport.model.js";
import { TryCatch } from "../middlewares/error.js";

// -----------------------------------------------------------------------------
// CREATE AIRPORT
// -----------------------------------------------------------------------------
export const createAirport = TryCatch(async (req, res, next) => {
    const {
        name,
        address,
        placeId,
        iataCode,
        icaoCode,
        coordinates,
        zone,
    } = req.body;

    // Validate required fields
    if (!name || !address) {
        return res.status(400).json({
            success: false,
            message: "Name and address are required",
        });
    }

    // Check if airport with same placeId already exists
    if (placeId) {
        const existingAirport = await Airport.findOne({ placeId });
        if (existingAirport) {
            return res.status(400).json({
                success: false,
                message: "Airport with this Place ID already exists",
            });
        }
    }

    // Create airport
    const airport = await Airport.create({
        name,
        address,
        placeId,
        iataCode,
        icaoCode,
        coordinates,
        zone: zone || "Entire UK Cover",
        isActive: true,
    });

    res.status(201).json({
        success: true,
        message: "Airport created successfully",
        data: airport,
    });
});

// -----------------------------------------------------------------------------
// GET ALL AIRPORTS
// -----------------------------------------------------------------------------
export const getAllAirports = TryCatch(async (req, res, next) => {
    const { zone, isActive } = req.query;

    // Build filter
    const filter = {};
    if (zone) filter.zone = zone;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const airports = await Airport.find(filter).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: airports.length,
        data: airports,
    });
});

// -----------------------------------------------------------------------------
// GET SINGLE AIRPORT
// -----------------------------------------------------------------------------
export const getAirport = TryCatch(async (req, res, next) => {
    const airport = await Airport.findById(req.params.id);

    if (!airport) {
        return res.status(404).json({
            success: false,
            message: "Airport not found",
        });
    }

    res.status(200).json({
        success: true,
        data: airport,
    });
});

// -----------------------------------------------------------------------------
// UPDATE AIRPORT
// -----------------------------------------------------------------------------
export const updateAirport = TryCatch(async (req, res, next) => {
    const airport = await Airport.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!airport) {
        return res.status(404).json({
            success: false,
            message: "Airport not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Airport updated successfully",
        data: airport,
    });
});

// -----------------------------------------------------------------------------
// DELETE AIRPORT
// -----------------------------------------------------------------------------
export const deleteAirport = TryCatch(async (req, res, next) => {
    const airport = await Airport.findByIdAndDelete(req.params.id);

    if (!airport) {
        return res.status(404).json({
            success: false,
            message: "Airport not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Airport deleted successfully",
    });
});

// -----------------------------------------------------------------------------
// SEARCH AIRPORTS
// -----------------------------------------------------------------------------
export const searchAirports = TryCatch(async (req, res, next) => {
    const { q, placeId } = req.query;

    // If searching by placeId (exact match)
    if (placeId) {
        const airport = await Airport.findOne({ placeId, isActive: true });
        return res.status(200).json({
            success: true,
            found: !!airport,
            data: airport,
        });
    }

    // Search by name or address (text search)
    if (!q) {
        return res.status(400).json({
            success: false,
            message: "Search query (q) or placeId is required",
        });
    }

    // Use regex for partial matching
    const airports = await Airport.find({
        isActive: true,
        $or: [
            { name: { $regex: q, $options: "i" } },
            { address: { $regex: q, $options: "i" } },
            { iataCode: { $regex: q, $options: "i" } },
        ],
    }).limit(10);

    res.status(200).json({
        success: true,
        count: airports.length,
        data: airports,
    });
});

// -----------------------------------------------------------------------------
// FIND AIRPORT BY PLACE ID OR COORDINATES
// -----------------------------------------------------------------------------
/**
 * This is used internally to check if a user-selected address is an airport
 */
export const findAirportByPlaceIdOrCoords = async (placeId, coordinates) => {
    // Try to find by placeId first (most accurate)
    if (placeId) {
        const airport = await Airport.findOne({ placeId, isActive: true });
        if (airport) return airport;
    }

    // If no placeId match, try to find by coordinates (within ~500m)
    if (coordinates && coordinates.lat && coordinates.lng) {
        const tolerance = 0.005; // Roughly 500 meters
        const airport = await Airport.findOne({
            isActive: true,
            "coordinates.lat": {
                $gte: coordinates.lat - tolerance,
                $lte: coordinates.lat + tolerance,
            },
            "coordinates.lng": {
                $gte: coordinates.lng - tolerance,
                $lte: coordinates.lng + tolerance,
            },
        });
        if (airport) return airport;
    }

    return null;
};
