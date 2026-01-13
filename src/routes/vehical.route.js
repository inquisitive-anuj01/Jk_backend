import express from 'express';
import {
  createVehicle,
  getAllVehicles,
  getAvailableVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  updateVehicleAvailability,
  toggleVehicleStatus // ADDED: Missing import
} from '../controllers/vehicleController.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// PUBLIC ROUTES 
// Get available vehicles for booking 
router.get('/available', getAvailableVehicles);

// Get single vehicle by ID
router.get('/:id', getVehicleById);

// ADMIN ROUTES
// TODO: Add isAuthenticated and isAdmin middleware

// Get all vehicles (admin dashboard)
router.get('/', getAllVehicles);

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