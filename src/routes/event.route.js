import express from "express";
import {
    createEvent,
    getAllEvents,
    getEventBySlug,
    updateEvent,
    deleteEvent,
} from "../controllers/eventController.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// PUBLIC ROUTES

// Get all events
router.get("/", getAllEvents);

// Get event by slug
router.get("/:slug", getEventBySlug);

// ADMIN ROUTES

// Create event (raw JSON)
router.post("/", createEvent);

// Update event (supports file upload)
router.put(
    "/:id",
    upload.fields([{ name: "heroImage", maxCount: 1 }]),
    updateEvent
);

// Delete event
router.delete("/:id", deleteEvent);

export default router;
