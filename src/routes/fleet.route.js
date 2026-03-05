import express from "express";
import {
    createFleet,
    getAllFleet,
    getFleetBySlug,
    updateFleet,
    deleteFleet,
} from "../controllers/fleetController.js";
import { upload } from "../middlewares/multer.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get all fleet entries (paginated)
router.get("/", getAllFleet);

// Get single fleet entry by slug
router.get("/:slug", getFleetBySlug);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Create new fleet entry
router.post("/", protectAdmin, createFleet);

// Update fleet entry (supports file upload)
router.put(
    "/:id",
    protectAdmin,
    upload.fields([
        { name: "heroImage", maxCount: 1 },
        { name: "gallery", maxCount: 10 },
    ]),
    updateFleet
);

// Delete fleet entry
router.delete("/:id", protectAdmin, deleteFleet);

export default router;
