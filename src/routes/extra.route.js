import express from 'express';
import {
  createExtra,
  getAllExtras,
  updateExtra,
  deleteExtra
} from '../controllers/extraController.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// Public routes
router.get('/', getAllExtras);

// Protected/Admin routes (add auth middleware later)
router.post('/', upload.single('icon'), createExtra);
router.put('/:id', updateExtra);
router.delete('/:id', deleteExtra);

export default router;