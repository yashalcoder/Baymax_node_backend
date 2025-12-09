import express from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // JWT middleware
import {
  registerDoctor,
  getDoctors,
  updateDoctorProfile,
} from "../controllers/doctorControllers.js";

const doctorRouter = express.Router();

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// -----------------------------
// PUBLIC ROUTES
// -----------------------------

// Register a new doctor (public route, or could be restricted later)
doctorRouter.post("/register-doctor", upload.single("file"), registerDoctor);

// Get all doctors (public)
doctorRouter.get("/doctors", getDoctors);

// -----------------------------
// PROTECTED ROUTES
// -----------------------------

// Update doctor profile (JWT protected & role-based)
doctorRouter.put("/doctor/profile", authMiddleware, (req, res, next) => {
  // Only allow doctors to update their profile
  if (req.user.role !== "doctor") {
    return res.status(403).json({ message: "Forbidden: Only doctors can update profile" });
  }
  next();
}, updateDoctorProfile);

export default doctorRouter;
