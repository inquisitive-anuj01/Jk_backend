import { Vehicle } from "../models/vehicle.model.js";
import { Pricing } from "../models/pricing.model.js";
import { Airport } from "../models/airport.model.js";
import { AirportPricing } from "../models/airportPricing.model.js";
import { TryCatch } from "../middlewares/error.js";
import fs from "fs";
import {
  calculateTotalPrice,
  calculateP2PPrice,
  calculateHourlyPrice,
  calculateAirportPrice,
  roundPrice,
  kmToMiles,
} from "../utils/pricingCalculator.js";
import {
  getDistanceAndDuration,
  geocodeAddress,
} from "../utils/googleMaps.js";

// DEFAULT COMPANY FEATURES
const DEFAULT_COMPANY_FEATURES = [
  "First class chauffeur",
  "Free 60 mins airport waiting",
  "Free 15 mins waiting for other journeys",
  "Includes meet & greet",
  "Free cancellation within 24 hours",
];

// ADMIN CONTROLLERS

//  CREATE NEW VEHICLE
export const createVehicle = TryCatch(async (req, res, next) => {
  const {
    categoryName,
    categoryDetails,
    numberOfPassengers,
    numberOfBigLuggage,
    numberOfSmallLuggage,
    listPriority = 0,
    vatExempt = false,
    dontCalculateVatForCashJobs = false,
    displayVehicles = true,
    displayPrice = true,
    minimumNoticePeriod = 120,
    displayWarningIfBookingWithinNoticePeriod = false,
    warningMessage = "",
    preventBookingWithinNoticePeriod = false,
    vehicleType,
    companyFeatures,
  } = req.body;

  // Validate: Image is required
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Vehicle image is required",
    });
  }

  // Check: Prevent duplicate vehicle categories
  const existingVehicle = await Vehicle.findOne({
    categoryName: categoryName.toLowerCase().trim(),
  });

  if (existingVehicle) {
    // Cleanup: Delete uploaded file if vehicle already exists
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Vehicle category with this name already exists",
    });
  }

  // Parse company features (if sent as JSON string from form-data)
  let features = companyFeatures;
  if (typeof companyFeatures === "string") {
    try {
      features = JSON.parse(companyFeatures);
    } catch (e) {
      features = DEFAULT_COMPANY_FEATURES;
    }
  } else if (!companyFeatures) {
    features = DEFAULT_COMPANY_FEATURES;
  }

  // Create vehicle in database
  const vehicle = await Vehicle.create({
    categoryName,
    categoryDetails,
    image: {
      url: req.file.path,
      filename: req.file.filename,
    },
    numberOfPassengers: parseInt(numberOfPassengers),
    numberOfBigLuggage: parseInt(numberOfBigLuggage),
    numberOfSmallLuggage: parseInt(numberOfSmallLuggage),
    listPriority: parseInt(listPriority),
    vatExempt: vatExempt === "true" || vatExempt === true,
    dontCalculateVatForCashJobs:
      dontCalculateVatForCashJobs === "true" ||
      dontCalculateVatForCashJobs === true,
    displayVehicles: displayVehicles === "true" || displayVehicles === true,
    displayPrice: displayPrice === "true" || displayPrice === true,
    minimumNoticePeriod: parseInt(minimumNoticePeriod),
    displayWarningIfBookingWithinNoticePeriod:
      displayWarningIfBookingWithinNoticePeriod === "true" ||
      displayWarningIfBookingWithinNoticePeriod === true,
    warningMessage,
    preventBookingWithinNoticePeriod:
      preventBookingWithinNoticePeriod === "true" ||
      preventBookingWithinNoticePeriod === true,
    vehicleType,
    companyFeatures: features,
  });

  res.status(201).json({
    success: true,
    message: "Vehicle created successfully",
    data: vehicle,
  });
});

//  GET ALL VEHICLES (Admin Dashboard)
export const getAllVehicles = TryCatch(async (req, res, next) => {
  const {
    vehicleType,
    minPassengers,
    isActive,
    sortBy = "listPriority",
    order = "asc",
  } = req.query;

  const filter = {};

  if (vehicleType) filter.vehicleType = vehicleType;
  if (minPassengers)
    filter.numberOfPassengers = { $gte: parseInt(minPassengers) };
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const sortOrder = order === "desc" ? -1 : 1;
  const sortOptions = { [sortBy]: sortOrder };

  const vehicles = await Vehicle.find(filter).sort(sortOptions);

  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles,
  });
});

// UPDATE VEHICLE
export const updateVehicle = TryCatch(async (req, res, next) => {
  const updates = req.body;

  // If new image is uploaded, replace old one
  if (req.file) {
    const oldVehicle = await Vehicle.findById(req.params.id);

    if (oldVehicle && oldVehicle.image?.url) {
      try {
        if (fs.existsSync(oldVehicle.image.url)) {
          fs.unlinkSync(oldVehicle.image.url);
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    updates.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
  }

  // Parse company features if sent as JSON string
  if (updates.companyFeatures && typeof updates.companyFeatures === "string") {
    try {
      updates.companyFeatures = JSON.parse(updates.companyFeatures);
    } catch (e) { }
  }

  // Convert minimumNoticePeriod to number if provided
  if (updates.minimumNoticePeriod) {
    updates.minimumNoticePeriod = parseInt(updates.minimumNoticePeriod);
  }

  // Check: If category name is being changed, ensure it's unique
  if (updates.categoryName) {
    const existingVehicle = await Vehicle.findOne({
      categoryName: updates.categoryName.toLowerCase().trim(),
      _id: { $ne: req.params.id },
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle category name already in use",
      });
    }
  }

  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Vehicle updated successfully",
    data: vehicle,
  });
});

//  DELETE VEHICLE

export const deleteVehicle = TryCatch(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  // Delete vehicle image file from server
  if (vehicle.image?.url) {
    try {
      if (fs.existsSync(vehicle.image.url)) {
        fs.unlinkSync(vehicle.image.url);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }

  await Vehicle.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Vehicle deleted successfully",
  });
});

//  UPDATE VEHICLE AVAILABILITY
export const updateVehicleAvailability = TryCatch(async (req, res, next) => {
  const { availability } = req.body;

  if (!["available", "unavailable", "maintenance"].includes(availability)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid availability status. Use: available, unavailable, or maintenance",
    });
  }

  const vehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    { availability },
    { new: true }
  );

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Vehicle availability updated",
    data: vehicle,
  });
});

// TOGGLE VEHICLE ACTIVE STATUS

export const toggleVehicleStatus = TryCatch(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  vehicle.isActive = !vehicle.isActive;
  await vehicle.save();

  res.status(200).json({
    success: true,
    message: `Vehicle ${vehicle.isActive ? "activated" : "deactivated"
      } successfully`,
    data: vehicle,
  });
});

// USERS CONTROLLERS

//  GET AVAILABLE VEHICLES FOR BOOKING (WITHOUT PRICING)
// Will not be going forward with this function controller
// export const getAvailableVehicles = TryCatch(async (req, res, next) => {
//   const {
//     passengers,
//     luggage,
//     distanceMiles,     
//     distanceKm,        
//     bookingType = "p2p", // 'p2p' or 'hourly'
//     hours = 4,         // For hourly booking
//     coverageZone = "Entire UK Cover",
//   } = req.query;

//   // Base filter: Only show bookable vehicles
//   const filter = {
//     isActive: true,
//     availability: "available",
//     displayVehicles: true,
//   };

//   // Filter by passengers
//   if (passengers) {
//     filter.numberOfPassengers = { $gte: parseInt(passengers) };
//   }

//   // Filter by luggage
//   if (luggage) {
//     filter.$or = [
//       { numberOfBigLuggage: { $gte: parseInt(luggage) } },
//       { numberOfSmallLuggage: { $gte: parseInt(luggage) } },
//     ];
//   }

//   const vehicles = await Vehicle.find(filter).sort({ listPriority: 1 });

//   // Calculate distance in miles
//   let miles = parseFloat(distanceMiles) || 0;
//   if (!miles && distanceKm) {
//     miles = kmToMiles(parseFloat(distanceKm));
//   }

//   // If no distance provided, return vehicles without pricing
//   if (!miles) {
//     return res.status(200).json({
//       success: true,
//       count: vehicles.length,
//       data: vehicles.map((v) => ({
//         ...v.toObject(),
//         pricing: null,
//         message: "Provide distanceMiles or distanceKm to get pricing",
//       })),
//     });
//   }

//   // Calculate pricing for each vehicle
//   const vehiclesWithPricing = await Promise.all(
//     vehicles.map(async (vehicle) => {
//       // Get pricing configuration for this vehicle
//       const pricing = await Pricing.findOne({
//         vehicle: vehicle._id,
//         pricingType: bookingType,
//         coverageZone,
//         status: "active",
//       });

//       let priceData = null;

//       if (pricing) {
//         // Calculate price using the pricing calculator
//         const priceResult = calculateTotalPrice(pricing, {
//           bookingType,
//           distanceMiles: miles,
//           hours: parseInt(hours),
//           extras: {},
//         });

//         priceData = {
//           bookingType,
//           distanceMiles: parseFloat(miles.toFixed(2)),

//           // Price breakdown (what you show in Payment Summary)
//           basePrice: priceResult.journey.total,  // Vehicle price before VAT
//           tax: priceResult.vatAmount,             // VAT amount
//           totalPrice: priceResult.grandTotal,     // Total payable

//           // Additional info
//           breakdown: priceResult.journey.breakdown,
//           vatInclusive: priceResult.vatInclusive,
//           vatRate: priceResult.vatRate,

//           // For hourly bookings
//           ...(bookingType === "hourly" && {
//             minimumHours: priceResult.journey.minimumHours,
//             hourlyRate: priceResult.journey.hourlyRate,
//             milesIncluded: priceResult.journey.milesIncluded,
//           }),

//           // Additional charges available
//           additionalCharges: {
//             extraStopPrice: pricing.extras?.extraStopPrice || 0,
//             childSeatPrice: pricing.extras?.childSeatPrice || 0,
//             congestionCharge: pricing.extras?.congestionCharge || 0,
//           },
//         };
//       }

//       return {
//         _id: vehicle._id,
//         categoryName: vehicle.categoryName,
//         categoryDetails: vehicle.categoryDetails,
//         image: vehicle.image,
//         numberOfPassengers: vehicle.numberOfPassengers,
//         numberOfBigLuggage: vehicle.numberOfBigLuggage,
//         numberOfSmallLuggage: vehicle.numberOfSmallLuggage,
//         vehicleType: vehicle.vehicleType,
//         companyFeatures: vehicle.companyFeatures,
//         displayPrice: vehicle.displayPrice,

//         // PRICING DATA
//         pricing: priceData,
//       };
//     })
//   );

//   res.status(200).json({
//     success: true,
//     journey: {
//       distanceMiles: parseFloat(miles.toFixed(2)),
//       bookingType,
//       hours: bookingType === "hourly" ? parseInt(hours) : null,
//       coverageZone,
//     },
//     count: vehiclesWithPricing.length,
//     data: vehiclesWithPricing,
//   });
// });

//  GET SINGLE VEHICLE BY ID
export const getVehicleById = TryCatch(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Vehicle not found",
    });
  }

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

//  GET AVAILABLE VEHICLES WITH FARE CALCULATION
export const getAvailableVehiclesWithFare = TryCatch(async (req, res, next) => {
  // DEBUG: Log what's being received
  console.log("=== BACKEND: /api/vehicles/search received ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const {
    pickupAddress,
    dropoffAddress,
    pickupDate,
    pickupTime,
    bookingType = "p2p",
    hours = 4,
    passengers,
    luggage,
    coverageZone = "Entire UK Cover",
  } = req.body;

  // Validate required fields
  if (!pickupAddress || !dropoffAddress) {
    console.log("ERROR: Missing addresses");
    return res.status(400).json({
      success: false,
      message: "Pickup and dropoff addresses are required",
    });
  }

  // Google Maps API Key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log("ERROR: No API key");
    return res.status(500).json({
      success: false,
      message: "Google Maps API key not configured",
    });
  }

  // Step 1: Geocode both addresses to get coordinates
  let pickupLocation, dropoffLocation;
  try {
    console.log("Geocoding addresses...");
    [pickupLocation, dropoffLocation] = await Promise.all([
      geocodeAddress(pickupAddress, apiKey),
      geocodeAddress(dropoffAddress, apiKey),
    ]);
    console.log("Geocoding successful:", { pickupLocation, dropoffLocation });
  } catch (error) {
    console.log("ERROR: Geocoding failed:", error.message);
    return res.status(400).json({
      success: false,
      message: "Failed to geocode addresses. Please check the addresses.",
      error: error.message,
    });
  }

  // Step 2: Calculate distance using Distance Matrix API
  let distanceData;
  try {
    console.log("Calculating distance...");
    distanceData = await getDistanceAndDuration(
      pickupLocation.coordinates,
      dropoffLocation.coordinates,
      apiKey
    );
    console.log("Distance calculated:", distanceData);
  } catch (error) {
    console.log("ERROR: Distance calculation failed:", error.message);
    return res.status(400).json({
      success: false,
      message: "Failed to calculate route distance. Make sure both locations are driveable (same continent).",
      error: error.message,
    });
  }

  const distanceKm = distanceData.distance;
  const durationMins = distanceData.duration;
  const distanceMiles = kmToMiles(distanceKm);

  // Step 3: Check if pickup or dropoff is a special location (airport, stadium, etc.)
  // Each location has its own radiusKm configured by admin

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Get all active special locations
  const allLocations = await Airport.find({ isActive: true });

  let pickupLocation_special = null;
  let dropoffLocation_special = null;

  // Check each location to see if pickup/dropoff falls within its radius
  for (const location of allLocations) {
    const locationRadius = location.radiusKm || 5; // Default 5km if not set

    // Check pickup
    if (!pickupLocation_special && location.coordinates?.lat && location.coordinates?.lng) {
      const pickupDistance = getDistanceKm(
        pickupLocation.coordinates.lat,
        pickupLocation.coordinates.lng,
        location.coordinates.lat,
        location.coordinates.lng
      );
      if (pickupDistance <= locationRadius) {
        pickupLocation_special = location;
      }
    }

    // Check dropoff
    if (!dropoffLocation_special && location.coordinates?.lat && location.coordinates?.lng) {
      const dropoffDistance = getDistanceKm(
        dropoffLocation.coordinates.lat,
        dropoffLocation.coordinates.lng,
        location.coordinates.lat,
        location.coordinates.lng
      );
      if (dropoffDistance <= locationRadius) {
        dropoffLocation_special = location;
      }
    }
  }

  // Use shorter variable names for backward compatibility
  const pickupAirport = pickupLocation_special;
  const dropoffAirport = dropoffLocation_special;

  // Determine if this is a special location journey
  const isAirportJourney = !!(pickupAirport || dropoffAirport);
  const pricingAirport = pickupAirport || dropoffAirport;

  console.log("Special Location detection:", {
    isAirportJourney,
    pickupCoords: pickupLocation.coordinates,
    dropoffCoords: dropoffLocation.coordinates,
    pickupLocation: pickupAirport ? `${pickupAirport.name} (${pickupAirport.locationType}, ${pickupAirport.radiusKm}km)` : null,
    dropoffLocation: dropoffAirport ? `${dropoffAirport.name} (${dropoffAirport.locationType}, ${dropoffAirport.radiusKm}km)` : null,
    usingLocation: pricingAirport?.name || null,
  });


  // Step 4: Build filter for available vehicles
  const filter = {
    isActive: true,
    availability: "available",
    displayVehicles: true,
  };

  if (passengers) {
    filter.numberOfPassengers = { $gte: parseInt(passengers) };
  }

  if (luggage) {
    filter.$or = [
      { numberOfBigLuggage: { $gte: parseInt(luggage) } },
      { numberOfSmallLuggage: { $gte: parseInt(luggage) } },
    ];
  }

  // Step 5: Fetch all available vehicles
  const vehicles = await Vehicle.find(filter).sort({ listPriority: 1 });

  // Step 6: Calculate pricing for each vehicle
  const vehiclesWithPricing = await Promise.all(
    vehicles.map(async (vehicle) => {
      let priceData = null;

      // ----- CHECK FOR AIRPORT PRICING FIRST -----
      if (isAirportJourney && pricingAirport) {
        // Try to get airport-specific pricing for this vehicle
        const airportPricing = await AirportPricing.findOne({
          airport: pricingAirport._id,
          vehicle: vehicle._id,
          status: "active",
        });

        if (airportPricing) {
          // Use airport pricing calculation
          const priceResult = calculateAirportPrice(airportPricing, distanceMiles, {
            isPickup: !!pickupAirport,
            isDropoff: !!dropoffAirport,
          });

          priceData = {
            bookingType: "airport", // Mark as airport pricing
            isAirportPricing: true,
            airportName: pricingAirport.name,

            // Price breakdown
            basePrice: priceResult.baseCharge + priceResult.distanceCharge,
            airportCharges: priceResult.airportCharges,
            congestionCharge: priceResult.congestionCharge,
            tax: priceResult.vatAmount,
            totalPrice: priceResult.totalPrice,

            // Breakdown
            breakdown: priceResult.breakdown,
            vatInclusive: priceResult.vatInclusive,
            vatRate: priceResult.vatRate,

            // Extra charges available
            additionalCharges: {
              extraStopPrice: airportPricing.extras?.extraStopPrice || 0,
              childSeatPrice: airportPricing.extras?.childSeatPrice || 0,
              congestionCharge: priceResult.congestionCharge,
              airportPickupCharge: airportPricing.extras?.airportPickupCharge || 0,
              airportDropoffCharge: airportPricing.extras?.airportDropoffCharge || 0,
            },
          };

          console.log(`Using AIRPORT pricing for ${vehicle.categoryName} at ${pricingAirport.name}`);
        }
      }

      // ----- FALLBACK TO STANDARD PRICING -----
      if (!priceData) {
        // Get standard pricing configuration for this vehicle
        const pricing = await Pricing.findOne({
          vehicle: vehicle._id,
          pricingType: bookingType,
          coverageZone,
          status: "active",
        });

        if (pricing) {
          // Get base journey price first (without extras and VAT)
          const journeyPrice = bookingType === "hourly"
            ? calculateHourlyPrice(pricing, parseInt(hours), distanceMiles)
            : calculateP2PPrice(pricing, distanceMiles);

          // Get congestion charge from pricing config
          const congestionCharge = pricing.extras?.congestionCharge || 0;

          // Calculate subtotal (base + congestion)
          const subtotalBeforeVAT = journeyPrice.total + congestionCharge;

          // Calculate VAT if displayVATInclusive is true
          const vatRate = 0.20; // 20% UK VAT
          const vatAmount = pricing.displayVATInclusive ? subtotalBeforeVAT * vatRate : 0;

          // Calculate grand total
          let grandTotal = subtotalBeforeVAT + vatAmount;

          // Apply rounding if configured
          if (pricing.priceRoundOff) {
            grandTotal = Math.round(grandTotal);
          }

          priceData = {
            bookingType,
            isAirportPricing: false,

            // Price breakdown
            basePrice: roundPrice(journeyPrice.total),
            congestionCharge: roundPrice(congestionCharge),
            tax: roundPrice(vatAmount),
            totalPrice: roundPrice(grandTotal),

            // Breakdown
            breakdown: journeyPrice.breakdown,
            vatInclusive: pricing.displayVATInclusive,
            vatRate: vatRate * 100,

            // For hourly bookings
            ...(bookingType === "hourly" && {
              minimumHours: journeyPrice.minimumHours,
              hourlyRate: journeyPrice.hourlyRate,
              milesIncluded: journeyPrice.milesIncluded,
            }),

            // Extra charges available
            additionalCharges: {
              extraStopPrice: pricing.extras?.extraStopPrice || 0,
              childSeatPrice: pricing.extras?.childSeatPrice || 0,
              congestionCharge: congestionCharge,
            },
          };
        }
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
        displayPrice: vehicle.displayPrice,

        // PRICING DATA
        pricing: priceData,
      };
    })
  );

  // Step 7: Return response
  res.status(200).json({
    success: true,

    // Journey information (calculated from addresses)
    journey: {
      pickup: {
        address: pickupLocation.address,
        coordinates: pickupLocation.coordinates,
        isAirport: !!pickupAirport,
        airportName: pickupAirport?.name || null,
      },
      dropoff: {
        address: dropoffLocation.address,
        coordinates: dropoffLocation.coordinates,
        isAirport: !!dropoffAirport,
        airportName: dropoffAirport?.name || null,
      },
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      distanceMiles: parseFloat(distanceMiles.toFixed(2)),
      durationMins,
      pickupDate,
      pickupTime,
      bookingType: isAirportJourney ? "airport" : bookingType,
      isAirportJourney,
      hours: bookingType === "hourly" ? parseInt(hours) : null,
      coverageZone,
    },

    // Vehicles with calculated prices
    count: vehiclesWithPricing.length,
    data: vehiclesWithPricing,
  });
});
