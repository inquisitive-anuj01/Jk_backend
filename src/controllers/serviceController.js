import { Service } from "../models/service.model.js";
import { Airport } from "../models/airport.model.js";
import { deleteFile } from "../middlewares/multer.js";

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin
export const createService = async (req, res) => {
    try {
        const { title, subtitle, category, slug, description, longDescription, features, isActive, priority } = req.body;

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

        const service = await Service.create({
            title,
            subtitle,
            category,
            slug: slug || undefined, // let pre-validate auto-generate if not provided
            description,
            longDescription: longDescription || "",
            image,
            features: parsedFeatures || [],
            isActive: isActive !== undefined ? isActive : true,
            priority: priority || 0,
        });

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
        const service = await Service.findOne({ slug: req.params.slug });

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
        console.error("Error fetching service:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching service",
            error: error.message,
        });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Admin
export const updateService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            if (req.file) deleteFile(req.file.path);
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        const { title, subtitle, category, slug, description, longDescription, features, isActive, priority } = req.body;

        // Update fields
        if (title) service.title = title;
        if (subtitle) service.subtitle = subtitle;
        if (category) service.category = category;
        if (slug) service.slug = slug;
        if (description) service.description = description;
        if (longDescription !== undefined) service.longDescription = longDescription;
        if (isActive !== undefined) service.isActive = isActive;
        if (priority !== undefined) service.priority = priority;

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
        const categoryOrder = ["Business Travel", "Leisure Travel", "Airport Travel", "Chauffeur Service", "Wedding Service"];

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
        const menu = categoryOrder.map((cat) => {
            const categoryServices = grouped[cat] || [];

            // For "Airport Travel" — inject airports as children
            if (cat === "Airport Travel") {
                const airportChildren = airports.map((a) => ({
                    label: a.iataCode ? `${a.name}` : a.name,
                    href: `/services/airport-transfers`,
                }));

                return {
                    label: cat,
                    href: categoryServices.length > 0 ? categoryServices[0].href : "/services",
                    children: airportChildren,
                };
            }

            // For categories with multiple services — show as sub-dropdown
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

