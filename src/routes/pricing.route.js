import express from "express";
import {
    setP2PPricing,
    setHourlyPricing,
    getVehiclePricing,
    getAllPricing,
    deletePricing,
} from "../controllers/pricingController.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── ALL ADMIN ROUTES (pricing is purely internal) ───────────────────────────

// Get all pricing configurations
router.get("/", protectAdmin, getAllPricing);

// Get pricing for a specific vehicle
router.get("/vehicle/:vehicleId", protectAdmin, getVehiclePricing);

// Set P2P pricing for a vehicle
router.put("/vehicle/:vehicleId/p2p", protectAdmin, setP2PPricing);

// Set Hourly pricing for a vehicle
router.put("/vehicle/:vehicleId/hourly", protectAdmin, setHourlyPricing);

// Delete pricing configuration
router.delete("/:id", protectAdmin, deletePricing);

export default router;
