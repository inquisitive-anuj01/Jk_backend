import { Vehicle } from "../models/vehicle.model.js";
import { TryCatch } from "../middlewares/error.js";
import fs from "fs";

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
    } catch (e) {}
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
    message: `Vehicle ${
      vehicle.isActive ? "activated" : "deactivated"
    } successfully`,
    data: vehicle,
  });
});

// CUSTOMER CONTROLLERS

//  GET AVAILABLE VEHICLES FOR BOOKING
export const getAvailableVehicles = TryCatch(async (req, res, next) => {
  const { passengers, luggage } = req.query;

  // Base filter: Only show bookable vehicles
  const filter = {
    isActive: true,
    availability: "available",
    displayVehicles: true,
  };

  // Filter by passengers
  if (passengers) {
    filter.numberOfPassengers = { $gte: parseInt(passengers) };
  }

  // Filter by luggage
  if (luggage) {
    filter.$or = [
      { numberOfBigLuggage: { $gte: parseInt(luggage) } },
      { numberOfSmallLuggage: { $gte: parseInt(luggage) } },
    ];
  }

  const vehicles = await Vehicle.find(filter).sort({ listPriority: 1 });

  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles,
  });
});

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
