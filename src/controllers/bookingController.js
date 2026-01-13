import { Booking } from '../models/booking.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Extra } from '../models/extra.model.js';
import { 
  generateBookingNumber, 
  calculatePricing, 
  validatePickupTime 
} from '../utils/bookingHelper.js';
import { 
  getDistanceAndDuration, 
  geocodeAddress 
} from '../utils/googleMaps.js';
import { TryCatch } from '../middlewares/error.js';

// Step 1: Calculate fare and get available vehicles
export const calculateFare = TryCatch(async (req, res, next) => {
  const {
    pickupAddress,
    dropoffAddress,
    pickupDate,
    pickupTime,
    passengers = 1,
    luggage = 1
  } = req.body;

  // Validate required fields
  if (!pickupAddress || !dropoffAddress || !pickupDate || !pickupTime) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Combine date and time
  const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
  
  // Validate pickup time (minimum 30 minutes from now)
  try {
    validatePickupTime(pickupDateTime);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Geocode addresses
  const [pickupLocation, dropoffLocation] = await Promise.all([
    geocodeAddress(pickupAddress, process.env.GOOGLE_MAPS_API_KEY),
    geocodeAddress(dropoffAddress, process.env.GOOGLE_MAPS_API_KEY)
  ]);

  // Calculate distance and duration
  const { distance, duration } = await getDistanceAndDuration(
    pickupLocation.coordinates,
    dropoffLocation.coordinates,
    process.env.GOOGLE_MAPS_API_KEY
  );

  // Get available vehicles
  const availableVehicles = await Vehicle.find({
    isActive: true,
    availability: 'available',
    maxPassengers: { $gte: passengers },
    maxLuggage: { $gte: luggage }
  });

  // Calculate pricing for each vehicle
  const vehiclesWithPricing = availableVehicles.map(vehicle => {
    const pricing = calculatePricing(
      vehicle,
      distance,
      duration,
      [],
      pickupDateTime
    );

    return {
      _id: vehicle._id,
      name: vehicle.name,
      type: vehicle.type,
      make: vehicle.make,
      model: vehicle.model,
      images: vehicle.images,
      maxPassengers: vehicle.maxPassengers,
      maxLuggage: vehicle.maxLuggage,
      amenities: vehicle.amenities,
      distance: parseFloat(distance.toFixed(2)),
      duration,
      pricing,
      isAvailable: true
    };
  });

  res.status(200).json({
    success: true,
    data: {
      journey: {
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        pickupDateTime: pickupDateTime.toISOString(),
        distance: parseFloat(distance.toFixed(2)),
        duration
      },
      vehicles: vehiclesWithPricing
    }
  });
});

// Step 2: Create booking (with vehicle selection and extras)
export const createBooking = TryCatch(async (req, res, next) => {
  const {
    // Journey details
    pickupAddress,
    dropoffAddress,
    pickupDate,
    pickupTime,
    
    // Vehicle selection
    vehicleId,
    
    // Extras
    extras = [],
    
    // Passenger details
    passengerDetails,
    
    // Flight details (optional)
    flightDetails,
    
    // Special instructions
    specialInstructions
  } = req.body;

  // Validate required fields
  if (!vehicleId || !passengerDetails) {
    return res.status(400).json({
      success: false,
      message: 'Vehicle ID and passenger details are required'
    });
  }

  // Get vehicle
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || !vehicle.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found or unavailable'
    });
  }

  // Combine date and time
  const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
  validatePickupTime(pickupDateTime);

  // Geocode addresses
  const [pickupLocation, dropoffLocation] = await Promise.all([
    geocodeAddress(pickupAddress, process.env.GOOGLE_MAPS_API_KEY),
    geocodeAddress(dropoffAddress, process.env.GOOGLE_MAPS_API_KEY)
  ]);

  // Calculate distance and duration
  const { distance, duration } = await getDistanceAndDuration(
    pickupLocation.coordinates,
    dropoffLocation.coordinates,
    process.env.GOOGLE_MAPS_API_KEY
  );

  // Get extras with quantities
  const selectedExtras = [];
  let extrasTotal = 0;

  for (const extraItem of extras) {
    const extra = await Extra.findById(extraItem.extraId);
    if (extra && extra.isActive) {
      const quantity = Math.min(extraItem.quantity || 1, extra.maxQuantity);
      selectedExtras.push({
        extraId: extra._id,
        name: extra.name,
        price: extra.price,
        quantity
      });
      extrasTotal += extra.price * quantity;
    }
  }

  // Calculate pricing
  const pricing = calculatePricing(
    vehicle,
    distance,
    duration,
    selectedExtras,
    pickupDateTime
  );

  // Create booking
  const booking = await Booking.create({
    bookingNumber: generateBookingNumber(),
    user: req.user?._id || null, // Will be null if user not logged in
    pickup: {
      address: pickupLocation.address,
      coordinates: pickupLocation.coordinates,
      date: pickupDateTime,
      time: pickupTime
    },
    dropoff: {
      address: dropoffLocation.address,
      coordinates: dropoffLocation.coordinates
    },
    distanceKm: parseFloat(distance.toFixed(2)),
    durationMins: duration,
    vehicle: vehicleId,
    selectedExtras,
    passengerDetails,
    flightDetails: flightDetails || { isAirportPickup: false },
    specialInstructions,
    pricing,
    status: 'draft'
  });

  // Update vehicle availability
  await Vehicle.findByIdAndUpdate(vehicleId, { availability: 'booked' });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: {
      booking,
      paymentRequired: true,
      amount: pricing.totalAmount
    }
  });
});

// Get all bookings (Admin)
export const getAllBookings = TryCatch(async (req, res, next) => {
  const {
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20
  } = req.query;

  const filter = {};
  
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter['pickup.date'] = {};
    if (dateFrom) filter['pickup.date'].$gte = new Date(dateFrom);
    if (dateTo) filter['pickup.date'].$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('vehicle', 'name type make model')
      .populate('user', 'firstName lastName email phone')
      .sort({ 'pickup.date': 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Booking.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: bookings
  });
});

// Get booking by ID
export const getBookingById = TryCatch(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('vehicle')
    .populate('user', 'firstName lastName email phone')
    .populate('selectedExtras.extraId');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// Update booking status
export const updateBookingStatus = TryCatch(async (req, res, next) => {
  const { status } = req.body;
  
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // If booking is cancelled, make vehicle available again
  if (status === 'cancelled') {
    await Vehicle.findByIdAndUpdate(booking.vehicle, { 
      availability: 'available' 
    });
  }

  res.status(200).json({
    success: true,
    message: 'Booking status updated',
    data: booking
  });
});

// Cancel booking
export const cancelBooking = TryCatch(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  // Check if booking can be cancelled (minimum 2 hours before pickup)
  const pickupTime = new Date(booking.pickup.date);
  const now = new Date();
  const hoursBeforePickup = (pickupTime - now) / (1000 * 60 * 60);

  if (hoursBeforePickup < 2) {
    return res.status(400).json({
      success: false,
      message: 'Bookings can only be cancelled at least 2 hours before pickup'
    });
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body.reason;
  await booking.save();

  // Make vehicle available again
  await Vehicle.findByIdAndUpdate(booking.vehicle, { 
    availability: 'available' 
  });

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully'
  });
});