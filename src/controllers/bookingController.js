import { Booking } from "../models/booking.model.js";
import {
    sendWelcomeEmail,
    sendLeadNotificationToAdmin,
    sendBookingConfirmation,
    sendNewBookingToAdmin,
} from "../utils/emailService.js";

/**
 * Create a new booking (called when user clicks Proceed on Step 3)
 * This saves the booking as a lead and sends welcome/notification emails
 * Emails are sent asynchronously so the response is fast
 */
export const createBooking = async (req, res) => {
    try {
        const {
            // Journey info
            pickup,
            dropoff,
            pickupDate,
            pickupTime,
            serviceType,
            journeyInfo,
            // Vehicle info
            vehicleId,
            vehicleDetails,
            pricing,
            // Passenger details
            passengerDetails,
            // Guest details
            isBookingForSomeoneElse,
            guestDetails,
            // Airport pickup
            isAirportPickup,
            flightDetails,
            // Additional
            specialInstructions,
            // Payment details
            paymentStatus,
            paymentIntentId,
            // User (if logged in)
            userId,
            // Flag to skip emails (for updates)
            skipEmails,
        } = req.body;

        // Create booking with all details
        const booking = await Booking.create({
            pickup,
            dropoff,
            pickupDate,
            pickupTime,
            serviceType,
            journeyInfo,
            vehicleId,
            vehicleDetails,
            pricing,
            passengerDetails,
            isBookingForSomeoneElse,
            guestDetails: isBookingForSomeoneElse ? guestDetails : null,
            isAirportPickup,
            flightDetails: isAirportPickup ? flightDetails : null,
            specialInstructions,
            status: paymentStatus === "paid" ? "confirmed" : "pending",
            paymentStatus: paymentStatus || "pending",
            paymentIntentId,
            userId,
        });

        // Send emails only for new leads (not updates) and when emails are not skipped
        if (!skipEmails && paymentStatus !== "paid") {
            // Prepare booking data for emails
            const emailBookingData = {
                ...booking.toObject(),
                pickup: pickup,
                dropoff: dropoff,
            };

            // Send welcome email to user (async, don't wait)
            sendWelcomeEmail(emailBookingData).catch((err) => {
                console.error("Background email error (welcome):", err);
            });

            // Send lead notification to admin (async, don't wait)
            sendLeadNotificationToAdmin(emailBookingData).catch((err) => {
                console.error("Background email error (admin lead):", err);
            });
        }

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: booking,
        });
    } catch (error) {
        console.error("Error creating booking:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message,
        });
    }
};

/**
 * Get booking by ID
 */
export const getBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        res.status(200).json({
            success: true,
            data: booking,
        });
    } catch (error) {
        console.error("Error fetching booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message,
        });
    }
};

/**
 * Update booking status (for admin or after payment update)
 * Sends confirmation emails when payment status changes to 'paid'
 */
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus, paymentIntentId } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentIntentId) updateData.paymentIntentId = paymentIntentId;

        // If payment is now paid, also set status to confirmed
        if (paymentStatus === "paid" && !status) {
            updateData.status = "confirmed";
        }

        const booking = await Booking.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Send confirmation emails when payment is successful
        if (paymentStatus === "paid") {
            // Prepare booking data for emails
            const emailBookingData = booking.toObject();

            // Send booking confirmation to user (async, don't wait)
            sendBookingConfirmation(emailBookingData).catch((err) => {
                console.error("Background email error (confirmation):", err);
            });

            // Send new booking alert to admin (async, don't wait)
            sendNewBookingToAdmin(emailBookingData, { paymentIntentId }).catch((err) => {
                console.error("Background email error (admin booking):", err);
            });
        }

        res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: booking,
        });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message,
        });
    }
};

/**
 * Update booking details (when user edits from summary)
 * Sends welcome email only if email address changed
 */
export const updateBookingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            passengerDetails,
            flightDetails,
            specialInstructions,
            isBookingForSomeoneElse,
            guestDetails,
            isAirportPickup,
            originalEmail, // The original email to compare against
        } = req.body;

        // Get the existing booking to check email change
        const existingBooking = await Booking.findById(id);
        if (!existingBooking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Check if email has changed
        const newEmail = passengerDetails?.email;
        const emailChanged = originalEmail && newEmail && originalEmail !== newEmail;

        // Build update data
        const updateData = {
            passengerDetails,
            isBookingForSomeoneElse,
            guestDetails: isBookingForSomeoneElse ? guestDetails : null,
            isAirportPickup,
            flightDetails: isAirportPickup ? flightDetails : null,
            specialInstructions,
        };

        const booking = await Booking.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        // Send welcome email only to the NEW email if email changed
        if (emailChanged) {
            const emailBookingData = booking.toObject();
            sendWelcomeEmail(emailBookingData).catch((err) => {
                console.error("Background email error (email change welcome):", err);
            });
            console.log(`Email changed from ${originalEmail} to ${newEmail} - sending welcome email to new address`);
        }

        res.status(200).json({
            success: true,
            message: "Booking details updated successfully",
            data: booking,
            emailSent: emailChanged,
        });
    } catch (error) {
        console.error("Error updating booking details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking details",
            error: error.message,
        });
    }
};

/**
 * Get all bookings (for admin dashboard)
 * Supports filtering by status, paymentStatus, serviceType and pagination
 */
export const getAllBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, paymentStatus, serviceType } = req.query;

        const query = {};
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (serviceType) query.serviceType = serviceType;

        const bookings = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        // Get counts for dashboard stats
        const stats = {
            total: await Booking.countDocuments(),
            pending: await Booking.countDocuments({ status: "pending" }),
            confirmed: await Booking.countDocuments({ status: "confirmed" }),
            completed: await Booking.countDocuments({ status: "completed" }),
            cancelled: await Booking.countDocuments({ status: "cancelled" }),
        };

        res.status(200).json({
            success: true,
            data: bookings,
            stats,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message,
        });
    }
};

/**
 * Delete booking (admin only)
 */
export const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findByIdAndDelete(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete booking",
            error: error.message,
        });
    }
};

