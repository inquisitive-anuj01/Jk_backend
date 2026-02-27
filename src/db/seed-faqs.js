import mongoose from "mongoose";
import dotenv from "dotenv";
import FAQ from "../models/faq.model.js";
import connectDB from "../db/database.js";

dotenv.config();

const faqs = [
    {
        question: "What makes your service different from competitors?",
        answer: "We obsess over performance and simplicity. Where others stack features, we refine existing ones until they become invisible. Every interaction is benchmarked, every pixel intentional. The result is a product that feels effortless — because we did the hard work so you don't have to.",
        tag: "Philosophy",
        order: 1
    },
    {
        question: "How do you handle data privacy and GDPR compliance?",
        answer: "Data privacy is built into our architecture from day one — not bolted on as an afterthought. We are fully GDPR and CCPA compliant. Data processing agreements are available on request, and you can export or permanently delete your data at any time via the account dashboard.",
        tag: "Privacy",
        order: 2
    },
    {
        question: "What integrations do you offer out of the box?",
        answer: "We connect natively with Slack, Notion, Linear, GitHub, Figma, Jira, Salesforce, and 60+ other tools. Our Zapier and Make integrations extend this to thousands more. Custom webhooks and a REST API are available on all paid plans.",
        tag: "Integrations",
        order: 3
    },
    {
        question: "Is onboarding support included in all plans?",
        answer: "Starter plans include self-serve resources and community forum access. Pro includes two dedicated onboarding sessions with a product specialist. Enterprise clients receive a named Customer Success Manager and a bespoke 30-60-90 day success plan.",
        tag: "Support",
        order: 4
    },
    {
        question: "Can I change or cancel my plan at any time?",
        answer: "Yes — always. Upgrade, downgrade, or cancel from your account settings in seconds. No phone calls, no penalty fees, no dark patterns. If you cancel, your data stays accessible for 30 days and you receive a prorated refund for unused time.",
        tag: "Billing",
        order: 5
    },
    {
        question: "Do you offer a free trial or sandbox environment?",
        answer: "Every account starts with a 14-day free trial of our Pro plan — no credit card required. We also provide a persistent sandbox environment with synthetic data so your team can test integrations and workflows without touching production.",
        tag: "Trial",
        order: 6
    },
];

const seedFAQs = async () => {
    try {
        await connectDB();
        await FAQ.deleteMany(); // Clear existing
        await FAQ.insertMany(faqs);
        console.log("FAQs seeded successfully!");
        process.exit();
    } catch (error) {
        console.error("Error seeding FAQs:", error);
        process.exit(1);
    }
};

seedFAQs();
