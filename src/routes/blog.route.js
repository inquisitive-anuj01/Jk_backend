import express from "express";
import {
    createBlog,
    getAllBlogs,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
} from "../controllers/blogController.js";
import { upload } from "../middlewares/multer.js";
import { protectAdmin } from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get all blogs (paginated)
router.get("/", getAllBlogs);

// Get blog by slug
router.get("/:slug", getBlogBySlug);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Create blog
router.post("/", protectAdmin, createBlog);

// Update blog (supports file upload)
router.put(
    "/:id",
    protectAdmin,
    upload.fields([{ name: "heroImage", maxCount: 1 }]),
    updateBlog
);

// Delete blog
router.delete("/:id", protectAdmin, deleteBlog);

export default router;
