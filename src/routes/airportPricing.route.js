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

// Get pricing by airport or vehicle (must be before /:id)
router.get("/airport/:airportId", getPricingByAirport);
router.get("/vehicle/:vehicleId", getPricingByVehicle);

// CRUD routes
router.post("/", createAirportPricing);
router.get("/", getAllAirportPricing);
router.get("/:id", getAirportPricing);
router.put("/:id", updateAirportPricing);
router.delete("/:id", deleteAirportPricing);

export default router;
