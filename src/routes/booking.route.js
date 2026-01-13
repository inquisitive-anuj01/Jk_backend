import express from 'express';
import {
  calculateFare,
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking
} from '../controllers/bookingController.js';

const router = express.Router();

// Public routes
router.post('/calculate-fare', calculateFare);
router.post('/create', createBooking);

// Protected routes (add auth middleware later)
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.patch('/:id/status', updateBookingStatus);
router.post('/:id/cancel', cancelBooking);

export default router;