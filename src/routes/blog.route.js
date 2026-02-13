import express from "express";
import {
    createBlog,
    getAllBlogs,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
} from "../controllers/blogController.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// PUBLIC ROUTES

// Get all blogs (paginated)
router.get("/", getAllBlogs);

// Get blog by slug
router.get("/:slug", getBlogBySlug);

// ADMIN ROUTES

// Create blog (raw JSON)
router.post("/", createBlog);

// Update blog (supports file upload)
router.put(
    "/:id",
    upload.fields([{ name: "heroImage", maxCount: 1 }]),
    updateBlog
);

// Delete blog
router.delete("/:id", deleteBlog);

export default router;
