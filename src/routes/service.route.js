import express from "express";
import {
    createService,
    getAllServices,
    getServiceBySlug,
    updateService,
    deleteService,
    getNavMenu,
} from "../controllers/serviceController.js";
import { upload } from "../middlewares/multer.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get nav menu structure (must be before /:slug)
router.get("/nav-menu", getNavMenu);

// Get all services (paginated)
router.get("/", getAllServices);

// Get single service by slug
router.get("/:slug", getServiceBySlug);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Create new service
router.post("/", protectAdmin, upload.single("image"), createService);

// Update service
router.put("/:id", protectAdmin, upload.single("image"), updateService);

// Delete service
router.delete("/:id", protectAdmin, deleteService);

export default router;
