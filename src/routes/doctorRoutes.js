import express from "express";
import multer from "multer";
import { authenticateToken } from "../middlewares/jwt.js";
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
doctorRouter.put("/update/profile", authenticateToken, updateDoctorProfile);

export default doctorRouter;
