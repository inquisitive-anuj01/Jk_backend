import express from "express";
import {
    createFleet,
    getAllFleet,
    getFleetBySlug,
    updateFleet,
    deleteFleet,
} from "../controllers/fleetController.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// PUBLIC ROUTES

// Get all fleet entries (paginated)
router.get("/", getAllFleet);

// Get single fleet entry by slug
router.get("/:slug", getFleetBySlug);

// ADMIN / SEO ROUTES

// Create new fleet entry (raw JSON with heroImageUrl)
router.post("/", createFleet);

// Update fleet entry (supports file upload)
router.put(
    "/:id",
    upload.fields([
        { name: "heroImage", maxCount: 1 },
        { name: "gallery", maxCount: 10 },
    ]),
    updateFleet
);

// Delete fleet entry
router.delete("/:id", deleteFleet);

export default router;
