import mongoose from "mongoose";

const fleetSchema = new mongoose.Schema(
    {
        // ----- SEO / Display Title -----
        title: {
            type: String,
            required: [true, "Fleet title is required"],
            trim: true,
            // e.g. "Mercedes E Class Chauffeur London"
        },

        subtitle: {
            type: String,
            trim: true,
            default: "",
            // e.g. "Executive Sedan"
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // ----- Descriptions -----
        description: {
            type: String,
            required: [true, "Short description is required"],
            trim: true,
            // Short description for card view
        },

        longDescription: {
            type: String,
            trim: true,
            default: "",
            // Full SEO content for detail page
        },

        // ----- Images -----
        heroImage: {
            url: { type: String, required: true },
            filename: { type: String },
        },

        gallery: [
            {
                url: { type: String },
                filename: { type: String },
            },
        ],

        // ----- Vehicle Specifications -----
        specifications: [
            {
                type: String,
                trim: true,
                // e.g. "Comfortable leather seats", "Rear climate control"
            },
        ],

        // ----- Key Features / Highlights -----
        features: [
            {
                type: String,
                trim: true,
                // e.g. "First class chauffeur", "Free 60 mins airport waiting"
            },
        ],

        // ----- Link to Vehicle (optional, for pricing) -----
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            default: null,
        },

        // ----- Capacity (can be set independently of vehicle) -----
        passengers: {
            type: Number,
            default: 0,
        },

        luggage: {
            type: Number,
            default: 0,
        },

        // ----- SEO Meta -----
        seoTitle: {
            type: String,
            trim: true,
            default: "",
        },

        seoDescription: {
            type: String,
            trim: true,
            default: "",
        },

        // ----- Admin Control -----
        isActive: {
            type: Boolean,
            default: true,
        },

        priority: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Auto-generate slug from title before validation
fleetSchema.pre("validate", function () {
    if (this.title && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
});

// Indexes
fleetSchema.index({ slug: 1 }, { unique: true });
fleetSchema.index({ isActive: 1, priority: 1 });
fleetSchema.index({ vehicleId: 1 });

export const Fleet = mongoose.model("Fleet", fleetSchema);
