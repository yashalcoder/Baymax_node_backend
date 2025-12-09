import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, (req, res) => {
  if (req.user.role !== "patient") return res.status(403).json({ message: "Forbidden" });
  res.json({ message: `Hello ${req.user.role}, welcome to patient dashboard` });
});

export default router;
