import express from "express";
import Prescription from "../models/Prescription.js";
import { authenticateToken } from "../middlewares/jwt.js";

const router = express.Router();

// ===============================
// DOCTOR CREATES PRESCRIPTION
// ===============================
router.post("/", authenticateToken, async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ message: "Only doctors can prescribe" });
  }

  const prescription = await Prescription.create({
    doctorId: req.user.id,
    patientId: req.body.patientId,
    medicines: req.body.medicines,
    labTests: req.body.labTests,
    notes: req.body.notes,
  });

  res.status(201).json(prescription);
});

// ===============================
// PATIENT GETS OWN PRESCRIPTION
// ===============================
router.get("/me", authenticateToken, async (req, res) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({ message: "Only patients allowed" });
  }

  const prescription = await Prescription.findOne({
    patientId: req.user.id,
  })
    .sort({ createdAt: -1 })
    .populate("doctorId", "name email");

  res.json(prescription);
});

export default router;
