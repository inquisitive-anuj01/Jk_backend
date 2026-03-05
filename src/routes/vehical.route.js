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
import { protectAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// Search available vehicles with fare calculation (used by customers)
router.post('/search', getAvailableVehiclesWithFare);

// ─── ADMIN ROUTES (require valid admin JWT) ───────────────────────────────────

// Get all vehicles (admin dashboard)
router.get('/', protectAdmin, getAllVehicles);

// Get single vehicle by ID
router.get('/:id', protectAdmin, getVehicleById);

// Create new vehicle
router.post('/', protectAdmin, upload.single('image'), createVehicle);

// Update vehicle
router.put('/:id', protectAdmin, upload.single('image'), updateVehicle);

// Delete vehicle
router.delete('/:id', protectAdmin, deleteVehicle);

// Update vehicle availability
router.patch('/:id/availability', protectAdmin, updateVehicleAvailability);

// Toggle vehicle active status
router.patch('/:id/toggle-status', protectAdmin, toggleVehicleStatus);

export default router;