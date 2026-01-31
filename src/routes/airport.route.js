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
// Create Airport/location
router.post("/", createAirport);

// Get All Airports/locations
router.get("/", getAllAirports);

// Get single Airport/location by ID
router.get("/:id", getAirport);

// Update Airport/location
router.put("/:id", updateAirport);

// Delete Airport/location
router.delete("/:id", deleteAirport);

export default router;
