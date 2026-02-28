import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import Pharmacy from "../models/Pharmacy.js";
import {
  getPharmacyProfile,
  addMedicine,
  updateMedicine,
  getMedicines,
} from "../controllers/pharmacyController.js";

const router = express.Router();

// ===========================
// PHARMACY DASHBOARD ROUTES
// ===========================

// Get pharmacy profile
router.get("/profile", authMiddleware, (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, getPharmacyProfile);

// Get all medicines
router.get("/medicines", authMiddleware, (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, getMedicines);

// Add new medicine
router.post("/medicine", authMiddleware, (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, addMedicine);

// Update medicine by ID
router.put("/medicine/:medicineId", authMiddleware, (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
}, updateMedicine);

// ===========================
// PATIENT / PUBLIC ROUTE
// ===========================

// NEARBY PHARMACIES (PATIENT SIDE)
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, medicines } = req.query;

    if (!lat || !lng || !medicines) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const medicineList = medicines.split(",");

    const pharmacies = await Pharmacy.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 3000
        }
      },
      "medicines.name": { $in: medicineList },
      "medicines.quantityAvailable": { $gt: 0 },
      isOpen: true
    }).select("pharmacyName location medicines address");

    res.json(pharmacies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
