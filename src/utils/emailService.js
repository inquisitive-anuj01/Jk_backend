import nodemailer from "nodemailer";

/**
 * Email Service for JK Executive Car Booking
 * Handles all email notifications using Nodemailer
 */

// Create reusable transporter using Gmail SMTP with App Password
const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
};

// Format date for display in emails
const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Format currency
const formatCurrency = (amount) => {
    return `£${(amount || 0).toFixed(2)}`;
};

// Common email styles
const emailStyles = `
    body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        line-height: 1.6; 
        color: #333; 
        margin: 0; 
        padding: 0;
        background-color: #f5f5f5;
    }
    .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
        background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
        color: white; 
        padding: 30px 20px;
        text-align: center;
    }
    .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: 1px;
    }
    .header .tagline {
        margin: 10px 0 0;
        font-size: 14px;
        opacity: 0.9;
        letter-spacing: 2px;
        text-transform: uppercase;
    }
    .content { 
        padding: 30px 25px;
    }
    .greeting {
        font-size: 18px;
        color: #1e3a5f;
        margin-bottom: 20px;
    }
    .section { 
        background: #f8fafc;
        border-radius: 10px;
        padding: 20px;
        margin: 20px 0;
        border-left: 4px solid #3182ce;
    }
    .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #3182ce;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 15px;
    }
    .detail-row {
        display: flex;
        margin-bottom: 10px;
        font-size: 14px;
    }
    .detail-label {
        color: #718096;
        min-width: 140px;
    }
    .detail-value {
        color: #2d3748;
        font-weight: 500;
    }
    .price-box {
        background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
        color: white;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        margin: 20px 0;
    }
    .price-label {
        font-size: 14px;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .price-value {
        font-size: 36px;
        font-weight: 700;
        margin: 5px 0;
    }
    .booking-ref {
        background: #ebf8ff;
        border: 2px dashed #3182ce;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        margin: 20px 0;
    }
    .booking-ref-label {
        font-size: 12px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .booking-ref-value {
        font-size: 24px;
        font-weight: 700;
        color: #2c5282;
        letter-spacing: 2px;
    }
    .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 14px 30px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        text-align: center;
        margin: 20px 0;
    }
    .footer {
        background: #f8fafc;
        padding: 25px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
    }
    .footer-text {
        font-size: 13px;
        color: #718096;
        margin: 5px 0;
    }
    .contact-info {
        margin-top: 15px;
        font-size: 13px;
        color: #4a5568;
    }
    .status-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .status-pending {
        background: #fef3c7;
        color: #92400e;
    }
    .status-confirmed {
        background: #d1fae5;
        color: #065f46;
    }
    .status-paid {
        background: #d1fae5;
        color: #065f46;
    }
    .admin-alert {
        background: #fef2f2;
        border-left-color: #ef4444;
    }
    .highlight-box {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    td {
        padding: 8px 0;
        vertical-align: top;
    }
`;

/**
 * Send Welcome Email to User (when they click Proceed on Step 3)
 */
export const sendWelcomeEmail = async (bookingData) => {
    const transporter = createTransporter();
    const passenger = bookingData.passengerDetails || {};
    const isHourly = bookingData.serviceType === "hourly";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to JK Executive</title>
        <style>${emailStyles}</style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>JK EXECUTIVE</h1>
                <p class="tagline">Premium Chauffeur Services</p>
            </div>
            
            <div class="content">
                <p class="greeting">Dear ${passenger.firstName || "Valued Customer"},</p>
                
                <p>Thank you for choosing <strong>JK Executive</strong> for your journey! We're delighted to have you on board.</p>
                
                <p>Your booking details are being processed. Please complete your payment to confirm your reservation.</p>
                
                <div class="section">
                    <div class="section-title">📍 Journey Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Pickup Location:</td>
                            <td class="detail-value">${bookingData.pickup?.address || bookingData.pickup || "—"}</td>
                        </tr>
                        ${!isHourly ? `
                        <tr>
                            <td class="detail-label">Dropoff Location:</td>
                            <td class="detail-value">${bookingData.dropoff?.address || bookingData.dropoff || "—"}</td>
                        </tr>
                        ` : `
                        <tr>
                            <td class="detail-label">Service Type:</td>
                            <td class="detail-value">Hourly Booking (${bookingData.journeyInfo?.hours || bookingData.hours || 2} hours)</td>
                        </tr>
                        `}
                        <tr>
                            <td class="detail-label">Date:</td>
                            <td class="detail-value">${formatDate(bookingData.pickupDate)}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Time:</td>
                            <td class="detail-value">${bookingData.pickupTime || "—"}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">🚗 Selected Vehicle</div>
                    <table>
                        <tr>
                            <td class="detail-label">Vehicle:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryName || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Category:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryDetails || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passengers:</td>
                            <td class="detail-value">${passenger.numberOfPassengers || 1}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Luggage:</td>
                            <td class="detail-value">${passenger.numberOfSuitcases || 0} suitcase(s)</td>
                        </tr>
                    </table>
                </div>
                
                <div class="price-box">
                    <div class="price-label">Estimated Total</div>
                    <div class="price-value">${formatCurrency(bookingData.pricing?.totalPrice)}</div>
                </div>
                
                <div class="highlight-box">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>💳 Next Step:</strong> Complete your booking by proceeding to payment. Your journey will be confirmed once payment is received.
                    </p>
                </div>
                
                ${bookingData.isAirportPickup && bookingData.flightDetails?.flightNumber ? `
                <div class="section">
                    <div class="section-title">✈️ Flight Information</div>
                    <p style="margin: 0; font-size: 14px;">
                        Flight <strong>${bookingData.flightDetails.flightNumber}</strong> - We will monitor your flight and adjust pickup time if there are any delays.
                    </p>
                </div>
                ` : ""}
            </div>
            
            <div class="footer">
                <p class="footer-text">Questions? We're here to help!</p>
                <div class="contact-info">
                    <strong>JK Executive</strong><br>
                    📞 Call us: +44 XXX XXX XXXX<br>
                    ✉️ Email: info@jkexecutive.co.uk
                </div>
                <p class="footer-text" style="margin-top: 20px; font-size: 11px; color: #a0aec0;">
                    This email was sent to ${passenger.email}. If you did not make this booking, please ignore this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive" <${process.env.EMAIL_USER}>`,
        to: passenger.email,
        subject: `Welcome to JK Executive - Your Journey Awaits! 🚗`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to: ${passenger.email}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("❌ Failed to send welcome email:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send Lead Notification to Admin (when new lead is captured)
 */
export const sendLeadNotificationToAdmin = async (bookingData) => {
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const passenger = bookingData.passengerDetails || {};
    const isHourly = bookingData.serviceType === "hourly";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Lead - JK Executive</title>
        <style>${emailStyles}</style>
    </head>
    <body>
        <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <h1>📋 NEW LEAD RECEIVED</h1>
                <p class="tagline">Action Required - Pending Payment</p>
            </div>
            
            <div class="content">
                <p style="font-size: 16px; color: #374151;">
                    A new booking inquiry has been received. Customer is at the payment stage.
                </p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <span class="status-badge status-pending">⏳ Pending Payment</span>
                </div>
                
                <div class="section admin-alert" style="border-left-color: #f59e0b;">
                    <div class="section-title" style="color: #d97706;">👤 Customer Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Name:</td>
                            <td class="detail-value">${passenger.firstName || ""} ${passenger.lastName || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Email:</td>
                            <td class="detail-value"><a href="mailto:${passenger.email}">${passenger.email || "—"}</a></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Phone:</td>
                            <td class="detail-value"><a href="tel:${passenger.countryCode}${passenger.phone}">${passenger.countryCode || ""} ${passenger.phone || "—"}</a></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passengers:</td>
                            <td class="detail-value">${passenger.numberOfPassengers || 1}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Luggage:</td>
                            <td class="detail-value">${passenger.numberOfSuitcases || 0} suitcase(s)</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">📍 Journey Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Pickup:</td>
                            <td class="detail-value">${bookingData.pickup?.address || bookingData.pickup || "—"}</td>
                        </tr>
                        ${!isHourly ? `
                        <tr>
                            <td class="detail-label">Dropoff:</td>
                            <td class="detail-value">${bookingData.dropoff?.address || bookingData.dropoff || "—"}</td>
                        </tr>
                        ` : `
                        <tr>
                            <td class="detail-label">Service:</td>
                            <td class="detail-value">Hourly Booking (${bookingData.journeyInfo?.hours || bookingData.hours || 2} hours)</td>
                        </tr>
                        `}
                        <tr>
                            <td class="detail-label">Date:</td>
                            <td class="detail-value">${formatDate(bookingData.pickupDate)}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Time:</td>
                            <td class="detail-value">${bookingData.pickupTime || "—"}</td>
                        </tr>
                        ${bookingData.journeyInfo?.distanceMiles ? `
                        <tr>
                            <td class="detail-label">Distance:</td>
                            <td class="detail-value">${bookingData.journeyInfo.distanceMiles.toFixed(1)} miles</td>
                        </tr>
                        ` : ""}
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">🚗 Vehicle Selected</div>
                    <table>
                        <tr>
                            <td class="detail-label">Vehicle:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryName || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Category:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryDetails || "—"}</td>
                        </tr>
                    </table>
                </div>
                
                ${bookingData.isAirportPickup && bookingData.flightDetails ? `
                <div class="section">
                    <div class="section-title">✈️ Flight Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Flight Number:</td>
                            <td class="detail-value">${bookingData.flightDetails.flightNumber || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Name Board:</td>
                            <td class="detail-value">${bookingData.flightDetails.nameBoard || "—"}</td>
                        </tr>
                    </table>
                </div>
                ` : ""}
                
                ${bookingData.isBookingForSomeoneElse && bookingData.guestDetails ? `
                <div class="section">
                    <div class="section-title">👥 Booking for Someone Else</div>
                    <table>
                        <tr>
                            <td class="detail-label">Passenger Name:</td>
                            <td class="detail-value">${bookingData.guestDetails.firstName || ""} ${bookingData.guestDetails.lastName || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passenger Email:</td>
                            <td class="detail-value">${bookingData.guestDetails.email || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passenger Phone:</td>
                            <td class="detail-value">${bookingData.guestDetails.countryCode || ""} ${bookingData.guestDetails.phone || "—"}</td>
                        </tr>
                    </table>
                </div>
                ` : ""}
                
                ${bookingData.specialInstructions ? `
                <div class="section">
                    <div class="section-title">📝 Special Instructions</div>
                    <p style="margin: 0; font-size: 14px;">${bookingData.specialInstructions}</p>
                </div>
                ` : ""}
                
                <div class="price-box" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="price-label">Quoted Amount</div>
                    <div class="price-value">${formatCurrency(bookingData.pricing?.totalPrice)}</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">
                        Base: ${formatCurrency(bookingData.pricing?.basePrice)} | 
                        VAT: ${formatCurrency(bookingData.pricing?.tax)}
                        ${bookingData.pricing?.airportCharges > 0 ? ` | Airport: ${formatCurrency(bookingData.pricing.airportCharges)}` : ""}
                    </div>
                </div>
                
                <div class="highlight-box">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>⏰ Lead Captured:</strong> ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text">This is an automated notification from JK Executive Booking System</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive System" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `📋 New Lead - ${passenger.firstName || ""} ${passenger.lastName || ""} | ${bookingData.pickup?.address || bookingData.pickup || "Pickup"}`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Lead notification sent to admin: ${adminEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("❌ Failed to send admin notification:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send Booking Confirmation to User (after successful payment)
 */
export const sendBookingConfirmation = async (bookingData) => {
    const transporter = createTransporter();
    const passenger = bookingData.passengerDetails || {};
    const isHourly = bookingData.serviceType === "hourly";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - JK Executive</title>
        <style>${emailStyles}</style>
    </head>
    <body>
        <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                <h1>✅ BOOKING CONFIRMED</h1>
                <p class="tagline">Your journey is all set!</p>
            </div>
            
            <div class="content">
                <p class="greeting">Dear ${passenger.firstName || "Valued Customer"},</p>
                
                <p>Great news! Your booking with <strong>JK Executive</strong> has been confirmed. We look forward to providing you with a premium travel experience.</p>
                
                <div class="booking-ref">
                    <div class="booking-ref-label">Your Booking Reference</div>
                    <div class="booking-ref-value">${bookingData.bookingNumber || "JK-XXXXXXX"}</div>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <span class="status-badge status-confirmed">✅ Confirmed & Paid</span>
                </div>
                
                <div class="section">
                    <div class="section-title">📍 Journey Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Pickup Location:</td>
                            <td class="detail-value">${bookingData.pickup?.address || bookingData.pickup || "—"}</td>
                        </tr>
                        ${!isHourly ? `
                        <tr>
                            <td class="detail-label">Dropoff Location:</td>
                            <td class="detail-value">${bookingData.dropoff?.address || bookingData.dropoff || "—"}</td>
                        </tr>
                        ` : `
                        <tr>
                            <td class="detail-label">Service Type:</td>
                            <td class="detail-value">Hourly Booking (${bookingData.journeyInfo?.hours || 2} hours)</td>
                        </tr>
                        `}
                        <tr>
                            <td class="detail-label">Date:</td>
                            <td class="detail-value"><strong>${formatDate(bookingData.pickupDate)}</strong></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Pickup Time:</td>
                            <td class="detail-value"><strong>${bookingData.pickupTime || "—"}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">🚗 Your Vehicle</div>
                    <table>
                        <tr>
                            <td class="detail-label">Vehicle:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryName || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Category:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryDetails || "—"}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="price-box" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                    <div class="price-label">Amount Paid</div>
                    <div class="price-value">${formatCurrency(bookingData.pricing?.totalPrice)}</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">Payment Received - Thank You!</div>
                </div>
                
                ${bookingData.isAirportPickup && bookingData.flightDetails?.flightNumber ? `
                <div class="section">
                    <div class="section-title">✈️ Flight Information</div>
                    <p style="margin: 0; font-size: 14px;">
                        Your flight <strong>${bookingData.flightDetails.flightNumber}</strong> will be tracked. If your flight is delayed, your chauffeur will be there when you land.
                    </p>
                </div>
                ` : ""}
                
                <div class="highlight-box">
                    <p style="margin: 0; font-size: 14px; font-weight: 600;">📱 What Happens Next?</p>
                    <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
                        <li>You will receive driver details closer to your pickup time</li>
                        <li>Your chauffeur will contact you upon arrival</li>
                        <li>Show this confirmation email if needed</li>
                    </ul>
                </div>
                
                <div class="section">
                    <div class="section-title">📋 Booking Summary</div>
                    <table>
                        <tr>
                            <td class="detail-label">Passenger:</td>
                            <td class="detail-value">${passenger.firstName || ""} ${passenger.lastName || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Contact:</td>
                            <td class="detail-value">${passenger.countryCode || ""} ${passenger.phone || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Email:</td>
                            <td class="detail-value">${passenger.email || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passengers:</td>
                            <td class="detail-value">${passenger.numberOfPassengers || 1}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Luggage:</td>
                            <td class="detail-value">${passenger.numberOfSuitcases || 0} suitcase(s)</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text">Need to make changes? Contact us immediately.</p>
                <div class="contact-info">
                    <strong>JK Executive</strong><br>
                    📞 Call us: +44 XXX XXX XXXX<br>
                    ✉️ Email: info@jkexecutive.co.uk
                </div>
                <p class="footer-text" style="margin-top: 20px; font-size: 11px; color: #a0aec0;">
                    Booking Reference: ${bookingData.bookingNumber || "JK-XXXXXXX"} | Have a safe journey! ✈️
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive" <${process.env.EMAIL_USER}>`,
        to: passenger.email,
        subject: `✅ Booking Confirmed - ${bookingData.bookingNumber || "JK Executive"} | ${formatDate(bookingData.pickupDate)}`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Booking confirmation sent to: ${passenger.email}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("❌ Failed to send booking confirmation:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send New Booking Alert to Admin (after successful payment)
 */
export const sendNewBookingToAdmin = async (bookingData, paymentDetails = {}) => {
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const passenger = bookingData.passengerDetails || {};
    const isHourly = bookingData.serviceType === "hourly";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking - JK Executive</title>
        <style>${emailStyles}</style>
    </head>
    <body>
        <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                <h1>🎉 NEW ONLINE BOOKING</h1>
                <p class="tagline">Payment Received - Action Required</p>
            </div>
            
            <div class="content">
                <div class="booking-ref" style="background: #d1fae5; border-color: #10b981;">
                    <div class="booking-ref-label" style="color: #065f46;">Booking Reference</div>
                    <div class="booking-ref-value" style="color: #059669;">${bookingData.bookingNumber || "JK-XXXXXXX"}</div>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <span class="status-badge status-paid">💳 Payment Received</span>
                </div>
                
                <div class="price-box" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                    <div class="price-label">Amount Received</div>
                    <div class="price-value">${formatCurrency(bookingData.pricing?.totalPrice)}</div>
                    ${paymentDetails.paymentIntentId ? `
                    <div style="font-size: 11px; opacity: 0.8; margin-top: 5px;">
                        Stripe ID: ${paymentDetails.paymentIntentId}
                    </div>
                    ` : ""}
                </div>
                
                <div class="section" style="border-left-color: #10b981;">
                    <div class="section-title" style="color: #059669;">👤 Customer Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Name:</td>
                            <td class="detail-value"><strong>${passenger.firstName || ""} ${passenger.lastName || ""}</strong></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Email:</td>
                            <td class="detail-value"><a href="mailto:${passenger.email}">${passenger.email || "—"}</a></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Phone:</td>
                            <td class="detail-value"><a href="tel:${passenger.countryCode}${passenger.phone}">${passenger.countryCode || ""} ${passenger.phone || "—"}</a></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Passengers:</td>
                            <td class="detail-value">${passenger.numberOfPassengers || 1}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Luggage:</td>
                            <td class="detail-value">${passenger.numberOfSuitcases || 0} suitcase(s)</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">📍 Journey Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Pickup:</td>
                            <td class="detail-value"><strong>${bookingData.pickup?.address || bookingData.pickup || "—"}</strong></td>
                        </tr>
                        ${!isHourly ? `
                        <tr>
                            <td class="detail-label">Dropoff:</td>
                            <td class="detail-value"><strong>${bookingData.dropoff?.address || bookingData.dropoff || "—"}</strong></td>
                        </tr>
                        ` : `
                        <tr>
                            <td class="detail-label">Service:</td>
                            <td class="detail-value"><strong>Hourly Booking (${bookingData.journeyInfo?.hours || 2} hours)</strong></td>
                        </tr>
                        `}
                        <tr>
                            <td class="detail-label">Date:</td>
                            <td class="detail-value" style="color: #059669; font-weight: 700;">${formatDate(bookingData.pickupDate)}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Time:</td>
                            <td class="detail-value" style="color: #059669; font-weight: 700;">${bookingData.pickupTime || "—"}</td>
                        </tr>
                        ${bookingData.journeyInfo?.distanceMiles ? `
                        <tr>
                            <td class="detail-label">Distance:</td>
                            <td class="detail-value">${bookingData.journeyInfo.distanceMiles.toFixed(1)} miles</td>
                        </tr>
                        ` : ""}
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">🚗 Vehicle Assigned</div>
                    <table>
                        <tr>
                            <td class="detail-label">Vehicle:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryName || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Category:</td>
                            <td class="detail-value">${bookingData.vehicleDetails?.categoryDetails || "—"}</td>
                        </tr>
                    </table>
                </div>
                
                ${bookingData.isAirportPickup && bookingData.flightDetails ? `
                <div class="section">
                    <div class="section-title">✈️ Flight Details</div>
                    <table>
                        <tr>
                            <td class="detail-label">Flight Number:</td>
                            <td class="detail-value"><strong>${bookingData.flightDetails.flightNumber || "—"}</strong></td>
                        </tr>
                        <tr>
                            <td class="detail-label">Name Board:</td>
                            <td class="detail-value">${bookingData.flightDetails.nameBoard || "—"}</td>
                        </tr>
                    </table>
                </div>
                ` : ""}
                
                ${bookingData.isBookingForSomeoneElse && bookingData.guestDetails ? `
                <div class="section">
                    <div class="section-title">👥 Actual Passenger (Booking for Someone Else)</div>
                    <table>
                        <tr>
                            <td class="detail-label">Passenger:</td>
                            <td class="detail-value">${bookingData.guestDetails.firstName || ""} ${bookingData.guestDetails.lastName || ""}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Email:</td>
                            <td class="detail-value">${bookingData.guestDetails.email || "—"}</td>
                        </tr>
                        <tr>
                            <td class="detail-label">Phone:</td>
                            <td class="detail-value">${bookingData.guestDetails.countryCode || ""} ${bookingData.guestDetails.phone || "—"}</td>
                        </tr>
                    </table>
                </div>
                ` : ""}
                
                ${bookingData.specialInstructions ? `
                <div class="section">
                    <div class="section-title">📝 Special Instructions</div>
                    <p style="margin: 0; font-size: 14px; background: #fef3c7; padding: 10px; border-radius: 6px;">${bookingData.specialInstructions}</p>
                </div>
                ` : ""}
                
                <div class="section">
                    <div class="section-title">💰 Price Breakdown</div>
                    <table>
                        <tr>
                            <td class="detail-label">Base Price:</td>
                            <td class="detail-value">${formatCurrency(bookingData.pricing?.basePrice)}</td>
                        </tr>
                        ${bookingData.pricing?.airportCharges > 0 ? `
                        <tr>
                            <td class="detail-label">Airport Charges:</td>
                            <td class="detail-value">${formatCurrency(bookingData.pricing.airportCharges)}</td>
                        </tr>
                        ` : ""}
                        ${bookingData.pricing?.congestionCharge > 0 ? `
                        <tr>
                            <td class="detail-label">Congestion Charge:</td>
                            <td class="detail-value">${formatCurrency(bookingData.pricing.congestionCharge)}</td>
                        </tr>
                        ` : ""}
                        <tr>
                            <td class="detail-label">VAT (${bookingData.pricing?.vatRate || 20}%):</td>
                            <td class="detail-value">${formatCurrency(bookingData.pricing?.tax)}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                            <td class="detail-label" style="font-weight: 700; padding-top: 10px;">Total:</td>
                            <td class="detail-value" style="font-size: 18px; color: #059669; padding-top: 10px;">${formatCurrency(bookingData.pricing?.totalPrice)}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="highlight-box" style="background: #ecfdf5; border-color: #10b981;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>✅ Action Required:</strong> Assign a driver for this booking and ensure vehicle availability for ${formatDate(bookingData.pickupDate)} at ${bookingData.pickupTime}.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text">
                    Booking received at ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive Bookings" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `🎉 New Online Booking - ${bookingData.bookingNumber || "JK Executive"} | ${formatCurrency(bookingData.pricing?.totalPrice)}`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ New booking alert sent to admin: ${adminEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("❌ Failed to send admin booking alert:", error);
        return { success: false, error: error.message };
    }
};

// Export all functions
/**
 * Send Contact Form Inquiry to Admin
 * Triggered when a user submits the Contact Us form
 */
export const sendContactInquiryToAdmin = async ({ name, email, phone, subject, message }) => {
    const transporter = createTransporter();
    const adminEmail = process.env.EMAIL_USER || process.env.ADMIN_EMAIL;

    const subjectLabels = {
        booking: "Booking Enquiry",
        corporate: "Corporate Service",
        airport: "Airport Transfer",
        wedding: "Wedding Service",
        quote: "Get a Quote",
        other: "Other",
    };

    const subjectLabel = subjectLabels[subject] || subject || "General Enquiry";
    const submittedAt = new Date().toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Inquiry — JK Executive</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #0f0f0f;
                color: #333;
                padding: 20px 0;
            }
            .wrapper {
                max-width: 620px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            /* ── Header ── */
            .header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 36px 30px 28px;
                text-align: center;
                border-bottom: 3px solid #D7B75E;
            }
            .header-badge {
                display: inline-block;
                background: rgba(215,183,94,0.15);
                border: 1px solid rgba(215,183,94,0.4);
                color: #D7B75E;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 3px;
                text-transform: uppercase;
                padding: 5px 16px;
                border-radius: 20px;
                margin-bottom: 14px;
            }
            .header h1 {
                color: #ffffff;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: 1px;
                margin-bottom: 6px;
            }
            .header h1 span { color: #D7B75E; }
            .header .sub {
                color: rgba(255,255,255,0.5);
                font-size: 13px;
                letter-spacing: 1px;
            }
            /* ── Alert Banner ── */
            .alert-banner {
                background: linear-gradient(135deg, #D7B75E 0%, #c9a84c 100%);
                padding: 14px 30px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .alert-banner span {
                color: #1a1a1a;
                font-size: 13px;
                font-weight: 600;
            }
            /* ── Content ── */
            .content { padding: 32px 30px; background: #fafafa; }
            /* ── Card ── */
            .card {
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e8e8e8;
                overflow: hidden;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .card-header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .card-header .icon { font-size: 16px; }
            .card-header .title {
                color: #D7B75E;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            .card-body { padding: 20px; }
            /* ── Rows ── */
            .field-row {
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
                font-size: 14px;
            }
            .field-row:last-child { border-bottom: none; }
            .field-label {
                min-width: 110px;
                color: #888;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding-top: 2px;
            }
            .field-value {
                color: #1a1a1a;
                font-weight: 500;
                flex: 1;
                line-height: 1.5;
            }
            .field-value a { color: #D7B75E; text-decoration: none; }
            /* ── Subject Badge ── */
            .subject-chip {
                display: inline-block;
                background: rgba(215,183,94,0.12);
                border: 1px solid rgba(215,183,94,0.35);
                color: #b8933a;
                padding: 3px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            /* ── Message box ── */
            .message-box {
                background: #f8f8f8;
                border-left: 4px solid #D7B75E;
                border-radius: 0 8px 8px 0;
                padding: 16px 18px;
                font-size: 14px;
                color: #333;
                line-height: 1.7;
                white-space: pre-wrap;
                word-break: break-word;
            }
            /* ── Timestamp ── */
            .timestamp {
                text-align: center;
                padding: 14px 20px;
                background: #fff;
                border-top: 1px solid #f0f0f0;
                border-radius: 0 0 12px 12px;
            }
            .timestamp span {
                font-size: 12px;
                color: #aaa;
                letter-spacing: 0.5px;
            }
            .timestamp strong { color: #777; }
            /* ── Footer ── */
            .footer {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 24px 30px;
                text-align: center;
            }
            .footer-logo {
                color: #D7B75E;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 2px;
                margin-bottom: 6px;
            }
            .footer-text {
                color: rgba(255,255,255,0.35);
                font-size: 12px;
                line-height: 1.6;
            }
            .footer-contact {
                margin-top: 12px;
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }
            .footer-contact a { color: #D7B75E; text-decoration: none; }
            .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
        </style>
    </head>
    <body>
        <div class="wrapper">

            <!-- Header -->
            <div class="header">
                <div class="header-badge">New Inquiry</div>
                <h1>JK <span>Executive</span></h1>
                <p class="sub">Premium Chauffeur Services · Contact Form Submission</p>
            </div>

            <!-- Alert Banner -->
            <div class="alert-banner">
                <span> &nbsp;A new inquiry has been submitted via the Contact Us page.</span>
            </div>

            <!-- Content -->
            <div class="content">

                <!-- Contact Details Card -->
                <div class="card">
                    <div class="card-header">
                        <span class="title">Contact Details</span>
                    </div>
                    <div class="card-body">
                        <div class="field-row">
                            <span class="field-label">Full Name</span>
                            <span class="field-value">${name || "—"}</span>
                        </div>
                        <div class="field-row">
                            <span class="field-label">Email</span>
                            <span class="field-value">
                                <a href="mailto:${email}">${email || "—"}</a>
                            </span>
                        </div>
                        <div class="field-row">
                            <span class="field-label">Phone</span>
                            <span class="field-value">
                                <a href="tel:${phone}">${phone || "—"}</a>
                            </span>
                        </div>
                        <div class="field-row">
                            <span class="field-label">Subject</span>
                            <span class="field-value">
                                <span class="subject-chip">${subjectLabel}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Message Card -->
                <div class="card">
                    <div class="card-header">
                        <span class="title">Message</span>
                    </div>
                    <div class="card-body">
                        <div class="message-box">${message || "—"}</div>
                    </div>
                    <div class="timestamp">
                        <span>Received on <strong>${submittedAt}</strong></span>
                    </div>
                </div>

            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="footer-logo">JK EXECUTIVE</div>
                <div class="divider"></div>
                <p class="footer-text">This is an automated notification from the JK Executive contact form.</p>
                <div class="footer-contact">
                    <a href="tel:+442034759906">+44 203 475 9906</a> &nbsp;·&nbsp;
                    <a href="mailto:info@jkexecutivechauffeurs.com">info@jkexecutivechauffeurs.com</a>
                </div>
            </div>

        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive — Contact Form" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        replyTo: email,
        subject: `New Inquiry: ${subjectLabel} — ${name}`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`Contact inquiry email sent to admin: ${adminEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("Failed to send contact inquiry email:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Send Bulk / Corporate Quote Request to Admin
 * Triggered when someone submits the sticky ContactForm
 */
export const sendBulkQuoteRequestToAdmin = async ({ name, email, enquiry }) => {
    const transporter = createTransporter();
    const adminEmail = process.env.EMAIL_USER || process.env.ADMIN_EMAIL;

    const submittedAt = new Date().toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Bulk Quote Request — JK Executive</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #0f0f0f;
                color: #333;
                padding: 20px 0;
            }
            .wrapper {
                max-width: 620px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 36px 30px 28px;
                text-align: center;
                border-bottom: 3px solid #D7B75E;
            }
            .header-badge {
                display: inline-block;
                background: rgba(215,183,94,0.15);
                border: 1px solid rgba(215,183,94,0.4);
                color: #D7B75E;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 3px;
                text-transform: uppercase;
                padding: 5px 16px;
                border-radius: 20px;
                margin-bottom: 14px;
            }
            .header h1 {
                color: #ffffff;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: 1px;
                margin-bottom: 6px;
            }
            .header h1 span { color: #D7B75E; }
            .header .sub {
                color: rgba(255,255,255,0.5);
                font-size: 13px;
                letter-spacing: 1px;
            }
            .alert-banner {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                padding: 14px 30px;
            }
            .alert-banner span {
                color: #1a1a1a;
                font-size: 13px;
                font-weight: 600;
            }
            .content { padding: 32px 30px; background: #fafafa; }
            .card {
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e8e8e8;
                overflow: hidden;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .card-header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 12px 20px;
            }
            .card-header .title {
                color: #D7B75E;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            .card-body { padding: 20px; }
            .field-row {
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
                font-size: 14px;
            }
            .field-row:last-child { border-bottom: none; }
            .field-label {
                min-width: 90px;
                color: #888;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding-top: 2px;
            }
            .field-value {
                color: #1a1a1a;
                font-weight: 500;
                flex: 1;
                line-height: 1.5;
            }
            .field-value a { color: #D7B75E; text-decoration: none; }
            .enquiry-box {
                background: #f8f8f8;
                border-left: 4px solid #f59e0b;
                border-radius: 0 8px 8px 0;
                padding: 16px 18px;
                font-size: 14px;
                color: #333;
                line-height: 1.7;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .timestamp {
                text-align: center;
                padding: 14px 20px;
                background: #fff;
                border-top: 1px solid #f0f0f0;
            }
            .timestamp span { font-size: 12px; color: #aaa; }
            .timestamp strong { color: #777; }
            .footer {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                padding: 24px 30px;
                text-align: center;
            }
            .footer-logo {
                color: #D7B75E;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 2px;
                margin-bottom: 6px;
            }
            .footer-text { color: rgba(255,255,255,0.35); font-size: 12px; line-height: 1.6; }
            .footer-contact { margin-top: 12px; font-size: 12px; color: rgba(255,255,255,0.5); }
            .footer-contact a { color: #D7B75E; text-decoration: none; }
            .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="header-badge">Bulk / Corporate</div>
                <h1>JK <span>Executive</span></h1>
                <p class="sub">Premium Chauffeur Services · Quote Request</p>
            </div>

            <div class="alert-banner">
                <span>New Bulk Booking Quote Request received — action required.</span>
            </div>

            <div class="content">
                <div class="card">
                    <div class="card-header">
                        <span class="title">Customer Details</span>
                    </div>
                    <div class="card-body">
                        <div class="field-row">
                            <span class="field-label">Full Name</span>
                            <span class="field-value">${name || "—"}</span>
                        </div>
                        <div class="field-row">
                            <span class="field-label">Email</span>
                            <span class="field-value">
                                <a href="mailto:${email}">${email || "—"}</a>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="title">Enquiry / Requirements</span>
                    </div>
                    <div class="card-body">
                        <div class="enquiry-box">${enquiry || "—"}</div>
                    </div>
                    <div class="timestamp">
                        <span>Received on <strong>${submittedAt}</strong></span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="footer-logo">JK EXECUTIVE</div>
                <div class="divider"></div>
                <p class="footer-text">Automated notification — Bulk &amp; Corporate Booking form.</p>
                <div class="footer-contact">
                    <a href="tel:+442034759906">+44 203 475 9906</a> &nbsp;·&nbsp;
                    <a href="mailto:info@jkexecutivechauffeurs.com">info@jkexecutivechauffeurs.com</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"JK Executive — Quote Request" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        replyTo: email,
        subject: `New Bulk Booking Quote Request — ${name}`,
        html: htmlContent,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`Bulk quote email sent to admin: ${adminEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error("Failed to send bulk quote email:", error);
        return { success: false, error: error.message };
    }
};

export default {
    sendWelcomeEmail,
    sendLeadNotificationToAdmin,
    sendBookingConfirmation,
    sendNewBookingToAdmin,
    sendContactInquiryToAdmin,
    sendBulkQuoteRequestToAdmin,
};
