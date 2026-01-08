import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  searchPatients,
  addPatient,
  addVitals,
} from "../controllers/assistantController.js";

const router = express.Router();

// Assistant Dashboard
router.get("/dashboard", authenticateToken, (req, res) => {
  if (req.user.role !== "assistant")
    return res.status(403).json({ message: "Forbidden" });

  res.json({
    message: `Hello ${req.user.role}, welcome to assistant dashboard`,
  });
});

// Search patient
router.get("/search", authenticateToken, (req, res, next) => {
  if (req.user.role !== "assistant")
    return res.status(403).json({ message: "Only assistants can search" });
  next();
}, searchPatients);

// Add new patient
router.post("/add", authenticateToken, (req, res, next) => {
  if (req.user.role !== "assistant")
    return res.status(403).json({ message: "Only assistants can add patients" });
  next();
}, addPatient);

// Add vitals
router.post("/:patientId/vitals", authenticateToken, (req, res, next) => {
  if (req.user.role !== "assistant")
    return res.status(403).json({ message: "Only assistants can add vitals" });
  next();
}, addVitals);

export default router;
