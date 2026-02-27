import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, "Question is required"],
            trim: true,
        },
        answer: {
            type: String,
            required: [true, "Answer is required"],
        },
        tag: {
            type: String,
            trim: true,
            default: "General",
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
faqSchema.index({ isActive: 1, order: 1 });

const FAQ = mongoose.model("FAQ", faqSchema);

export default FAQ;
