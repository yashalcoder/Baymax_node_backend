import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import {
  getAllLaboratories,
  getLabTests,
  getNearbyLaboratories,
  getLabProfile,
  getTests,
  addTest,
  updateTest,
} from "../controllers/laboratoryController.js";

const router = express.Router();

// Reusable role guard — only lab accounts pass through
const labOnly = (req, res, next) => {
  if (req.user?.role !== "laboratory")
    return res.status(403).json({ message: "Forbidden: lab accounts only" });
  next();
};

// ─────────────────────────────────────────────
// PUBLIC  (patients / no auth required)
// ─────────────────────────────────────────────
router.get("/",       getAllLaboratories);     // GET /api/laboratories
router.get("/tests",  getLabTests);            // GET /api/laboratories/tests
router.get("/nearby", getNearbyLaboratories);  // GET /api/laboratories/nearby?lat=&lng=&tests=

// ─────────────────────────────────────────────
// PROTECTED  (lab owner — auth + role check)
// ─────────────────────────────────────────────
router.get ("/profile",                authMiddleware, labOnly, getLabProfile);  // GET    /api/laboratories/profile
router.get ("/profile/tests",          authMiddleware, labOnly, getTests);       // GET    /api/laboratories/profile/tests
router.post("/profile/tests",          authMiddleware, labOnly, addTest);        // POST   /api/laboratories/profile/tests
router.put ("/profile/tests/:testId",  authMiddleware, labOnly, updateTest);     // PUT    /api/laboratories/profile/tests/:testId

export default router;