export const calculateP2PPrice = (pricing, distanceKm) => {
  const distanceMiles = distanceKm * 0.621371;
  
  const { distanceTiers, afterDistancePrice } = pricing.pointToPoint;

  // 1. Check if it falls into the "After X Miles" category
  if (afterDistancePrice && distanceMiles > afterDistancePrice.distanceThreshold) {
    return distanceMiles * afterDistancePrice.pricePerMile;
  }

  const matchedTier = distanceTiers.find(
    (tier) => distanceMiles >= tier.fromDistance && distanceMiles <= tier.toDistance
  );

  if (matchedTier) {
    if (matchedTier.type === "fixed") {
      return matchedTier.price; 
    } else {
      return distanceMiles * matchedTier.price; 
    }
  }

  return 0;
};