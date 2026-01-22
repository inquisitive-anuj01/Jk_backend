import express from 'express';
import {
  createVehicle,
  getAllVehicles,
  getAvailableVehiclesWithFare,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  updateVehicleAvailability,
  toggleVehicleStatus
} from '../controllers/vehicleController.js';
import {
  setP2PPricing,
  setHourlyPricing,
} from '../controllers/pricingController.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// PUBLIC ROUTES 

// Search Available Vehicles With Fare calculation in same !
// going forward with this to calculate fare 
router.post('/search', getAvailableVehiclesWithFare);

// Get available vehicles (if frontend already calculated distance)
// not going forware with this !
// router.get('/available', getAvailableVehicles);


// Get pricing for a vehicle
// router.get('/:id/pricing', getVehiclePricing);

// ADMIN ROUTES
// TODO: Add isAuthenticated and isAdmin middleware

// Get all vehicles (admin dashboard)
router.get('/', getAllVehicles);

// Get single vehicle by ID
router.get('/:id', getVehicleById);

// Create new vehicle 
router.post('/', upload.single('image'), createVehicle);

// Update vehicle 
router.put('/:id', upload.single('image'), updateVehicle);

// Delete vehicle
router.delete('/:id', deleteVehicle);

// Update vehicle availability
router.patch('/:id/availability', updateVehicleAvailability);

// Toggle vehicle active status 
router.patch('/:id/toggle-status', toggleVehicleStatus);

// Set P2P pricing for a vehicle (Admin)
router.put('/:id/pricing/p2p', setP2PPricing);

// Set Hourly pricing for a vehicle (Admin)
router.put('/:id/pricing/hourly', setHourlyPricing);

export default router;