import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  getAllLaboratories,
  getLabTests,
  getNearbyLaboratories,
  getLabProfile,
  addTest,
  updateTest,
  getTests,
  deleteTest,
  updateLabLocation,
  searchLabTests,
} from "../controllers/laboratoryController.js";

const router = express.Router();

const isLab = (req, res, next) => {
  if (req.user.role !== "laboratory")
    return res.status(403).json({ message: "Forbidden" });
  next();
};

// Lab profile
router.get("/profile", authenticateToken, isLab, getLabProfile);
router.patch("/profile/location", authenticateToken, isLab, updateLabLocation);

// Test catalog
router.get("/tests", authenticateToken, isLab, getTests);
router.post("/test", authenticateToken, isLab, addTest);
router.put("/test/:testId", authenticateToken, isLab, updateTest);
router.delete("/test/:testId", authenticateToken, isLab, deleteTest);

// Patient search — no auth needed
router.get("/search", searchLabTests);


// ─────────────────────────────────────────────
// PUBLIC  (patients / no auth required)
// ─────────────────────────────────────────────
router.get("/",       getAllLaboratories);     // GET /api/laboratories
router.get("/tests",  getLabTests);            // GET /api/laboratories/tests
router.get("/nearby", getNearbyLaboratories);  // GET /api/laboratories/nearby?lat=&lng=&tests=



export default router;