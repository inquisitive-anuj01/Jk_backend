import express from "express";
import {
    createAirportPricing,
    getAllAirportPricing,
    getAirportPricing,
    updateAirportPricing,
    deleteAirportPricing,
    getPricingByAirport,
    getPricingByVehicle,
} from "../controllers/airportPricingController.js";

const router = express.Router();

// Get pricing by airport ID
router.get("/airport/:airportId", getPricingByAirport);

// Get Pricing for a specific vehicle 
router.get("/vehicle/:vehicleId", getPricingByVehicle);

// Create Airport/Location Pricing
router.post("/", createAirportPricing);

// Get All Airport/Location Pricing
router.get("/", getAllAirportPricing);

// Get single Airport/Location Pricing by ID
router.get("/:id", getAirportPricing);

// Update Airport/Location Pricing
router.put("/:id", updateAirportPricing);

// Delete Airport/Location Pricing
router.delete("/:id", deleteAirportPricing);

export default router;
