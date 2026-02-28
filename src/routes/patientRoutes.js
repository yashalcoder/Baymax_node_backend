import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import {
  getAllPatients,
  getPatientById,
  getMyPatientDashboard,
} from "../controllers/patientController.js";
import { getMedicalHistory } from "../controllers/medicalHistoryController.js";

const router = express.Router();

/**
 * ============================
 * Patient Dashboard
 * ============================
 * @route GET /api/patient/dashboard
 * Returns real data from DB for the logged-in patient
 */
router.get(
  "/dashboard",
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  },
  getMyPatientDashboard
);

/**
 * ============================
 * View Medical History (Patient)
 * ============================
 * @route   GET /api/patient/medical-history/:patientId
 */
router.get(
  "/medical-history/:patientId",
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  },
  getMedicalHistory
);

/**
 * ============================
 * Get All Patients (Admin/Doctor)
 * ============================
 */
router.get("/", authMiddleware, getAllPatients);

/**
 * ============================
 * Get Single Patient
 * ============================
 */
router.get("/:id", authMiddleware, getPatientById);

export default router;
