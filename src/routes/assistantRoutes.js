import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/assistant", authMiddleware, (req, res) => {
  if (req.user.role !== "assistant") return res.status(403).json({ message: "Forbidden" });
  res.json({ message: `Hello ${req.user.role}, welcome to assistant dashboard` });
});

export default router;
