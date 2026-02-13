import { Fleet } from "../models/fleet.model.js";
import { Pricing } from "../models/pricing.model.js";
import { deleteFile } from "../middlewares/multer.js";

// @desc    Create a new fleet entry
// @route   POST /api/fleet
export const createFleet = async (req, res) => {
    try {
        const {
            title, subtitle, slug, description, longDescription,
            specifications, features, vehicleId,
            passengers, luggage, seoTitle, seoDescription,
            isActive, priority,
        } = req.body;

        // Build hero image
        let heroImage = {};
        if (req.files?.heroImage?.[0]) {
            heroImage = {
                url: `/${req.files.heroImage[0].path.replace(/\\/g, "/")}`,
                filename: req.files.heroImage[0].filename,
            };
        } else if (req.body.heroImageUrl) {
            heroImage = { url: req.body.heroImageUrl, filename: "" };
        } else {
            return res.status(400).json({
                success: false,
                message: "Hero image is required (upload a file or provide heroImageUrl)",
            });
        }

        // Build gallery
        let gallery = [];
        if (req.files?.gallery) {
            gallery = req.files.gallery.map((f) => ({
                url: `/${f.path.replace(/\\/g, "/")}`,
                filename: f.filename,
            }));
        }
        if (req.body.galleryUrls) {
            try {
                const urls = JSON.parse(req.body.galleryUrls);
                gallery = [...gallery, ...urls.map((u) => ({ url: u, filename: "" }))];
            } catch { }
        }

        // Parse arrays
        const parseArray = (val) => {
            if (!val) return [];
            if (typeof val === "string") {
                try { return JSON.parse(val); } catch { return val.split(",").map((s) => s.trim()); }
            }
            return val;
        };

        const fleet = await Fleet.create({
            title,
            subtitle: subtitle || "",
            slug: slug || undefined,
            description,
            longDescription: longDescription || "",
            heroImage,
            gallery,
            specifications: parseArray(specifications),
            features: parseArray(features),
            vehicleId: vehicleId || null,
            passengers: parseInt(passengers) || 0,
            luggage: parseInt(luggage) || 0,
            seoTitle: seoTitle || "",
            seoDescription: seoDescription || "",
            isActive: isActive !== undefined ? isActive : true,
            priority: parseInt(priority) || 0,
        });

        res.status(201).json({ success: true, message: "Fleet entry created", fleet });
    } catch (error) {
        // Clean up uploaded files on error
        if (req.files?.heroImage?.[0]) deleteFile(req.files.heroImage[0].path);
        if (req.files?.gallery) req.files.gallery.forEach((f) => deleteFile(f.path));

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A fleet entry with this slug already exists.",
            });
        }

        console.error("Error creating fleet:", error);
        res.status(500).json({ success: false, message: "Error creating fleet", error: error.message });
    }
};

// @desc    Get all fleet entries (paginated, with base price)
// @route   GET /api/fleet?page=1&limit=9
export const getAllFleet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const filter = req.query.all === "true" ? {} : { isActive: true };

        const [fleetItems, totalItems] = await Promise.all([
            Fleet.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Fleet.countDocuments(filter),
        ]);

        // Fetch P2P pricing for vehicles that have a vehicleId
        const vehicleIds = fleetItems
            .filter((f) => f.vehicleId)
            .map((f) => f.vehicleId);

        let pricingMap = {};
        if (vehicleIds.length > 0) {
            const pricings = await Pricing.find({
                vehicle: { $in: vehicleIds },
                pricingType: "p2p",
                status: "active",
            });

            pricings.forEach((p) => {
                if (p.pointToPoint?.distanceTiers?.length > 0) {
                    const firstTier = p.pointToPoint.distanceTiers[0];
                    if (firstTier.type === "fixed") {
                        pricingMap[p.vehicle.toString()] = firstTier.price;
                    }
                }
            });
        }

        // Attach base price to each fleet item
        const fleetWithPricing = fleetItems.map((f) => {
            const obj = f.toObject();
            obj.basePrice = f.vehicleId ? pricingMap[f.vehicleId.toString()] || null : null;
            return obj;
        });

        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            fleet: fleetWithPricing,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error("Error fetching fleet:", error);
        res.status(500).json({ success: false, message: "Error fetching fleet", error: error.message });
    }
};

// @desc    Get single fleet by slug (with pricing)
// @route   GET /api/fleet/:slug
export const getFleetBySlug = async (req, res) => {
    try {
        const fleet = await Fleet.findOne({ slug: req.params.slug });

        if (!fleet) {
            return res.status(404).json({ success: false, message: "Fleet entry not found" });
        }

        // Get base price if linked to a vehicle
        let basePrice = null;
        if (fleet.vehicleId) {
            const pricing = await Pricing.findOne({
                vehicle: fleet.vehicleId,
                pricingType: "p2p",
                status: "active",
            });
            if (pricing?.pointToPoint?.distanceTiers?.length > 0) {
                const firstTier = pricing.pointToPoint.distanceTiers[0];
                if (firstTier.type === "fixed") basePrice = firstTier.price;
            }
        }

        const result = fleet.toObject();
        result.basePrice = basePrice;

        res.status(200).json({ success: true, fleet: result });
    } catch (error) {
        console.error("Error fetching fleet:", error);
        res.status(500).json({ success: false, message: "Error fetching fleet", error: error.message });
    }
};

// @desc    Update a fleet entry
// @route   PUT /api/fleet/:id
export const updateFleet = async (req, res) => {
    try {
        const fleet = await Fleet.findById(req.params.id);
        if (!fleet) {
            if (req.files?.heroImage?.[0]) deleteFile(req.files.heroImage[0].path);
            if (req.files?.gallery) req.files.gallery.forEach((f) => deleteFile(f.path));
            return res.status(404).json({ success: false, message: "Fleet entry not found" });
        }

        const {
            title, subtitle, slug, description, longDescription,
            specifications, features, vehicleId,
            passengers, luggage, seoTitle, seoDescription,
            isActive, priority,
        } = req.body;

        if (title) fleet.title = title;
        if (subtitle !== undefined) fleet.subtitle = subtitle;
        if (slug) fleet.slug = slug;
        if (description) fleet.description = description;
        if (longDescription !== undefined) fleet.longDescription = longDescription;
        if (vehicleId !== undefined) fleet.vehicleId = vehicleId || null;
        if (passengers !== undefined) fleet.passengers = parseInt(passengers);
        if (luggage !== undefined) fleet.luggage = parseInt(luggage);
        if (seoTitle !== undefined) fleet.seoTitle = seoTitle;
        if (seoDescription !== undefined) fleet.seoDescription = seoDescription;
        if (isActive !== undefined) fleet.isActive = isActive;
        if (priority !== undefined) fleet.priority = parseInt(priority);

        // Parse arrays
        const parseArray = (val) => {
            if (!val) return null;
            if (typeof val === "string") {
                try { return JSON.parse(val); } catch { return val.split(",").map((s) => s.trim()); }
            }
            return val;
        };

        if (specifications) fleet.specifications = parseArray(specifications);
        if (features) fleet.features = parseArray(features);

        // Update hero image
        if (req.files?.heroImage?.[0]) {
            if (fleet.heroImage?.filename && fleet.heroImage?.url?.startsWith("/uploads")) {
                deleteFile(fleet.heroImage.url.substring(1));
            }
            fleet.heroImage = {
                url: `/${req.files.heroImage[0].path.replace(/\\/g, "/")}`,
                filename: req.files.heroImage[0].filename,
            };
        } else if (req.body.heroImageUrl) {
            fleet.heroImage = { url: req.body.heroImageUrl, filename: "" };
        }

        // Update gallery
        if (req.files?.gallery) {
            const newGallery = req.files.gallery.map((f) => ({
                url: `/${f.path.replace(/\\/g, "/")}`,
                filename: f.filename,
            }));
            fleet.gallery = [...fleet.gallery, ...newGallery];
        }

        await fleet.save();
        res.status(200).json({ success: true, message: "Fleet entry updated", fleet });
    } catch (error) {
        if (req.files?.heroImage?.[0]) deleteFile(req.files.heroImage[0].path);
        if (req.files?.gallery) req.files.gallery.forEach((f) => deleteFile(f.path));

        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "A fleet entry with this slug already exists." });
        }

        console.error("Error updating fleet:", error);
        res.status(500).json({ success: false, message: "Error updating fleet", error: error.message });
    }
};

// @desc    Delete a fleet entry
// @route   DELETE /api/fleet/:id
export const deleteFleet = async (req, res) => {
    try {
        const fleet = await Fleet.findById(req.params.id);
        if (!fleet) {
            return res.status(404).json({ success: false, message: "Fleet entry not found" });
        }

        // Delete images
        if (fleet.heroImage?.filename && fleet.heroImage?.url?.startsWith("/uploads")) {
            deleteFile(fleet.heroImage.url.substring(1));
        }
        fleet.gallery.forEach((img) => {
            if (img.filename && img.url?.startsWith("/uploads")) {
                deleteFile(img.url.substring(1));
            }
        });

        await Fleet.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Fleet entry deleted" });
    } catch (error) {
        console.error("Error deleting fleet:", error);
        res.status(500).json({ success: false, message: "Error deleting fleet", error: error.message });
    }
};
