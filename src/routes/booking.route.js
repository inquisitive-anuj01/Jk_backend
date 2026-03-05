import express from "express";
import {
    createBooking,
    getBooking,
    updateBookingStatus,
    updateBookingDetails,
    getAllBookings,
    deleteBooking,
} from "../controllers/bookingController.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Create new booking (customer submits booking form — Step 3)
router.post("/", createBooking);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Get all bookings (admin dashboard)
router.get("/", protectAdmin, getAllBookings);

// Get booking by ID
router.get("/:id", protectAdmin, getBooking);

// Update booking status (admin action)
router.patch("/:id/status", protectAdmin, updateBookingStatus);

// Update booking details (admin edits)
router.put("/:id/details", protectAdmin, updateBookingDetails);

// Delete booking (admin only)
router.delete("/:id", protectAdmin, deleteBooking);

export default router;
