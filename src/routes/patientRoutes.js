import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import {
  getMyPatientDashboard,
  getMyPrescriptions,
  downloadPrescriptionPDF,
  exportMedicalHistoryPDF,
} from "../controllers/patientController.js";
import { getMyMedicalHistory } from "../controllers/medicalHistoryController.js";

const router = express.Router();

// All patient routes require auth
router.get("/dashboard", authMiddleware, getMyPatientDashboard);

// ── Prescriptions ─────────────────────────────────────────────────────────────
// FIX: frontend calls /api/patient/my-prescriptions  (was /prescriptions)
router.get("/my-prescriptions", authMiddleware, getMyPrescriptions);

// FIX: frontend calls /api/patient/prescription/:id/pdf  (was /prescriptions/:id/download)
router.get("/prescription/:prescriptionId/pdf", authMiddleware, downloadPrescriptionPDF);

// ── Medical History ───────────────────────────────────────────────────────────
// GET /api/patient/my-medical-history  — patient views their own records
router.get("/my-medical-history", authMiddleware, getMyMedicalHistory);
// GET /api/patient/medical-history/export  — unchanged, backend was already correct
router.get("/medical-history/export", authMiddleware, exportMedicalHistoryPDF);

export default router;