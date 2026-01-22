import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";

/**
 * Create a new admin (for Postman use only)
 */
export const createAdmin = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists",
            });
        }

        // Create new admin
        const admin = await Admin.create({
            email,
            password,
            name: name || "Admin",
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: admin,
        });
    } catch (error) {
        console.error("Error creating admin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create admin",
            error: error.message,
        });
    }
};

/**
 * Admin Login
 */
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // Find admin by email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || "jk-admin-secret-key-2026",
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message,
        });
    }
};

/**
 * Verify Admin Token
 */
export const verifyAdmin = async (req, res) => {
    try {
        // Admin is attached by auth middleware
        res.status(200).json({
            success: true,
            message: "Token is valid",
            admin: req.admin,
        });
    } catch (error) {
        console.error("Error verifying admin:", error);
        res.status(500).json({
            success: false,
            message: "Token verification failed",
            error: error.message,
        });
    }
};

/**
 * Get Dashboard Statistics
 */
export const getAdminStats = async (req, res) => {
    try {
        // Import models dynamically to avoid circular dependency
        const { Booking } = await import("../models/booking.model.js");
        const { Vehicle } = await import("../models/vehicle.model.js");

        // Get booking stats
        const totalBookings = await Booking.countDocuments();
        const pendingBookings = await Booking.countDocuments({ status: "pending" });
        const confirmedBookings = await Booking.countDocuments({ status: "confirmed" });
        const completedBookings = await Booking.countDocuments({ status: "completed" });
        const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });

        // Get payment stats
        const paidBookings = await Booking.countDocuments({ paymentStatus: "paid" });
        const failedPayments = await Booking.countDocuments({ paymentStatus: "failed" });

        // Calculate total earnings
        const earningsAggregation = await Booking.aggregate([
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, total: { $sum: "$pricing.totalPrice" } } },
        ]);
        const totalEarnings = earningsAggregation[0]?.total || 0;

        // Get vehicle count
        const totalVehicles = await Vehicle.countDocuments({ isActive: true });

        // Get recent bookings
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("pickup dropoff pickupDate pickupTime pricing.totalPrice status paymentStatus passengerDetails.firstName passengerDetails.lastName");

        res.status(200).json({
            success: true,
            data: {
                bookings: {
                    total: totalBookings,
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                },
                payments: {
                    paid: paidBookings,
                    failed: failedPayments,
                },
                totalEarnings,
                totalVehicles,
                recentBookings,
            },
        });
    } catch (error) {
        console.error("Error getting admin stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get statistics",
            error: error.message,
        });
    }
};
