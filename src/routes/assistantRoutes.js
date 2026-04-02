import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  getDoctors,
  getMyPatients,
  searchPatients,
  addPatient,
  assignDoctor,
  addVitals,
  getPatientVitals,
} from "../controllers/assistantController.js";

const router = express.Router();

// ── Role guard ────────────────────────────────────────────────────────────────
const assistantOnly = (req, res, next) => {
  if (req.user?.role !== "assistant") {
    return res.status(403).json({ status: "error", message: "Forbidden: assistants only" });
  }
  next();
};

// ── Dashboard greeting ────────────────────────────────────────────────────────
router.get("/dashboard", authenticateToken, assistantOnly, (req, res) => {
  res.json({ message: `Hello ${req.user.role}, welcome to your assistant dashboard` });
});

// ── Doctors list (for dropdowns) ─────────────────────────────────────────────
router.get("/doctors", authenticateToken, assistantOnly, getDoctors);

// ── My patients ───────────────────────────────────────────────────────────────
router.get("/my-patients", authenticateToken, assistantOnly, getMyPatients);

// ── Search patients  (FR-2.1) ─────────────────────────────────────────────────
router.get("/search", authenticateToken, assistantOnly, searchPatients);

// ── Register new patient  (FR-1.2) ────────────────────────────────────────────
router.post("/add", authenticateToken, assistantOnly, addPatient);

// ── Assign doctor to existing patient ────────────────────────────────────────
router.put("/:patientId/assign-doctor", authenticateToken, assistantOnly, assignDoctor);

// ── Vitals  (FR-2.2 / FR-2.3 / FR-2.4) ──────────────────────────────────────
router.get( "/:patientId/vitals", authenticateToken, assistantOnly, getPatientVitals);
router.post("/:patientId/vitals", authenticateToken, assistantOnly, addVitals);

export default router;