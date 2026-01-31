import express from "express";
import {
    createBooking,
    getBooking,
    updateBookingStatus,
    updateBookingDetails,
    getAllBookings,
    deleteBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

// Create new booking (on Step 3 proceed - lead capture)
router.post("/", createBooking);

// Get all bookings (admin dashboard)
router.get("/", getAllBookings);

// Get booking by ID
router.get("/:id", getBooking);

// Update booking status (admin or payment webhook)
router.patch("/:id/status", updateBookingStatus);

// Update booking details (when user edits from summary)
router.put("/:id/details", updateBookingDetails);

// Delete booking (admin only)
router.delete("/:id", deleteBooking);

export default router;


