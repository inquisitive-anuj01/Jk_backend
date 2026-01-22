import express from "express";
import {
    createBooking,
    getBooking,
    updateBookingStatus,
    getAllBookings,
} from "../controllers/bookingController.js";

const router = express.Router();

// Create new booking (after payment)
router.post("/", createBooking);

// Get all bookings (admin dashboard)
router.get("/", getAllBookings);

// Get booking by ID
router.get("/:id", getBooking);

// Update booking status (admin or payment webhook)
router.patch("/:id/status", updateBookingStatus);

export default router;
