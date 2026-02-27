import express from "express";
import { submitContactInquiry, submitBulkQuoteRequest } from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact        — contact us form inquiry
router.post("/", submitContactInquiry);

// POST /api/contact/quote  — bulk/corporate booking quote request
router.post("/quote", submitBulkQuoteRequest);

export default router;

