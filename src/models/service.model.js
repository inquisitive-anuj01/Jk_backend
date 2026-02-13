import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Service title is required"],
            trim: true,
        },

        subtitle: {
            type: String,
            required: [true, "Service subtitle is required"],
            trim: true,
        },

        category: {
            type: String,
            enum: ["Business Travel", "Leisure Travel", "Airport Travel", "Chauffeur Service", "Wedding Service"],
            required: [true, "Service category is required"],
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        description: {
            type: String,
            required: [true, "Service description is required"],
            trim: true,
        },

        longDescription: {
            type: String,
            trim: true,
            default: "",
        },

        // Service Image
        image: {
            url: { type: String, required: true },
            filename: { type: String },
        },

        // Key highlights / bullet points
        features: [
            {
                type: String,
                trim: true,
            },
        ],

        // Admin control
        isActive: {
            type: Boolean,
            default: true,
        },

        // Display ordering (lower = first)
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
serviceSchema.pre("validate", function () {
    if (this.title && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
});

// Indexes
serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ isActive: 1, priority: 1 });
serviceSchema.index({ priority: 1 });

export const Service = mongoose.model("Service", serviceSchema);
