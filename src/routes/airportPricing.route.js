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
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// These are used during booking flow to calculate fares — must stay public

// Get pricing by airport ID
router.get("/airport/:airportId", getPricingByAirport);

// Get pricing for a specific vehicle
router.get("/vehicle/:vehicleId", getPricingByVehicle);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Get all airport/location pricing (admin dashboard)
router.get("/", protectAdmin, getAllAirportPricing);

// Get single airport/location pricing by ID
router.get("/:id", protectAdmin, getAirportPricing);

// Create airport/location pricing
router.post("/", protectAdmin, createAirportPricing);

// Update airport/location pricing
router.put("/:id", protectAdmin, updateAirportPricing);

// Delete airport/location pricing
router.delete("/:id", protectAdmin, deleteAirportPricing);

export default router;
