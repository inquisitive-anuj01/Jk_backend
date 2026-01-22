/**
 * =============================================================================
 * AIRPORT ROUTES
 * =============================================================================
 * 
 * API routes for airport management.
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

const router = express.Router();

// Search airports (must be before /:id to avoid conflict)
router.get("/search", searchAirports);

// CRUD routes
router.post("/", createAirport);
router.get("/", getAllAirports);
router.get("/:id", getAirport);
router.put("/:id", updateAirport);
router.delete("/:id", deleteAirport);

export default router;
