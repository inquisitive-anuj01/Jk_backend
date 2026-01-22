import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";

/**
 * Middleware to protect admin routes
 * Verifies JWT token and attaches admin to request
 */
export const protectAdmin = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token provided",
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "jk-admin-secret-key-2026"
        );

        // Find admin by ID from token
        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Admin not found",
            });
        }

        // Attach admin to request object
        req.admin = admin;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired, please login again",
            });
        }

        res.status(401).json({
            success: false,
            message: "Not authorized",
            error: error.message,
        });
    }
};
