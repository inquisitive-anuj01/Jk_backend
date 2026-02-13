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

const router = express.Router();

// PUBLIC ROUTES

// Get nav menu structure (must be before /:slug)
router.get("/nav-menu", getNavMenu);

// Get all services (paginated)
router.get("/", getAllServices);

// Get single service by slug
router.get("/:slug", getServiceBySlug);

// ADMIN ROUTES
// TODO: Add isAuthenticated and isAdmin middleware

// Create new service
router.post("/", upload.single("image"), createService);

// Update service
router.put("/:id", upload.single("image"), updateService);

// Delete service
router.delete("/:id", deleteService);

export default router;
