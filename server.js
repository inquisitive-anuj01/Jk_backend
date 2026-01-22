import dotenv from "dotenv";
dotenv.config(); // Load env vars FIRST before other imports

import express from "express";
import cors from "cors";
import { errorMiddleware } from "./src/middlewares/error.js";
import connectDB from "./src/db/database.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import vehicleRoutes from "./src/routes/vehical.route.js";
import pricingRoutes from "./src/routes/pricing.route.js";
import airportRoutes from "./src/routes/airport.route.js";
import airportPricingRoutes from "./src/routes/airportPricing.route.js";
import bookingRoutes from "./src/routes/booking.route.js";
import paymentRoutes from "./src/routes/payment.route.js";
import adminRoutes from "./src/routes/admin.route.js";
const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setup
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes setup
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/airports", airportRoutes);
app.use("/api/airport-pricing", airportPricingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Dummy route to check if the server is running
app.get("/", (req, res) => {
  res.send("Hi, Welcome to the server!");
});

// Error handling middleware
app.use(errorMiddleware);

// Connect to the database and start the server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is up and running on port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  });


  export default app;