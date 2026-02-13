import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
    {
        // Main title — renders as H1
        title: {
            type: String,
            required: [true, "Blog title is required"],
            trim: true,
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
        },
        // Introduction text — renders before the first section
        intro: {
            type: String,
            trim: true,
        },
        // Short excerpt for blog listing cards
        excerpt: {
            type: String,
            trim: true,
        },
        // STRUCTURED CONTENT — array of sections
        // Each section has a heading (H2), text (paragraphs), and optional list items
        sections: [
            {
                heading: { type: String, trim: true },       // H2 heading
                subheading: { type: String, trim: true },     // H3 subheading (optional)
                text: { type: String },                       // paragraph text (can include <a> tags for internal links later)
                listItems: [{ type: String }],                // bullet points (optional)
                image: {                                       // inline image for this section (optional)
                    url: { type: String },
                    alt: { type: String },
                },
            },
        ],
        // Hero / featured image
        heroImage: {
            url: { type: String },
            alt: { type: String },
            filename: { type: String },
        },
        heroImageUrl: {
            type: String,
            trim: true,
        },
        heroImageAlt: {
            type: String,
            trim: true,
        },
        // Author
        author: {
            type: String,
            trim: true,
            default: "JK Executive Chauffeurs",
        },
        // Category / tags
        category: {
            type: String,
            trim: true,
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
        // SEO
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
blogSchema.pre("validate", async function () {
    if (this.title && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
});

// If heroImageUrl provided but no heroImage, use it
blogSchema.pre("save", async function () {
    if (this.heroImageUrl && (!this.heroImage || !this.heroImage.url)) {
        this.heroImage = {
            url: this.heroImageUrl,
            alt: this.heroImageAlt || this.title,
            filename: "external",
        };
    }
});

// Indexes
blogSchema.index({ slug: 1 });
blogSchema.index({ isActive: 1, priority: 1, createdAt: -1 });
blogSchema.index({ category: 1 });

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
