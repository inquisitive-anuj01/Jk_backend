import express from "express";
import {
    createAdmin,
    loginAdmin,
    verifyAdmin,
    getAdminStats,
} from "../controllers/adminController.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// Public routes
router.post("/create", createAdmin); // For Postman use only

// Admin login
router.post("/login", loginAdmin);

// Protected routes (require valid JWT token)
router.get("/verify", protectAdmin, verifyAdmin);
router.get("/stats", protectAdmin, getAdminStats);

export default router;
