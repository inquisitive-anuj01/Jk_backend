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
            trim: true,
            default: "",
        },

        category: {
            type: String,
            enum: ["Business Travel", "Leisure Travel", "Airport Travel", "Chauffeur Service", "Wedding Service", "Areas"],
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
            trim: true,
            default: "",
        },

        longDescription: {
            type: String,
            trim: true,
            default: "",
        },

        // STRUCTURED CONTENT — same pattern as blog.model.js
        // Each section: heading (H2), subheading (H3), paragraph text (HTML, supports <a> links),
        // bullet list items (HTML), and an optional inline image
        sections: [
            {
                heading:    { type: String, trim: true },      // H2
                subheading: { type: String, trim: true },       // H3 (optional)
                text:       { type: String },                   // paragraph HTML (supports <a>, <b>, etc.)
                listItems:  [{ type: String }],                 // bullet points (HTML)
                image: {
                    url: { type: String },
                    alt: { type: String },
                },
                subsections: [                                // NEW: Multiple subheadings
                    {
                        subheading: { type: String, trim: true },
                        text: { type: String },
                        listItems: [{ type: String }],
                        image: {
                            url: { type: String },
                            alt: { type: String },
                        },
                    }
                ]
            },
        ],

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

        // SEO Meta
        meta_title: {
            type: String,
            trim: true,
            default: "",
        },

        meta_description: {
            type: String,
            trim: true,
            default: "",
        },

        // JSON-LD structured data (script tag content for SEO)
        script: {
            type: String,
            trim: true,
            default: "",
        },

        // FAQs — per-service FAQ items (optional)
        faqs: [
            {
                question: { type: String, trim: true },
                answer:   { type: String, trim: true },
                tag:      { type: String, trim: true, default: "FAQ" },
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
serviceSchema.index({ isActive: 1, priority: 1 });
serviceSchema.index({ priority: 1 });

export const Service = mongoose.model("Service", serviceSchema);
