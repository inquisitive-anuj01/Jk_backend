import { Pricing } from "../models/pricing.model.js";
import {
  calculateTotalPrice,
  kmToMiles,
} from "./pricingCalculator.js";

/**
 * Generate unique booking number
 */
export const generateBookingNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BK-${year}${month}${day}-${random}`;
};

/**
 * Validate pickup time (minimum notice period)
 */
export const validatePickupTime = (pickupDateTime, minimumMinutes = 30) => {
  const now = new Date();
  const pickupTime = new Date(pickupDateTime);
  const minimumTime = new Date(now.getTime() + minimumMinutes * 60000);

  if (pickupTime < minimumTime) {
    throw new Error(
      `Pickup time must be at least ${minimumMinutes} minutes from now`
    );
  }

  return true;
};

/**
 * Calculate pricing for a booking
 * Uses the new tiered pricing system from the Pricing model
 * 
 * @param {Object} vehicle - Vehicle document
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} durationMins - Duration in minutes
 * @param {Array} extras - Selected extras
 * @param {Date} pickupDateTime - Pickup date/time
 * @param {string} bookingType - 'p2p' or 'hourly'
 * @param {number} hours - Number of hours (for hourly booking)
 * @returns {Object} Pricing breakdown
 */
export const calculatePricing = async (
  vehicle,
  distanceKm,
  durationMins,
  extras = [],
  pickupDateTime,
  bookingType = "p2p",
  hours = 0
) => {
  const distanceMiles = kmToMiles(distanceKm);

  // Get pricing configuration from database
  const pricing = await Pricing.findOne({
    vehicle: vehicle._id,
    pricingType: bookingType,
    status: "active",
  });

  if (!pricing) {
    // Fallback to basic calculation if no pricing configured
    return calculateFallbackPricing(
      vehicle,
      distanceKm,
      durationMins,
      extras,
      pickupDateTime
    );
  }

  // Use the new pricing calculator
  const priceResult = calculateTotalPrice(pricing, {
    bookingType,
    distanceMiles,
    hours: hours || Math.ceil(durationMins / 60),
    extras: {
      extraStops: extras.filter(e => e.name?.toLowerCase().includes('stop')).length,
      childSeats: extras.filter(e => e.name?.toLowerCase().includes('seat') || e.name?.toLowerCase().includes('child')).reduce((sum, e) => sum + (e.quantity || 1), 0),
    },
  });

  // Calculate extras from the booking extras array
  const extrasTotal = extras.reduce((total, extra) => {
    return total + (extra.price || 0) * (extra.quantity || 1);
  }, 0);

  return {
    baseFare: priceResult.journey.baseCharge || priceResult.journey.total,
    distanceFare: priceResult.journey.distanceCharge || 0,
    timeFare: priceResult.journey.extraHourCharge || 0,
    extrasFare: extrasTotal + priceResult.extras.total,
    surcharges: 0,
    tax: priceResult.vatAmount,
    totalAmount: priceResult.grandTotal + extrasTotal,
    breakdown: priceResult.journey.breakdown,
    bookingType,
  };
};

/**
 * Fallback pricing calculation (legacy)
 * Used when no pricing configuration is found
 */
const calculateFallbackPricing = (
  vehicle,
  distanceKm,
  durationMins,
  extras = [],
  pickupDateTime
) => {
  // Default rates if vehicle doesn't have pricing configured
  const basePrice = vehicle.basePrice || 50;
  const pricePerKm = vehicle.pricePerKm || 2;
  const pricePerMinute = vehicle.pricePerMinute || 0.5;

  // Calculate base fares
  const distanceFare = distanceKm * pricePerKm;
  const timeFare = durationMins * pricePerMinute;

  // Calculate surcharges
  let surcharges = 0;
  const pickupDate = new Date(pickupDateTime);
  const hour = pickupDate.getHours();
  const dayOfWeek = pickupDate.getDay();

  // Night surcharge (10pm - 6am)
  if (hour >= 22 || hour < 6) {
    surcharges += (basePrice + distanceFare + timeFare) * 0.2; // 20% night surcharge
  }

  // Weekend surcharge
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    surcharges += (basePrice + distanceFare + timeFare) * 0.1; // 10% weekend surcharge
  }

  // Calculate extras total
  const extrasTotal = extras.reduce((total, extra) => {
    return total + (extra.price || 0) * (extra.quantity || 1);
  }, 0);

  // Calculate tax (20% VAT for UK)
  const subtotal = basePrice + distanceFare + timeFare + surcharges + extrasTotal;
  const tax = subtotal * 0.2;

  // Total amount
  const totalAmount = subtotal + tax;

  return {
    baseFare: parseFloat(basePrice.toFixed(2)),
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    timeFare: parseFloat(timeFare.toFixed(2)),
    extrasFare: parseFloat(extrasTotal.toFixed(2)),
    surcharges: parseFloat(surcharges.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

/**
 * Check if booking is within vehicle notice period
 */
export const isWithinNoticePeriod = (vehicle, pickupDateTime) => {
  const now = new Date();
  const pickup = new Date(pickupDateTime);
  const minutesUntilPickup = (pickup - now) / (1000 * 60);

  return minutesUntilPickup < (vehicle.minimumNoticePeriod || 120);
};

/**
 * Get notice period warning message
 */
export const getNoticePeriodWarning = (vehicle) => {
  if (vehicle.displayWarningIfBookingWithinNoticePeriod) {
    return vehicle.warningMessage ||
      `Please note: the recommended notice period for this vehicle is ${vehicle.minimumNoticePeriod || 120} minutes.`;
  }
  return null;
};
