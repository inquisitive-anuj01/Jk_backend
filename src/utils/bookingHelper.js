

export const generateBookingNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `BK-${year}${month}${day}-${random}`;
};

export const calculatePricing = (
  vehicle,
  distanceKm,
  durationMins,
  extras = [],
  pickupDateTime
) => {
  const {
    basePrice,
    pricePerKm,
    pricePerMinute,
    nightSurcharge,
    weekendSurcharge,
  } = vehicle;

  // Calculate base fares
  const distanceFare = distanceKm * pricePerKm;
  const timeFare = durationMins * pricePerMinute;

  // Calculate surcharges
  let surcharges = 0;
  const pickupDate = new Date(pickupDateTime);
  const hour = pickupDate.getHours();
  const dayOfWeek = pickupDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Night surcharge
  if (
    (nightSurcharge && hour >= nightSurcharge.startHour) ||
    hour < nightSurcharge.endHour
  ) {
    surcharges +=
      (basePrice + distanceFare + timeFare) * (nightSurcharge.multiplier - 1);
  }

  // Weekend surcharge
  if (weekendSurcharge && (dayOfWeek === 0 || dayOfWeek === 6)) {
    surcharges +=
      (basePrice + distanceFare + timeFare) * (weekendSurcharge.multiplier - 1);
  }

  // Calculate extras total
  const extrasTotal = extras.reduce((total, extra) => {
    return total + extra.price * extra.quantity;
  }, 0);

  // Calculate tax (20% VAT for UK)
  const subtotal =
    basePrice + distanceFare + timeFare + surcharges + extrasTotal;
  const tax = subtotal * 0.2;

  // Total amount
  const totalAmount = subtotal + tax;

  return {
    baseFare: basePrice,
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    timeFare: parseFloat(timeFare.toFixed(2)),
    extrasFare: parseFloat(extrasTotal.toFixed(2)),
    surcharges: parseFloat(surcharges.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

export const validatePickupTime = (pickupDateTime) => {
  const now = new Date();
  const pickupTime = new Date(pickupDateTime);
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);

  if (pickupTime < thirtyMinutesFromNow) {
    throw new Error("Pickup time must be at least 30 minutes from now");
  }

  return true;
};
