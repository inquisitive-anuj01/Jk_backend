import Event from "../models/event.model.js";

// Create a new event
export const createEvent = async (req, res) => {
    try {
        const {
            title, subtitle, slug, description, longDescription,
            heroImageUrl, features, seoTitle, seoDescription,
            isActive, priority,
        } = req.body;

        // Build event data
        const eventData = {
            title,
            subtitle,
            description,
            longDescription,
            heroImageUrl,
            seoTitle,
            seoDescription,
            isActive: isActive !== undefined ? isActive : true,
            priority: priority || 0,
        };

        // If slug is provided, use it; otherwise auto-generated from title
        if (slug) eventData.slug = slug;

        // Handle features (can be JSON string or array)
        if (features) {
            eventData.features = typeof features === "string" ? JSON.parse(features) : features;
        }

        // Handle file upload for heroImage
        if (req.files?.heroImage?.[0]) {
            const file = req.files.heroImage[0];
            eventData.heroImage = {
                url: `/uploads/events/${file.filename}`,
                filename: file.filename,
            };
        }

        const event = await Event.create(eventData);

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            event,
        });
    } catch (error) {
        // Handle duplicate slug
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "An event with this title/slug already exists",
            });
        }
        console.error("Error creating event:", error);
        res.status(500).json({
            success: false,
            message: "Error creating event",
            error: error.message,
        });
    }
};

// Get all events
export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find({ isActive: true })
            .sort({ priority: 1, createdAt: -1 })
            .select("-__v");

        res.status(200).json({
            success: true,
            count: events.length,
            events,
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching events",
            error: error.message,
        });
    }
};

// Get event by slug
export const getEventBySlug = async (req, res) => {
    try {
        const event = await Event.findOne({
            slug: req.params.slug,
            isActive: true,
        }).select("-__v");

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        res.status(200).json({
            success: true,
            event,
        });
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching event",
            error: error.message,
        });
    }
};

// Update event
export const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const updateData = { ...req.body };

        // Handle features
        if (updateData.features && typeof updateData.features === "string") {
            updateData.features = JSON.parse(updateData.features);
        }

        // Handle file upload
        if (req.files?.heroImage?.[0]) {
            const file = req.files.heroImage[0];
            updateData.heroImage = {
                url: `/uploads/events/${file.filename}`,
                filename: file.filename,
            };
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            event: updatedEvent,
        });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({
            success: false,
            message: "Error updating event",
            error: error.message,
        });
    }
};

// Delete event
export const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting event",
            error: error.message,
        });
    }
};
