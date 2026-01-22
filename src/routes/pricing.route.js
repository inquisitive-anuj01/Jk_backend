import express from "express";
import {
    setP2PPricing,
    setHourlyPricing,
    getVehiclePricing,
    getAllPricing,
    deletePricing,
} from "../controllers/pricingController.js";

const router = express.Router();

// ADMIN ROUTES 
// TODO: Add isAuthenticated and isAdmin middleware
// Get all pricing configurations 
router.get("/", getAllPricing);

// Get pricing for a specific vehicle 
router.get("/vehicle/:vehicleId", getVehiclePricing);

// Set P2P pricing for a vehicle
router.put("/vehicle/:vehicleId/p2p", setP2PPricing);

// Set Hourly pricing for a vehicle
router.put("/vehicle/:vehicleId/hourly", setHourlyPricing);

// Delete pricing configuration
router.delete("/:id", deletePricing);

export default router;
