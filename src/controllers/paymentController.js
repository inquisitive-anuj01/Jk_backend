import Stripe from "stripe";

// Initialize Stripe lazily (only when first called, after dotenv is loaded)
let stripe = null;
const getStripe = () => {
    if (!stripe) {
        stripe = new Stripe(process.env.STRIPE_SECRET_TEST_KEY);
    }
    return stripe;
};

/**
 * Create a PaymentIntent for the booking
 * This is called when user clicks "Proceed to Payment"
 */
export const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = "gbp", bookingData } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount",
            });
        }

        // Create PaymentIntent
        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in smallest currency unit (pence)
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                // Store booking info in metadata for reference
                pickup: bookingData?.pickup?.address || "",
                dropoff: bookingData?.dropoff?.address || "",
                customerEmail: bookingData?.passengerDetails?.email || "",
                customerName: `${bookingData?.passengerDetails?.firstName || ""} ${bookingData?.passengerDetails?.lastName || ""}`,
            },
        });

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment intent",
            error: error.message,
        });
    }
};

/**
 * Get payment status by PaymentIntent ID
 */
export const getPaymentStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

        res.status(200).json({
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
        });
    } catch (error) {
        console.error("Error getting payment status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get payment status",
            error: error.message,
        });
    }
};
