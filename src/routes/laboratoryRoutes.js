
import express from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import Laboratory from "../models/Laboratory.js";
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

// ===========================
// PATIENT / PUBLIC ROUTE
// ===========================

// NEARBY LABORATORIES (PATIENT SIDE)
// Ex: GET /api/laboratory/nearby?lat=..&lng=..&tests=CBC,TSH
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, tests } = req.query;

    if (!lat || !lng || !tests) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const testList = String(tests)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (testList.length === 0) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const laboratories = await Laboratory.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: 3000,
        },
      },
      "tests.name": { $in: testList },
      "tests.available": true,
    }).select("labName location tests address");

    res.json(laboratories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
