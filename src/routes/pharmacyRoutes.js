import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getPharmacyProfile,
  addMedicine,
  updateMedicine,
  getMedicines,
} from "../controllers/pharmacyController.js";

const router = express.Router();

// ---------------------------
// PROTECTED ROUTES
// ---------------------------

// Get pharmacy profile
router.get("/profile", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, getPharmacyProfile);

// Get all medicines
router.get("/medicines", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, getMedicines);

// Add new medicine
router.post("/medicine", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, addMedicine);

// Update medicine by ID
router.put("/medicine/:medicineId", authMiddleware, async (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, updateMedicine);

export default router;
