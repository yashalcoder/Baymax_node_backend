
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getLabProfile,
  addTest,
  updateTest,
  getTests,
} from "../controllers/laboratoryController.js";

const router = express.Router();

// ---------------------------
// PROTECTED ROUTES
// ---------------------------

// Get lab profile
router.get("/profile", authMiddleware, (req, res, next) => {
  if (req.user.role !== "laboratory") return res.status(403).json({ message: "Forbidden" });
  next();
}, getLabProfile);

// Get all tests
router.get("/tests", authMiddleware, (req, res, next) => {
  if (req.user.role !== "laboratory") return res.status(403).json({ message: "Forbidden" });
  next();
}, getTests);

// Add new test
router.post("/test", authMiddleware, (req, res, next) => {
  if (req.user.role !== "laboratory") return res.status(403).json({ message: "Forbidden" });
  next();
}, addTest);

// Update test by ID
router.put("/test/:testId", authMiddleware, (req, res, next) => {
  if (req.user.role !== "laboratory") return res.status(403).json({ message: "Forbidden" });
  next();
}, updateTest);

export default router;
