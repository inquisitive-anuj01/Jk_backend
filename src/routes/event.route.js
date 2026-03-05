import express from "express";
import {
    createEvent,
    getAllEvents,
    getEventBySlug,
    updateEvent,
    deleteEvent,
} from "../controllers/eventController.js";
import { upload } from "../middlewares/multer.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get all events
router.get("/", getAllEvents);

// Get event by slug
router.get("/:slug", getEventBySlug);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Create event
router.post("/", protectAdmin, createEvent);

// Update event (supports file upload)
router.put(
    "/:id",
    protectAdmin,
    upload.fields([{ name: "heroImage", maxCount: 1 }]),
    updateEvent
);

// Delete event
router.delete("/:id", protectAdmin, deleteEvent);

export default router;
