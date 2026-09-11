import { Service } from "../models/service.model.js";
import { Airport } from "../models/airport.model.js";
import { deleteFile } from "../middlewares/multer.js";
import { sitemapState } from "../utils/sitemapCache.js";

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin
export const createService = async (req, res) => {
    try {
        const { title, subtitle, category, slug, description, longDescription, features, sections, faqs, script, isActive, priority, meta_title, meta_description } = req.body;

        // Build image object
        let image = {};
        if (req.file) {
            image = {
                url: `/${req.file.path.replace(/\\/g, "/")}`,
                filename: req.file.filename,
            };
        } else if (req.body.imageUrl) {
            // Allow passing an external image URL directly
            image = {
                url: req.body.imageUrl,
                filename: "",
            };
        } else {
            return res.status(400).json({
                success: false,
                message: "Service image is required (upload a file or provide imageUrl)",
            });
        }

        // Parse features if sent as JSON string
        let parsedFeatures = features;
        if (typeof features === "string") {
            try {
                parsedFeatures = JSON.parse(features);
            } catch {
                parsedFeatures = features.split(",").map((f) => f.trim());
            }
        }

        // Parse sections if sent as JSON string
        let parsedSections = sections;
        if (typeof sections === "string") {
            try {
                parsedSections = JSON.parse(sections);
            } catch {
                parsedSections = [];
            }
        }

        // Parse faqs if sent as JSON string
        let parsedFaqs = faqs;
        if (typeof faqs === "string") {
            try {
                parsedFaqs = JSON.parse(faqs);
            } catch {
                parsedFaqs = [];
            }
        }

        const service = await Service.create({
            title,
            subtitle: subtitle || "",
            category,
            slug: slug || undefined,
            description: description || "",
            longDescription: longDescription || "",
            image,
            features: parsedFeatures || [],
            sections: parsedSections || [],
            faqs: parsedFaqs || [],
            script: script || "",
            isActive: isActive !== undefined ? isActive : true,
            priority: priority ? parseInt(priority) : 0,
            meta_title: meta_title || "",
            meta_description: meta_description || "",
        });

        // Bust sitemap cache — new service appears immediately
        sitemapState.bust();

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            service,
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            deleteFile(req.file.path);
        }

        // Handle duplicate slug
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A service with this slug already exists. Please use a unique slug.",
            });
        }

        console.error("Error creating service:", error);
        res.status(500).json({
            success: false,
            message: "Error creating service",
            error: error.message,
        });
    }
};

// @desc    Get all services for admin panel (includes inactive)
// @route   GET /api/services/admin/all?page=1&limit=20&search=
// @access  Admin
export const getAllServicesAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build search filter — if ?search= is provided, apply regex across key fields
        const searchTerm = req.query.search?.trim();
        const filter = searchTerm
            ? {
                  $or: [
                      { title: { $regex: searchTerm, $options: "i" } },
                      { slug: { $regex: searchTerm, $options: "i" } },
                      { category: { $regex: searchTerm, $options: "i" } },
                      { subtitle: { $regex: searchTerm, $options: "i" } },
                  ],
              }
            : {};

        const [services, total] = await Promise.all([
            Service.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Service.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            services,
            totalPages,
            total,
            page,
        });
    } catch (error) {
        console.error("Error fetching services (admin):", error);
        res.status(500).json({
            success: false,
            message: "Error fetching services",
            error: error.message,
        });
    }
};

// @desc    Get single service by ID (admin edit form)
// @route   GET /api/services/admin/:id
// @access  Admin
export const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        res.status(200).json({
            success: true,
            service,
        });
    } catch (error) {
        console.error("Error fetching service by ID:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching service",
            error: error.message,
        });
    }
};

// @desc    Get all services (paginated)
// @route   GET /api/services?page=1&limit=10
// @access  Public
export const getAllServices = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Only show active services for public, unless ?all=true (admin)
        const filter = req.query.all === "true" ? {} : { isActive: true };

        const [services, totalServices] = await Promise.all([
            Service.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Service.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalServices / limit);

        res.status(200).json({
            success: true,
            services,
            pagination: {
                currentPage: page,
                totalPages,
                totalServices,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching services",
            error: error.message,
        });
    }
};

// @desc    Get single service by slug
// @route   GET /api/services/:slug
// @access  Public
export const getServiceBySlug = async (req, res) => {
    try {
        const service = await Service.findOne({ slug: req.params.slug, isActive: true });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        res.status(200).json({
            success: true,
            service,
        });
    } catch (error) {
        console.error("Error fetching service by slug:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching service",
            error: error.message,
        });
    }
};

// @desc    Update an existing service
// @route   PUT /api/services/:id
// @access  Admin
export const updateService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        const { title, subtitle, category, slug, description, longDescription, features, sections, faqs, script, isActive, priority, meta_title, meta_description } = req.body;

        // Update fields
        if (title) service.title = title;
        if (subtitle !== undefined) service.subtitle = subtitle;
        if (category) service.category = category;
        if (slug) service.slug = slug;
        if (description !== undefined) service.description = description;
        if (longDescription !== undefined) service.longDescription = longDescription;
        if (isActive !== undefined) service.isActive = isActive;
        if (priority !== undefined) service.priority = priority;
        if (meta_title !== undefined) service.meta_title = meta_title;
        if (meta_description !== undefined) service.meta_description = meta_description;
        if (script !== undefined) service.script = script;

        // Parse and update features
        if (features) {
            let parsedFeatures = features;
            if (typeof features === "string") {
                try {
                    parsedFeatures = JSON.parse(features);
                } catch {
                    parsedFeatures = features.split(",").map((f) => f.trim());
                }
            }
            service.features = parsedFeatures;
        }

        // Parse and update sections
        if (sections !== undefined) {
            let parsedSections = sections;
            if (typeof sections === "string") {
                try {
                    parsedSections = JSON.parse(sections);
                } catch {
                    parsedSections = [];
                }
            }
            service.sections = parsedSections;
        }

        // Parse and update faqs
        if (faqs !== undefined) {
            let parsedFaqs = faqs;
            if (typeof faqs === "string") {
                try {
                    parsedFaqs = JSON.parse(faqs);
                } catch {
                    parsedFaqs = [];
                }
            }
            service.faqs = parsedFaqs;
        }

        // Update image if new one uploaded
        if (req.file) {
            // Delete old image file if it was a local upload
            if (service.image?.filename && service.image?.url?.startsWith("/uploads")) {
                deleteFile(service.image.url.substring(1)); // remove leading /
            }
            service.image = {
                url: `/${req.file.path.replace(/\\/g, "/")}`,
                filename: req.file.filename,
            };
        } else if (req.body.imageUrl) {
            service.image = {
                url: req.body.imageUrl,
                filename: "",
            };
        }

        await service.save();

        // Bust sitemap cache — changes reflect immediately
        sitemapState.bust();

        res.status(200).json({
            success: true,
            message: "Service updated successfully",
            service,
        });
    } catch (error) {
        if (req.file) deleteFile(req.file.path);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A service with this slug already exists.",
            });
        }

        console.error("Error updating service:", error);
        res.status(500).json({
            success: false,
            message: "Error updating service",
            error: error.message,
        });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Admin
export const deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        // Delete image file if local
        if (service.image?.filename && service.image?.url?.startsWith("/uploads")) {
            deleteFile(service.image.url.substring(1));
        }

        await Service.findByIdAndDelete(req.params.id);

        // Bust sitemap cache — deleted service removed immediately
        sitemapState.bust();

        res.status(200).json({
            success: true,
            message: "Service deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting service",
            error: error.message,
        });
    }
};


export const getNavMenu = async (req, res) => {
    try {
        // Fetch active services sorted by priority
        const services = await Service.find({ isActive: true })
            .select("title slug category priority")
            .sort({ priority: 1, createdAt: -1 });

        // Fetch active airports
        const airports = await Airport.find({ isActive: true, locationType: "airport" })
            .select("name iataCode")
            .sort({ name: 1 });

        // Define category display order
        const categoryOrder = ["Business Travel", "Leisure Travel", "Airport Travel", "Chauffeur Service", "Wedding Service", "Areas"];

        // Group services by category
        const grouped = {};
        services.forEach((s) => {
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push({
                label: s.title,
                href: `/services/${s.slug}`,
            });
        });

        // Build menu structure
        const MAX_AREAS_NAV_ITEMS = 5;
        const menu = categoryOrder.map((cat) => {
            const categoryServices = grouped[cat] || [];

            // "Areas" category: cap at 5 and add a "View all" link if more exist
            if (cat === "Areas" && categoryServices.length > 1) {
                const visibleChildren = categoryServices.slice(0, MAX_AREAS_NAV_ITEMS);
                if (categoryServices.length > MAX_AREAS_NAV_ITEMS) {
                    visibleChildren.push({
                        label: `View all ${categoryServices.length} areas →`,
                        href: `/services?category=${encodeURIComponent(cat)}`,
                        isViewAll: true,
                    });
                }
                return {
                    label: cat,
                    href: `/services?category=${encodeURIComponent(cat)}`,
                    children: visibleChildren,
                };
            }

            // For all other categories with multiple services — show as sub-dropdown (no cap)
            if (categoryServices.length > 1) {
                return {
                    label: cat,
                    href: categoryServices[0].href,
                    children: categoryServices,
                };
            }

            // Single service in category — link directly
            return {
                label: cat,
                href: categoryServices.length > 0 ? categoryServices[0].href : "/services",
                children: [],
            };
        });

        res.status(200).json({
            success: true,
            menu,
        });
    } catch (error) {
        console.error("Error building nav menu:", error);
        res.status(500).json({
            success: false,
            message: "Error building nav menu",
            error: error.message,
        });
    }
};

