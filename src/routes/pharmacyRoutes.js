import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import {
  getAllPharmacies,
  getNearbyPharmacies,
  getPharmacyProfile,
  getMedicines,
  addMedicine,
  updateMedicine,
} from "../controllers/pharmacyController.js";

const router = express.Router();

// Reusable role guard — only pharmacy accounts pass through
const pharmacyOnly = (req, res, next) => {
  if (req.user?.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden: pharmacy accounts only" });
  next();
};

// ─────────────────────────────────────────────
// PUBLIC  (patients / no auth required)
// ─────────────────────────────────────────────
router.get("/",       getAllPharmacies);     // GET /api/pharmacies
router.get("/nearby",  getNearbyPharmacies);
router.get("/profile", authMiddleware, pharmacyOnly, getPharmacyProfile);
// ─────────────────────────────────────────────
// PROTECTED  (pharmacy owner — auth + role check)
// ─────────────────────────────────────────────
 // GET  /api/pharmacies/profile
router.get ("/medicines",                  authMiddleware, pharmacyOnly, getMedicines);       // GET  /api/pharmacies/medicines
router.post("/medicine",                   authMiddleware, pharmacyOnly, addMedicine);        // POST /api/pharmacies/medicine
router.put ("/medicine/:medicineId",       authMiddleware, pharmacyOnly, updateMedicine);     // PUT  /api/pharmacies/medicine/:medicineId

export default router;