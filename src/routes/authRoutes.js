import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  signup,
  login,
  getMe,
  refreshToken,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

const authRoutes = express.Router();

// Public routes
authRoutes.post("/signup", signup);
authRoutes.post("/login", login);

// Protected routes
authRoutes.get("/profile", authenticateToken, getMe);
authRoutes.put("/profile", authenticateToken, updateProfile);
authRoutes.post("/refresh-token", authenticateToken, refreshToken);
authRoutes.put("/change-password", authenticateToken, changePassword);

export default authRoutes;