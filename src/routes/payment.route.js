import express from "express";
import {
    createPaymentIntent,
    getPaymentStatus,
} from "../controllers/paymentController.js";

const router = express.Router();

// Create payment intent
router.post("/create-intent", createPaymentIntent);

// Get payment status
router.get("/status/:paymentIntentId", getPaymentStatus);

export default router;
