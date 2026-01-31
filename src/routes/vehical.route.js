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



export default router;