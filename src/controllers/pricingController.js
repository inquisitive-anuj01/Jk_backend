import { TryCatch } from "../middlewares/error.js";
import { Pricing } from "../models/pricing.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import {
  calculateTotalPrice,
  kmToMiles
} from "../utils/pricingCalculator.js";

// ADMIN CONTROLLERS
// Create or Update P2P Pricing for a Vehicle

export const setP2PPricing = TryCatch(async (req, res, next) => {
  const { vehicleId } = req.params;
  const {
    coverageZone = "Entire UK Cover",
    distanceTiers,
    afterDistanceThreshold,
    afterDistancePricePerMile,
    extras,
    displayVATInclusive = true,
    displayParkingInclusive = false,
    priceRoundOff = false,
    status = "active",
  } = req.body;

  // Validate vehicle exists
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  // Validate distance tiers
  if (!distanceTiers || distanceTiers.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one distance tier is required",
    });
  }

  // Find existing P2P pricing or create new
  let pricing = await Pricing.findOne({
    vehicle: vehicleId,
    pricingType: "p2p",
    coverageZone,
  });

  const pricingData = {
    vehicle: vehicleId,
    pricingType: "p2p",
    coverageZone,
    status,
    displayVATInclusive,
    displayParkingInclusive,
    priceRoundOff,
    pointToPoint: {
      isActive: true,
      distanceTiers,
      afterDistanceThreshold: afterDistanceThreshold || 40,
      afterDistancePricePerMile: afterDistancePricePerMile || 0,
    },
    extras: extras || {},
  };

  if (pricing) {
    // Update existing
    Object.assign(pricing, pricingData);
    await pricing.save();
  } else {
    // Create new
    pricing = await Pricing.create(pricingData);
  }

  res.status(200).json({
    success: true,
    message: "P2P pricing updated successfully",
    data: pricing,
  });
});

// Create or Update Hourly Pricing for a Vehicle

export const setHourlyPricing = TryCatch(async (req, res, next) => {
  const { vehicleId } = req.params;
  const {
    coverageZone = "Entire UK Cover",
    hourlyRate,
    minimumHours,
    additionalHourCharge,
    milesIncluded,
    excessMileageCharge,
    extras,
    displayVATInclusive = true,
    displayParkingInclusive = false,
    priceRoundOff = false,
    status = "active",
  } = req.body;

  // Validate vehicle exists
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  // Find existing hourly pricing or create new
  let pricing = await Pricing.findOne({
    vehicle: vehicleId,
    pricingType: "hourly",
    coverageZone,
  });

  const pricingData = {
    vehicle: vehicleId,
    pricingType: "hourly",
    coverageZone,
    status,
    displayVATInclusive,
    displayParkingInclusive,
    priceRoundOff,
    hourly: {
      isActive: true,
      hourlyRate: hourlyRate || 0,
      minimumHours: minimumHours || 4,
      additionalHourCharge: additionalHourCharge || hourlyRate || 0,
      milesIncluded: milesIncluded || 0,
      excessMileageCharge: excessMileageCharge || 0,
    },
    extras: extras || {},
  };

  if (pricing) {
    // Update existing
    Object.assign(pricing, pricingData);
    await pricing.save();
  } else {
    // Create new
    pricing = await Pricing.create(pricingData);
  }

  res.status(200).json({
    success: true,
    message: "Hourly pricing updated successfully",
    data: pricing,
  });
});

//  Get Pricing for a Vehicle (both P2P and Hourly)

export const getVehiclePricing = TryCatch(async (req, res, next) => {
  const { vehicleId } = req.params;
  const { coverageZone } = req.query;

  const filter = { vehicle: vehicleId, status: "active" };
  if (coverageZone) {
    filter.coverageZone = coverageZone;
  }

  const pricingConfigs = await Pricing.find(filter).populate(
    "vehicle",
    "categoryName vehicleType"
  );

  // Organize by pricing type
  const p2pPricing = pricingConfigs.find((p) => p.pricingType === "p2p");
  const hourlyPricing = pricingConfigs.find((p) => p.pricingType === "hourly");

  res.status(200).json({
    success: true,
    data: {
      vehicleId,
      p2p: p2pPricing || null,
      hourly: hourlyPricing || null,
    },
  });
});

//  Get All Pricing Configurations (Admin)

export const getAllPricing = TryCatch(async (req, res, next) => {
  const { pricingType, coverageZone, status = "active" } = req.query;

  const filter = {};
  if (pricingType) filter.pricingType = pricingType;
  if (coverageZone) filter.coverageZone = coverageZone;
  if (status) filter.status = status;

  const pricingConfigs = await Pricing.find(filter)
    .populate("vehicle", "categoryName vehicleType image")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: pricingConfigs.length,
    data: pricingConfigs,
  });
});

//  Delete Pricing Configuration

export const deletePricing = TryCatch(async (req, res, next) => {
  const pricing = await Pricing.findByIdAndDelete(req.params.id);

  if (!pricing) {
    return res.status(404).json({
      success: false,
      message: "Pricing configuration not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Pricing configuration deleted successfully",
  });
});

// USER/PUBLIC CONTROLLERS
//  Get Price Quote

export const getPriceQuote = TryCatch(async (req, res, next) => {
  const {
    vehicleId,
    bookingType = "p2p", // 'p2p' or 'hourly'
    distanceKm,
    distanceMiles: inputMiles,
    hours = 4, // for hourly booking
    extras = {}, // { extraStops: 0, childSeats: 0, includeCongestion: false }
    coverageZone = "Entire UK Cover",
  } = req.body;

  // Validate vehicle
  if (!vehicleId) {
    return res.status(400).json({
      success: false,
      message: "Vehicle ID is required",
    });
  }

  // Calculate distance in miles
  let distanceMiles = inputMiles;
  if (!distanceMiles && distanceKm) {
    distanceMiles = kmToMiles(distanceKm);
  }
  if (!distanceMiles) {
    return res.status(400).json({
      success: false,
      message: "Distance (distanceKm or distanceMiles) is required",
    });
  }

  // Get pricing configuration
  const pricing = await Pricing.findOne({
    vehicle: vehicleId,
    pricingType: bookingType,
    coverageZone,
    status: "active",
  });

  if (!pricing) {
    return res.status(404).json({
      success: false,
      message: `No ${bookingType.toUpperCase()} pricing found for this vehicle in ${coverageZone}`,
    });
  }

  // Calculate total price
  const priceBreakdown = calculateTotalPrice(pricing, {
    bookingType,
    distanceMiles,
    hours,
    extras,
  });

  // Get vehicle info
  const vehicle = await Vehicle.findById(vehicleId).select(
    "categoryName categoryDetails image numberOfPassengers vehicleType"
  );

  res.status(200).json({
    success: true,
    data: {
      vehicle: vehicle || { _id: vehicleId },
      pricing: priceBreakdown,
    },
  });
});

//  Get Quotes for All Available Vehicles
export const getAllVehicleQuotes = TryCatch(async (req, res, next) => {
  const {
    distanceKm,
    distanceMiles: inputMiles,
    hours = 4,
    passengers,
    luggage,
    coverageZone = "Entire UK Cover",
  } = req.body;

  // Calculate distance in miles
  let distanceMiles = inputMiles;
  if (!distanceMiles && distanceKm) {
    distanceMiles = kmToMiles(distanceKm);
  }
  if (!distanceMiles) {
    return res.status(400).json({
      success: false,
      message: "Distance is required",
    });
  }

  // Get available vehicles
  const vehicleFilter = {
    isActive: true,
    availability: "available",
    displayVehicles: true,
  };
  if (passengers) {
    vehicleFilter.numberOfPassengers = { $gte: parseInt(passengers) };
  }

  const vehicles = await Vehicle.find(vehicleFilter).sort({ listPriority: 1 });

  // Get pricing for each vehicle
  const vehiclesWithPricing = await Promise.all(
    vehicles.map(async (vehicle) => {
      // Get both P2P and Hourly pricing
      const [p2pPricing, hourlyPricing] = await Promise.all([
        Pricing.findOne({
          vehicle: vehicle._id,
          pricingType: "p2p",
          coverageZone,
          status: "active",
        }),
        Pricing.findOne({
          vehicle: vehicle._id,
          pricingType: "hourly",
          coverageZone,
          status: "active",
        }),
      ]);

      let p2pQuote = null;
      let hourlyQuote = null;

      if (p2pPricing) {
        const p2pCalc = calculateTotalPrice(p2pPricing, {
          bookingType: "p2p",
          distanceMiles,
        });
        p2pQuote = {
          available: true,
          total: p2pCalc.grandTotal,
          breakdown: p2pCalc.journey.breakdown,
          vatInclusive: p2pCalc.vatInclusive,
        };
      }

      if (hourlyPricing) {
        const hourlyCalc = calculateTotalPrice(hourlyPricing, {
          bookingType: "hourly",
          distanceMiles,
          hours,
        });
        hourlyQuote = {
          available: true,
          total: hourlyCalc.grandTotal,
          minimumHours: hourlyCalc.journey.minimumHours,
          hourlyRate: hourlyCalc.journey.hourlyRate,
          breakdown: hourlyCalc.journey.breakdown,
          vatInclusive: hourlyCalc.vatInclusive,
        };
      }

      return {
        _id: vehicle._id,
        categoryName: vehicle.categoryName,
        categoryDetails: vehicle.categoryDetails,
        image: vehicle.image,
        numberOfPassengers: vehicle.numberOfPassengers,
        numberOfBigLuggage: vehicle.numberOfBigLuggage,
        numberOfSmallLuggage: vehicle.numberOfSmallLuggage,
        vehicleType: vehicle.vehicleType,
        companyFeatures: vehicle.companyFeatures,
        pricing: {
          p2p: p2pQuote || { available: false },
          hourly: hourlyQuote || { available: false },
        },
        additionalCharges: {
          extraStopPrice: p2pPricing?.extras?.extraStopPrice || hourlyPricing?.extras?.extraStopPrice || 0,
          childSeatPrice: p2pPricing?.extras?.childSeatPrice || hourlyPricing?.extras?.childSeatPrice || 0,
          congestionCharge: p2pPricing?.extras?.congestionCharge || hourlyPricing?.extras?.congestionCharge || 0,
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    journey: {
      distanceMiles: parseFloat(distanceMiles.toFixed(2)),
      distanceKm: distanceKm || parseFloat((distanceMiles / 0.621371).toFixed(2)),
      hours,
      coverageZone,
    },
    count: vehiclesWithPricing.length,
    data: vehiclesWithPricing,
  });
});

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
      pricingType: "p2p",
      pointToPoint,
      hourly,
      extras,
    });
  }

  res.status(200).json({
    success: true,
    message: "Pricing rules updated successfully",
    data: pricing,
  });
});