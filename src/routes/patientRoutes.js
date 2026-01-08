import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getAllPatients, getPatientById } from "../controllers/patientController.js";

const router = express.Router();

// Get all patients
router.get("/", authMiddleware, getAllPatients);

// Get single patient
router.get("/:id", authMiddleware, getPatientById);

// dashboard route
router.get("/patient", authMiddleware, (req, res) => {
  if (req.user.role !== "patient")
    return res.status(403).json({ message: "Forbidden" });

  res.json({
    message: `Hello ${req.user.role}, welcome to patient dashboard`,
  });
});

export default router;
