// UK VAT is 20%
const VAT_RATE = 0.20;

export const kmToMiles = (km) => {
  return km * 0.621371;
};

export const milesToKm = (miles) => {
  return miles / 0.621371;
};


export const roundPrice = (amount, shouldRound = false) => {
  if (shouldRound) {
    // Round to nearest whole number (e.g., 134.60 → 135)
    return Math.round(amount);
  }
  // Round to 2 decimal places (e.g., 134.567 → 134.57)
  return parseFloat(amount.toFixed(2));
};


export const calculateVATAmount = (netAmount) => {
  return netAmount * VAT_RATE;
};


export const applyVAT = (amount, includeVat = true) => {
  if (includeVat) {
    return amount * (1 + VAT_RATE);
  }
  return amount;
};

// P2P (POINT-TO-POINT) PRICING
/**
 * Calculate price for a one-way journey based on distance
 * 
 * How it works:
 * 1. First X miles have a fixed minimum charge (e.g., 0-8 miles = £74.50)
 * 2. Additional miles are charged per-mile (e.g., 9-30 miles = £2.50/mile)
 * 3. Very long distances may have different rates
 */
export const calculateP2PPrice = (pricing, distanceMiles) => {
  const p2p = pricing.pointToPoint;

  // If no pricing is configured, return zero
  if (!p2p || !p2p.isActive || !p2p.distanceTiers || p2p.distanceTiers.length === 0) {
    return {
      baseCharge: 0,
      distanceCharge: 0,
      total: 0,
      breakdown: "P2P pricing not configured",
    };
  }

  // Sort tiers by distance (smallest first)
  // [0-8 miles, 9-30 miles, 31-40 miles]
  const sortedTiers = [...p2p.distanceTiers].sort(
    (a, b) => a.fromDistance - b.fromDistance
  );

  // Initialize price variables
  let baseCharge = 0;      // The minimum/fixed charge
  let distanceCharge = 0;  // Extra charges for distance beyond minimum
  let breakdownParts = [];

  // Calculate the BASE CHARGE
  // First 8 miles = £74.50 fixed
  const firstTier = sortedTiers[0];

  if (firstTier) {
    if (firstTier.type === "fixed") {
      // Fixed price for first X miles
      baseCharge = firstTier.price;
      breakdownParts.push(
        `Base: £${firstTier.price.toFixed(2)} (first ${firstTier.toDistance} miles)`
      );
    } else {
      // If first tier is per-mile (unusual)
      const milesInTier = Math.min(distanceMiles, firstTier.toDistance);
      baseCharge = milesInTier * firstTier.price;
      breakdownParts.push(`First ${milesInTier} miles: £${baseCharge.toFixed(2)}`);
    }
  }

  // If distance is within first tier, return base only 
  // 5 miles journey when first tier is 0-8 miles
  if (distanceMiles <= firstTier.toDistance) {
    return {
      baseCharge: roundPrice(baseCharge),
      distanceCharge: 0,
      total: roundPrice(baseCharge),
      breakdown: breakdownParts.join(" + ") || `Minimum charge for up to ${firstTier.toDistance} miles`,
    };
  }

  // Calculate EXTRA DISTANCE charges 
  // For miles beyond the first tier
  // 17 miles - 8 miles = 9 extra miles
  let remainingMiles = distanceMiles - firstTier.toDistance;

  // Go through each additional tier
  for (let i = 1; i < sortedTiers.length && remainingMiles > 0; i++) {
    const tier = sortedTiers[i];

    // How many miles are in this tier?
    // Example: Tier 9-30 has range of 21 miles
    const tierRange = tier.toDistance - tier.fromDistance;

    // How many of our remaining miles fall in this tier?
    const milesInThisTier = Math.min(remainingMiles, tierRange);

    if (tier.type === "per_mile") {
      // Calculate: miles × price per mile
      const tierCharge = milesInThisTier * tier.price;
      distanceCharge += tierCharge;
      breakdownParts.push(
        `${tier.fromDistance}-${tier.toDistance} miles: ${milesInThisTier.toFixed(1)} × £${tier.price} = £${tierCharge.toFixed(2)}`
      );
    } else {
      // Fixed charge for this tier (unusual)
      distanceCharge += tier.price;
      breakdownParts.push(
        `${tier.fromDistance}-${tier.toDistance} miles: £${tier.price.toFixed(2)}`
      );
    }

    // Subtract the miles we've accounted for
    remainingMiles -= milesInThisTier;
  }

  //  Handle VERY LONG DISTANCES 
  // If there are still miles left after all tiers, use the "after X miles" rate
  // Example: After 40 miles, charge £2.50/mile for remaining distance
  if (remainingMiles > 0 && p2p.afterDistancePricePerMile) {
    const afterCharge = remainingMiles * p2p.afterDistancePricePerMile;
    distanceCharge += afterCharge;
    breakdownParts.push(
      `After ${p2p.afterDistanceThreshold} miles: ${remainingMiles.toFixed(1)} × £${p2p.afterDistancePricePerMile} = £${afterCharge.toFixed(2)}`
    );
  }

  // ----- STEP 5: Calculate TOTAL and return -----
  const total = baseCharge + distanceCharge;

  return {
    baseCharge: roundPrice(baseCharge),
    distanceCharge: roundPrice(distanceCharge),
    total: roundPrice(total),
    breakdown: breakdownParts.join(" + "),
  };
};

// =============================================================================
// HOURLY PRICING
// =============================================================================
/**
 * Calculate price for an hourly booking (chauffeur "as directed")
 * 
 * How it works:
 * 1. Minimum hours × hourly rate = base charge
 * 2. Extra hours × additional hour rate = extra charge
 * 3. If miles exceed included miles, charge per excess mile
 * 
 * Example for 6 hours, 50 miles:
 * - Minimum 4 hours × £45/hr = £180 (base)
 * - Extra 2 hours × £45/hr = £90 (extra)
 * - 50 miles - 40 included = 10 excess miles × £2.75 = £27.50
 * - Total = £180 + £90 + £27.50 = £297.50
 * 
 * @param {Object} pricing - The pricing configuration from database
 * @param {number} hours - Number of hours booked
 * @param {number} distanceMiles - Estimated distance in miles
 * @returns {Object} - Price breakdown
 */
export const calculateHourlyPrice = (pricing, hours, distanceMiles = 0) => {
  // Get hourly pricing configuration
  const hourly = pricing.hourly;

  // If no hourly pricing configured, return zero
  if (!hourly || !hourly.isActive) {
    return {
      baseCharge: 0,
      extraHourCharge: 0,
      excessMileageCharge: 0,
      total: 0,
      breakdown: "Hourly pricing not configured",
    };
  }

  // Get pricing values from config
  const hourlyRate = hourly.hourlyRate || 0;           // Price per hour
  const minimumHours = hourly.minimumHours || 0;       // Minimum booking length
  const additionalHourCharge = hourly.additionalHourCharge || 0; // Rate for extra hours
  const milesIncluded = hourly.milesIncluded || 0;     // Free miles included
  const excessMileageCharge = hourly.excessMileageCharge || 0;   // Price per excess mile

  let breakdownParts = [];

  // ----- STEP 1: Calculate BASE CHARGE -----
  // Base = minimum hours × hourly rate
  const baseCharge = minimumHours * hourlyRate;
  breakdownParts.push(
    `Base: ${minimumHours} hrs × £${hourlyRate}/hr = £${baseCharge.toFixed(2)}`
  );

  // ----- STEP 2: Calculate EXTRA HOURS charge -----
  // If booking is longer than minimum hours
  let extraHourChargeTotal = 0;
  if (hours > minimumHours) {
    const extraHours = hours - minimumHours;
    extraHourChargeTotal = extraHours * additionalHourCharge;
    breakdownParts.push(
      `Extra: ${extraHours} hrs × £${additionalHourCharge}/hr = £${extraHourChargeTotal.toFixed(2)}`
    );
  }

  // ----- STEP 3: Calculate EXCESS MILEAGE charge -----
  // If miles exceed the included amount
  let excessMileageChargeTotal = 0;
  if (distanceMiles > milesIncluded && excessMileageCharge > 0) {
    const excessMiles = distanceMiles - milesIncluded;
    excessMileageChargeTotal = excessMiles * excessMileageCharge;
    breakdownParts.push(
      `Excess miles: ${excessMiles.toFixed(1)} × £${excessMileageCharge}/mile = £${excessMileageChargeTotal.toFixed(2)}`
    );
  }

  // ----- STEP 4: Calculate TOTAL -----
  const total = baseCharge + extraHourChargeTotal + excessMileageChargeTotal;

  return {
    baseCharge: roundPrice(baseCharge),
    extraHourCharge: roundPrice(extraHourChargeTotal),
    excessMileageCharge: roundPrice(excessMileageChargeTotal),
    milesIncluded,
    minimumHours,
    hourlyRate,
    total: roundPrice(total),
    breakdown: breakdownParts.join(" + "),
  };
};

// =============================================================================
// EXTRAS CHARGES
// =============================================================================
/**
 * Calculate charges for additional extras
 * 
 * Extras that can be added:
 * - Extra stops (e.g., £15 per stop)
 * - Child seats (e.g., £5 per seat)
 * - Congestion charge (e.g., £15 flat fee)
 * 
 * @param {Object} pricing - The pricing configuration
 * @param {Object} extras - The extras selected by user
 * @returns {Object} - Breakdown of extra charges
 */
export const calculateExtrasCharges = (pricing, extras = {}) => {
  // Get extras pricing from config
  const pricingExtras = pricing.extras || {};

  // Get user-selected extras
  const extraStops = extras.extraStops || 0;
  const childSeats = extras.childSeats || 0;
  const includeCongestion = extras.includeCongestion || false;

  let total = 0;
  let breakdownParts = [];

  // ----- Calculate each extra -----

  // Extra stops
  if (extraStops > 0 && pricingExtras.extraStopPrice) {
    const stopCharge = extraStops * pricingExtras.extraStopPrice;
    total += stopCharge;
    breakdownParts.push(`${extraStops} extra stop(s): £${stopCharge.toFixed(2)}`);
  }

  // Child seats
  if (childSeats > 0 && pricingExtras.childSeatPrice) {
    const seatCharge = childSeats * pricingExtras.childSeatPrice;
    total += seatCharge;
    breakdownParts.push(`${childSeats} child seat(s): £${seatCharge.toFixed(2)}`);
  }

  // Congestion charge
  if (includeCongestion && pricingExtras.congestionCharge) {
    total += pricingExtras.congestionCharge;
    breakdownParts.push(`Congestion charge: £${pricingExtras.congestionCharge.toFixed(2)}`);
  }

  return {
    extraStopCharge: extraStops * (pricingExtras.extraStopPrice || 0),
    childSeatCharge: childSeats * (pricingExtras.childSeatPrice || 0),
    congestionCharge: includeCongestion ? (pricingExtras.congestionCharge || 0) : 0,
    total: roundPrice(total),
    breakdown: breakdownParts.length > 0 ? breakdownParts.join(" + ") : "No additional charges",
  };
};

// =============================================================================
// COMPLETE PRICE CALCULATION
// =============================================================================
/**
 * Calculate the complete price for a booking
 * 
 * This is the MAIN function that combines:
 * 1. Journey price (P2P or Hourly)
 * 2. Extras charges
 * 3. VAT calculation
 * 4. Rounding (if enabled)
 * 
 * @param {Object} pricing - The pricing configuration
 * @param {Object} params - Booking parameters
 * @returns {Object} - Complete price breakdown
 */
export const calculateTotalPrice = (pricing, params) => {
  // Get booking parameters
  const bookingType = params.bookingType || "p2p";
  const distanceMiles = params.distanceMiles || 0;
  const hours = params.hours || 0;
  const extras = params.extras || {};

  // ----- STEP 1: Calculate JOURNEY price -----
  let journeyPrice;
  if (bookingType === "hourly") {
    journeyPrice = calculateHourlyPrice(pricing, hours, distanceMiles);
  } else {
    journeyPrice = calculateP2PPrice(pricing, distanceMiles);
  }

  // ----- STEP 2: Calculate EXTRAS charges -----
  const extrasPrice = calculateExtrasCharges(pricing, extras);

  // ----- STEP 3: Calculate SUBTOTAL (before VAT) -----
  const subtotal = journeyPrice.total + extrasPrice.total;

  // ----- STEP 4: Calculate VAT -----
  // Only add VAT if displayVATInclusive is true
  const vatAmount = pricing.displayVATInclusive
    ? calculateVATAmount(subtotal)
    : 0;

  // ----- STEP 5: Calculate GRAND TOTAL -----
  let grandTotal = subtotal + vatAmount;

  // Apply rounding if configured
  if (pricing.priceRoundOff) {
    grandTotal = roundPrice(grandTotal, true); // Round to nearest whole number
  }

  // ----- STEP 6: Return complete breakdown -----
  return {
    bookingType,
    distanceMiles: roundPrice(distanceMiles),
    hours: bookingType === "hourly" ? hours : null,

    journey: journeyPrice,    // Base journey price breakdown
    extras: extrasPrice,      // Extras breakdown

    subtotal: roundPrice(subtotal),            // Before VAT
    vatRate: VAT_RATE * 100,                   // As percentage (20)
    vatAmount: roundPrice(vatAmount),          // VAT amount
    vatInclusive: pricing.displayVATInclusive, // Is VAT included?

    grandTotal: roundPrice(grandTotal),        // Final total

    priceRoundedOff: pricing.priceRoundOff,
    coverageZone: pricing.coverageZone,
  };
};

// =============================================================================
// QUICK PRICE ESTIMATE
// =============================================================================
/**
 * Get a quick price estimate for vehicle listing display
 * Shows both P2P and Hourly prices if available
 * 
 * @param {Object} pricing - The pricing configuration
 * @param {number} distanceMiles - Journey distance
 * @param {number} hours - Default hours for hourly estimate
 * @returns {Object} - Quick estimates for P2P and Hourly
 */
export const getQuickPriceEstimate = (pricing, distanceMiles, hours = 4) => {
  // Calculate P2P price if available
  const p2pPrice = pricing.pointToPoint?.isActive
    ? calculateP2PPrice(pricing, distanceMiles)
    : null;

  // Calculate Hourly price if available
  const hourlyPrice = pricing.hourly?.isActive
    ? calculateHourlyPrice(pricing, hours, distanceMiles)
    : null;

  return {
    p2p: p2pPrice
      ? {
        available: true,
        total: p2pPrice.total,
        display: `£${p2pPrice.total.toFixed(2)}`,
      }
      : { available: false },

    hourly: hourlyPrice
      ? {
        available: true,
        total: hourlyPrice.total,
        minimumHours: hourlyPrice.minimumHours,
        hourlyRate: hourlyPrice.hourlyRate,
        display: `From £${hourlyPrice.total.toFixed(2)} (${hourlyPrice.minimumHours}hr min)`,
      }
      : { available: false },
  };
};

// =============================================================================
// AIRPORT PRICING CALCULATION
// =============================================================================
/**
 * Calculate price for airport-specific journeys
 * 
 * This is similar to P2P but with airport-specific charges:
 * - Distance tiers (specific to this airport)
 * - Airport pickup charge (if picking up FROM this airport)
 * - Airport dropoff charge (if dropping off AT this airport)
 * - Congestion charge
 * - Extra stops
 * 
 * @param {Object} airportPricing - The airport pricing from database
 * @param {number} distanceMiles - Journey distance in miles
 * @param {Object} options - Additional options
 * @param {boolean} options.isPickup - Is this airport the pickup location?
 * @param {boolean} options.isDropoff - Is this airport the dropoff location?
 * @returns {Object} - Complete price breakdown
 */
export const calculateAirportPrice = (airportPricing, distanceMiles, options = {}) => {
  const { isPickup = false, isDropoff = false } = options;

  // Get distance tiers
  const distanceTiers = airportPricing.distanceTiers || [];
  const extras = airportPricing.extras || {};

  // If no tiers configured, return zero
  if (distanceTiers.length === 0) {
    return {
      baseCharge: 0,
      distanceCharge: 0,
      airportCharges: 0,
      congestionCharge: 0,
      subtotal: 0,
      vatAmount: 0,
      totalPrice: 0,
      breakdown: "Airport pricing not configured",
    };
  }

  // Sort tiers by distance
  const sortedTiers = [...distanceTiers].sort((a, b) => a.fromDistance - b.fromDistance);

  let baseCharge = 0;
  let distanceCharge = 0;
  let breakdownParts = [];

  // ----- STEP 1: Calculate base charge (first tier) -----
  const firstTier = sortedTiers[0];
  if (firstTier) {
    if (firstTier.type === "fixed") {
      baseCharge = firstTier.price;
      breakdownParts.push(`Base: £${firstTier.price.toFixed(2)} (first ${firstTier.toDistance} miles)`);
    } else {
      const milesInTier = Math.min(distanceMiles, firstTier.toDistance);
      baseCharge = milesInTier * firstTier.price;
      breakdownParts.push(`First ${milesInTier} miles: £${baseCharge.toFixed(2)}`);
    }
  }

  // ----- STEP 2: Calculate distance charges for remaining miles -----
  if (distanceMiles > firstTier.toDistance) {
    let remainingMiles = distanceMiles - firstTier.toDistance;

    for (let i = 1; i < sortedTiers.length && remainingMiles > 0; i++) {
      const tier = sortedTiers[i];
      const tierRange = tier.toDistance - tier.fromDistance;
      const milesInThisTier = Math.min(remainingMiles, tierRange);

      if (tier.type === "per_mile") {
        const tierCharge = milesInThisTier * tier.price;
        distanceCharge += tierCharge;
        breakdownParts.push(
          `${tier.fromDistance}-${tier.toDistance} miles: ${milesInThisTier.toFixed(1)} × £${tier.price} = £${tierCharge.toFixed(2)}`
        );
      } else {
        distanceCharge += tier.price;
        breakdownParts.push(`${tier.fromDistance}-${tier.toDistance} miles: £${tier.price.toFixed(2)}`);
      }

      remainingMiles -= milesInThisTier;
    }

    // After distance threshold
    if (remainingMiles > 0 && airportPricing.afterDistancePricePerMile) {
      const afterCharge = remainingMiles * airportPricing.afterDistancePricePerMile;
      distanceCharge += afterCharge;
      breakdownParts.push(
        `After ${airportPricing.afterDistanceThreshold} miles: ${remainingMiles.toFixed(1)} × £${airportPricing.afterDistancePricePerMile} = £${afterCharge.toFixed(2)}`
      );
    }
  }

  // ----- STEP 3: Journey subtotal -----
  const journeyTotal = baseCharge + distanceCharge;

  // ----- STEP 4: Calculate airport-specific charges -----
  let airportCharges = 0;

  // Add pickup charge if this is the pickup airport
  if (isPickup && extras.airportPickupCharge > 0) {
    airportCharges += extras.airportPickupCharge;
    breakdownParts.push(`Airport pickup charge: £${extras.airportPickupCharge.toFixed(2)}`);
  }

  // Add dropoff charge if this is the dropoff airport
  if (isDropoff && extras.airportDropoffCharge > 0) {
    airportCharges += extras.airportDropoffCharge;
    breakdownParts.push(`Airport dropoff charge: £${extras.airportDropoffCharge.toFixed(2)}`);
  }

  // ----- STEP 5: Congestion charge -----
  const congestionCharge = extras.congestionCharge || 0;
  if (congestionCharge > 0) {
    breakdownParts.push(`Congestion charge: £${congestionCharge.toFixed(2)}`);
  }

  // ----- STEP 6: Calculate subtotal and VAT -----
  const subtotal = journeyTotal + airportCharges + congestionCharge;

  const vatRate = 0.20; // 20% UK VAT
  const vatAmount = airportPricing.displayVATInclusive ? subtotal * vatRate : 0;

  // ----- STEP 7: Calculate total -----
  let totalPrice = subtotal + vatAmount;

  // Apply rounding if configured
  if (airportPricing.priceRoundOff) {
    totalPrice = Math.round(totalPrice);
  }

  return {
    baseCharge: roundPrice(baseCharge),
    distanceCharge: roundPrice(distanceCharge),
    airportCharges: roundPrice(airportCharges),
    congestionCharge: roundPrice(congestionCharge),
    subtotal: roundPrice(subtotal),
    vatRate: vatRate * 100,
    vatAmount: roundPrice(vatAmount),
    vatInclusive: airportPricing.displayVATInclusive,
    totalPrice: roundPrice(totalPrice),
    breakdown: breakdownParts.join(" + "),
    priceRoundedOff: airportPricing.priceRoundOff,
  };
};