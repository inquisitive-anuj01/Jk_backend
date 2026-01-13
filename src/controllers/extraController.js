import { Extra } from '../models/extra.model.js';
import { TryCatch } from '../middlewares/error.js';

// Create extra
export const createExtra = TryCatch(async (req, res, next) => {
  const { name, description, price, type, maxQuantity } = req.body;

  const extra = await Extra.create({
    name,
    description,
    price,
    type,
    maxQuantity,
    icon: req.file?.path
  });

  res.status(201).json({
    success: true,
    message: 'Extra created successfully',
    data: extra
  });
});

// Get all extras
export const getAllExtras = TryCatch(async (req, res, next) => {
  const { isActive } = req.query;
  
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const extras = await Extra.find(filter).sort({ price: 1 });

  res.status(200).json({
    success: true,
    count: extras.length,
    data: extras
  });
});

// Update extra
export const updateExtra = TryCatch(async (req, res, next) => {
  const extra = await Extra.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!extra) {
    return res.status(404).json({
      success: false,
      message: 'Extra not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Extra updated successfully',
    data: extra
  });
});

// Delete extra
export const deleteExtra = TryCatch(async (req, res, next) => {
  const extra = await Extra.findByIdAndDelete(req.params.id);

  if (!extra) {
    return res.status(404).json({
      success: false,
      message: 'Extra not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Extra deleted successfully'
  });
});