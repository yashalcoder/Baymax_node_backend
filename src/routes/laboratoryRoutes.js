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

// ─── Lab owner (protected) ───────────────────────────────────────────────────
router.get("/profile",          authenticateToken, isLab, getLabProfile);
router.patch("/profile/location", authenticateToken, isLab, updateLabLocation);

// FIX: renamed from /tests → /my-tests so it no longer conflicts with
// the public GET /tests route below.
router.get("/my-tests",         authenticateToken, isLab, getTests);
router.post("/test",            authenticateToken, isLab, addTest);
router.put("/test/:testId",     authenticateToken, isLab, updateTest);
router.delete("/test/:testId",  authenticateToken, isLab, deleteTest);

// ─── Public (patients, no auth) ──────────────────────────────────────────────
router.get("/search",  searchLabTests);
router.get("/",        getAllLaboratories);    // GET /api/laboratories
router.get("/tests",   getLabTests);           // GET /api/laboratories/tests  ← now reachable
router.get("/nearby",  getNearbyLaboratories); // GET /api/laboratories/nearby

export default router;