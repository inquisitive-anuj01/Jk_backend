import express from "express";
import cors from "cors";
import { errorMiddleware } from "./src/middlewares/error.js";
import connectDB from "./src/db/database.js";
import dotenv from "dotenv";
// import userRoutes from "./routes/user.routes.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


// Middleware setup
app.use(cors());
app.use(express.json());
app.use(cookieParser());


// Routes setup
// app.use("/api/user", userRoutes);


// dummy route to check if the server is running
app.get("/", (req, res) => {
  res.send("Hi, Welcome to the server!");
});


// error handling middleware
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
})