import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
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

export default router;