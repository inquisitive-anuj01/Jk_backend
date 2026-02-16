import Stripe from "stripe";

//  payments from these origins will use test keys
const TEST_MODE_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
    "https://localhost",
    "https://127.0.0.1",
    "https://jk-frontend-nine.vercel.app"
];

// Check if an origin should use test mode
const isTestModeOrigin = (origin) => {
    if (!origin) return false;
    return TEST_MODE_ORIGINS.some(testOrigin =>
        origin.startsWith(testOrigin)
    );
};

// Get Stripe instance based on mode
const getStripe = (isTestMode) => {
    const secretKey = isTestMode
        ? process.env.STRIPE_SECRET_TEST_KEY
        : process.env.STRIPE_SECRET_LIVE_KEY;

    if (!secretKey) {
        throw new Error(`${isTestMode ? 'STRIPE_SECRET_TEST_KEY' : 'STRIPE_SECRET_LIVE_KEY'} is not configured in .env file`);
    }

    return new Stripe(secretKey);
};

// Create a PaymentIntent for the booking

export const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = "gbp", bookingData, origin } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount",
            });
        }

        // Determine if this is test mode based on origin
        const isTestMode = isTestModeOrigin(origin);
        const stripe = getStripe(isTestMode);

        console.log(`Payment mode: ${isTestMode ? 'TEST' : 'LIVE'} | Origin: ${origin}`);

        // Extract passenger and booking details
        const passengerDetails = bookingData?.passengerDetails || {};
        const pricing = bookingData?.pricing || {};
        const vehicleDetails = bookingData?.selectedVehicle || {};

        // Build customer name
        const customerName = `${passengerDetails.firstName || ''} ${passengerDetails.lastName || ''}`.trim();
        const customerEmail = passengerDetails.email || '';
        const customerPhone = `${passengerDetails.countryCode || ''}${passengerDetails.phone || ''}`.trim();

        // Create or retrieve Stripe Customer with full details
        let customer = null;
        if (customerEmail) {
            try {
                // Map country code to country name for Stripe
                const countryCodeMap = {
                    '+44': 'GB', '+1': 'US', '+91': 'IN', '+33': 'FR', '+49': 'DE',
                    '+39': 'IT', '+34': 'ES', '+31': 'NL', '+353': 'IE', '+61': 'AU',
                    '+971': 'AE', '+966': 'SA', '+86': 'CN', '+81': 'JP', '+82': 'KR',
                    '+65': 'SG', '+92': 'PK', '+880': 'BD', '+27': 'ZA', '+234': 'NG'
                };
                const customerCountry = countryCodeMap[passengerDetails.countryCode] || 'GB';

                // Search for existing customer by email
                const existingCustomers = await stripe.customers.list({
                    email: customerEmail,
                    limit: 1,
                });

                const customerData = {
                    name: customerName,
                    phone: customerPhone,
                    address: {
                        country: customerCountry,
                        city: '', // Not collected in form
                        line1: bookingData?.pickup?.address || bookingData?.pickup || '',
                    },
                    metadata: {
                        firstName: passengerDetails.firstName || '',
                        lastName: passengerDetails.lastName || '',
                        numberOfPassengers: String(passengerDetails.numberOfPassengers || 1),
                        numberOfSuitcases: String(passengerDetails.numberOfSuitcases || 0),
                    },
                };

                if (existingCustomers.data.length > 0) {
                    // Update existing customer
                    customer = await stripe.customers.update(existingCustomers.data[0].id, customerData);
                } else {
                    // Create new customer
                    customer = await stripe.customers.create({
                        email: customerEmail,
                        ...customerData,
                    });
                }
            } catch (customerError) {
                console.error("Error creating/updating Stripe customer:", customerError);
                // Continue without customer - payment will still work
            }
        }

        // Build comprehensive metadata for Stripe dashboard
        const metadata = {
            // Customer Information
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            number_of_passengers: String(passengerDetails.numberOfPassengers || 1),
            number_of_suitcases: String(passengerDetails.numberOfSuitcases || 0),

            // Journey Details
            pickup_address: bookingData?.pickup?.address || bookingData?.pickup || '',
            dropoff_address: bookingData?.dropoff?.address || bookingData?.dropoff || '',
            pickup_date: bookingData?.pickupDate || '',
            pickup_time: bookingData?.pickupTime || '',
            service_type: bookingData?.serviceType || 'oneway',

            // Vehicle Details
            vehicle_name: vehicleDetails.categoryName || '',
            vehicle_details: vehicleDetails.categoryDetails || '',
            vehicle_passengers: String(vehicleDetails.numberOfPassengers || ''),
            vehicle_luggage: String(vehicleDetails.numberOfBigLuggage || ''),

            // Pricing Breakdown
            base_price: String(pricing.basePrice || 0),
            airport_charges: String(pricing.airportCharges || 0),
            congestion_charge: String(pricing.congestionCharge || 0),
            vat_rate: String(pricing.vatRate || 20),
            tax_amount: String(pricing.tax || 0),
            total_price: String(pricing.totalPrice || amount),

            // Flight Details (if airport pickup)
            is_airport_pickup: String(bookingData?.isAirportPickup || false),
            flight_number: bookingData?.flightDetails?.flightNumber || '',
            name_board: bookingData?.flightDetails?.nameBoard || '',

            // Guest Details (if booking for someone else)
            is_booking_for_guest: String(bookingData?.isBookingForSomeoneElse || false),
            guest_name: bookingData?.guestDetails ?
                `${bookingData.guestDetails.firstName || ''} ${bookingData.guestDetails.lastName || ''}`.trim() : '',
            guest_phone: bookingData?.guestDetails ?
                `${bookingData.guestDetails.countryCode || ''}${bookingData.guestDetails.phone || ''}`.trim() : '',

            // Special Instructions
            special_instructions: bookingData?.specialInstructions || '',

            // Mode indicator
            payment_mode: isTestMode ? 'TEST' : 'LIVE',
        };

        // Remove empty metadata fields (Stripe has 500 char limit per field)
        Object.keys(metadata).forEach(key => {
            if (!metadata[key] || metadata[key] === 'undefined') {
                delete metadata[key];
            }
            // Truncate long values
            if (metadata[key] && metadata[key].length > 450) {
                metadata[key] = metadata[key].substring(0, 450) + '...';
            }
        });

        // Payment Intent options
        const paymentIntentOptions = {
            amount: Math.round(amount * 100), // Stripe expects amount in smallest currency unit 
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata,
            description: `Booking: ${bookingData?.pickup?.address || bookingData?.pickup || 'Pickup'} → ${bookingData?.dropoff?.address || bookingData?.dropoff || 'Dropoff'}`,
            receipt_email: customerEmail || undefined,
        };

        // Add customer if created
        if (customer) {
            paymentIntentOptions.customer = customer.id;
        }

        // For LIVE mode, require 3D Secure authentication for card payments
        if (!isTestMode) {
            paymentIntentOptions.payment_method_options = {
                card: {
                    request_three_d_secure: 'any', // Request 3DS for all cards that support it
                },
            };
        }

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            isTestMode, // Tell frontend which mode we're in
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
        const { origin } = req.query;

        // Use same mode detection for status check
        const isTestMode = isTestModeOrigin(origin);
        const stripe = getStripe(isTestMode);

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.status(200).json({
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            isTestMode,
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
