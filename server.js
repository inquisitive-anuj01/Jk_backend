import express from "express";
import cors from "cors";
import { errorMiddleware } from "./src/middlewares/error.js";
import connectDB from "./src/db/database.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import vehicleRoutes from "./src/routes/vehical.route.js";
import bookingRoutes from "./src/routes/booking.route.js";
import extraRoutes from "./src/routes/extra.route.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes setup
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/extras", extraRoutes);

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
