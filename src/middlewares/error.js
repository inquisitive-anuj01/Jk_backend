const errorMiddleware = (err, req, res, next) => {
  // Set default values if not set
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  // Handle MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue).join(", ");
    err.message = `Duplicate value for field: ${duplicateField}`;
    err.statusCode = 400;
  }

  // Handle Mongoose Invalid ObjectId
  if (err.name === "CastError") {
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.statusCode = 400;
  }

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    err.message = `Validation Error: ${messages.join(", ")}`;
    err.statusCode = 400;
  }

  // Send response
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
  });
};


// TryCatch Middleware
// This function wraps an async function to catch errors and pass them to the next middleware 
const TryCatch = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export { errorMiddleware, TryCatch };
