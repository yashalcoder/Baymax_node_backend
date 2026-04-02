import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import { authMiddleware } from "../middlewares/jwt.js";
import {
  getAllPharmacies,
  getNearbyPharmacies,
  getPharmacyProfile,
  updatePharmacyLocation,
  getMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  searchMedicines,
} from "../controllers/pharmacyController.js";

const router = express.Router();

const isPharmacy = (req, res, next) => {
  if (req.user.role !== "pharmacy")
    return res.status(403).json({ message: "Forbidden" });
  next();
};

// Pharmacy profile
router.get("/profile", authenticateToken, isPharmacy, getPharmacyProfile);
router.patch("/profile/location", authenticateToken, isPharmacy, updatePharmacyLocation);

// Medicine catalog
router.get("/medicines", authenticateToken, isPharmacy, getMedicines);
router.post("/medicine", authenticateToken, isPharmacy, addMedicine);
router.put("/medicine/:medicineId", authenticateToken, isPharmacy, updateMedicine);
router.delete("/medicine/:medicineId", authenticateToken, isPharmacy, deleteMedicine);

// Patient search — no auth needed
router.get("/search", searchMedicines);
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

export default router;