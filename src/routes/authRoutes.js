import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  signup,
  login,
  getMe,
  updateProfile,
  refreshToken,
  changePassword,
} from "../controllers/authController.js";

const authRoutes = express.Router();

// ── Public routes — no token needed ──────────────────────────────────────────
authRoutes.post("/signup",          signup);
authRoutes.post("/login",           login);

// ── Protected routes — valid JWT required ─────────────────────────────────────
authRoutes.get( "/profile",         authenticateToken, getMe);
authRoutes.put( "/profile",         authenticateToken, updateProfile);   // ← NEW: update name/contact/address
authRoutes.post("/refresh-token",   authenticateToken, refreshToken);
authRoutes.put( "/change-password", authenticateToken, changePassword);

export default authRoutes;