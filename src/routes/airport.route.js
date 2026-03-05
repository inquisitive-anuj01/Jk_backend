/**
 * =============================================================================
 * AIRPORT ROUTES
 * =============================================================================
 *
 * API routes for airport management.
 * Public: search, get all, get single (needed for booking flow)
 * Admin:  create, update, delete
 *
 * =============================================================================
 */

import express from "express";
import {
    createAirport,
    getAllAirports,
    getAirport,
    updateAirport,
    deleteAirport,
    searchAirports,
} from "../controllers/airportController.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Search airports (must be before /:id to avoid conflict)
router.get("/search", searchAirports);

// Get all airports/locations (used in booking dropdown)
router.get("/", getAllAirports);

// Get single airport/location by ID
router.get("/:id", getAirport);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Create airport/location
router.post("/", protectAdmin, createAirport);

// Update airport/location
router.put("/:id", protectAdmin, updateAirport);

// Delete airport/location
router.delete("/:id", protectAdmin, deleteAirport);

export default router;
