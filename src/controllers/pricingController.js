import { Pricing } from "../models/pricing.model.js";
import { TryCatch } from "../middlewares/error.js";

// Create or Update Pricing for a Vehicle
export const setVehiclePricing = TryCatch(async (req, res, next) => {
  const { vehicleId } = req.params;
  const { pointToPoint, hourly, extras } = req.body;

  // Check if pricing exists, if so update, else create
  let pricing = await Pricing.findOne({ vehicle: vehicleId });

  if (pricing) {
    // Update existing
    pricing.pointToPoint = pointToPoint;
    pricing.hourly = hourly;
    pricing.extras = extras;
    await pricing.save();
  } else {
    // Create new
    pricing = await Pricing.create({
      vehicle: vehicleId,
      pointToPoint,
      hourly,
      extras
    });
  }

  res.status(200).json({
    success: true,
    message: "Pricing rules updated successfully",
    data: pricing
  });
});