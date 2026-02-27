import FAQ from "../models/faq.model.js";

// Get all active FAQs
export const getAllFAQs = async (req, res) => {
    try {
        const faqs = await FAQ.find({ isActive: true }).sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: faqs.length,
            faqs,
        });
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching FAQs",
            error: error.message,
        });
    }
};

// Admin functionality can be added later if needed
