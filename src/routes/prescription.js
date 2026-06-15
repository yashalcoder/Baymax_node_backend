import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import { getPrescription, updatePrescription, getPrescriptionHistory } from "../controllers/prescriptionController.js";

const router = express.Router();

// GET current prescription for a consultation
router.get("/:consultationId", authenticateToken, getPrescription);

// GET full version history (current + all old versions)
router.get("/:consultationId/history", authenticateToken, getPrescriptionHistory);

// PUT update prescription (auto-archives the old one)
router.put("/:consultationId", authenticateToken, updatePrescription);   

export default router;