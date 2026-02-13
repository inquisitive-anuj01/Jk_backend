import Blog from "../models/blog.model.js";

// Create a new blog post
export const createBlog = async (req, res) => {
    try {
        const {
            title, slug, intro, excerpt, sections,
            heroImageUrl, heroImageAlt,
            author, category, tags,
            seoTitle, seoDescription,
            isActive, priority,
        } = req.body;

        const blogData = {
            title,
            intro,
            excerpt,
            heroImageUrl,
            heroImageAlt,
            author,
            category,
            seoTitle,
            seoDescription,
            isActive: isActive !== undefined ? isActive : true,
            priority: priority || 0,
        };

        if (slug) blogData.slug = slug;

        // Handle sections array
        if (sections) {
            blogData.sections = typeof sections === "string" ? JSON.parse(sections) : sections;
        }

        // Handle tags array
        if (tags) {
            blogData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
        }

        // Handle file upload for heroImage
        if (req.files?.heroImage?.[0]) {
            const file = req.files.heroImage[0];
            blogData.heroImage = {
                url: `/uploads/blogs/${file.filename}`,
                alt: heroImageAlt || title,
                filename: file.filename,
            };
        }

        const blog = await Blog.create(blogData);

        res.status(201).json({
            success: true,
            message: "Blog post created successfully",
            blog,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A blog post with this title/slug already exists",
            });
        }
        console.error("Error creating blog:", error);
        res.status(500).json({
            success: false,
            message: "Error creating blog post",
            error: error.message,
        });
    }
};

// Get all blog posts (paginated)
export const getAllBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        // Optional category filter
        if (req.query.category) {
            filter.category = req.query.category;
        }

        const [blogs, total] = await Promise.all([
            Blog.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-sections -__v"), // Don't send sections in listing
            Blog.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: blogs.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            blogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blog posts",
            error: error.message,
        });
    }
};

// Get blog post by slug
export const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({
            slug: req.params.slug,
            isActive: true,
        }).select("-__v");

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog post not found",
            });
        }

        res.status(200).json({
            success: true,
            blog,
        });
    } catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blog post",
            error: error.message,
        });
    }
};

// Update blog post
export const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog post not found",
            });
        }

        const updateData = { ...req.body };

        if (updateData.tags && typeof updateData.tags === "string") {
            updateData.tags = JSON.parse(updateData.tags);
        }
        if (updateData.sections && typeof updateData.sections === "string") {
            updateData.sections = JSON.parse(updateData.sections);
        }

        if (req.files?.heroImage?.[0]) {
            const file = req.files.heroImage[0];
            updateData.heroImage = {
                url: `/uploads/blogs/${file.filename}`,
                alt: updateData.heroImageAlt || blog.title,
                filename: file.filename,
            };
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Blog post updated successfully",
            blog: updatedBlog,
        });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({
            success: false,
            message: "Error updating blog post",
            error: error.message,
        });
    }
};

// Delete blog post
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog post not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Blog post deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting blog post",
            error: error.message,
        });
    }
};
