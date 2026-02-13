import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Event title is required"],
            trim: true,
        },
        subtitle: {
            type: String,
            trim: true,
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: [true, "Event description is required"],
            trim: true,
        },
        longDescription: {
            type: String,
            trim: true,
        },
        // Hero image (single)
        heroImage: {
            url: { type: String },
            filename: { type: String },
        },
        // External image URL fallback
        heroImageUrl: {
            type: String,
            trim: true,
        },
        // Features / highlights
        features: [
            {
                type: String,
                trim: true,
            },
        ],
        // SEO meta fields
        seoTitle: {
            type: String,
            trim: true,
        },
        seoDescription: {
            type: String,
            trim: true,
        },
        // Admin controls
        isActive: {
            type: Boolean,
            default: true,
        },
        priority: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-generate slug from title
eventSchema.pre("validate", async function () {
    if (this.title && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
});

// If heroImageUrl provided but no heroImage, use it
eventSchema.pre("save", async function () {
    if (this.heroImageUrl && (!this.heroImage || !this.heroImage.url)) {
        this.heroImage = {
            url: this.heroImageUrl,
            filename: "external",
        };
    }
});

// Indexes
eventSchema.index({ slug: 1 });
eventSchema.index({ isActive: 1, priority: 1 });

const Event = mongoose.model("Event", eventSchema);
export default Event;
