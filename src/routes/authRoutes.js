import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import { login, getMe, refreshToken } from "../controllers/authControllers.js";
import { signup } from "../controllers/authController.js";

const authRoutes = express.Router();

// Signup route - uses authController.js
authRoutes.post("/signup", signup);

// Login route - uses authControllers.js
authRoutes.post("/login", login);

// Protected routes
authRoutes.get("/me", authenticateToken, getMe);
authRoutes.post("/refresh-token", authenticateToken, refreshToken);

export default authRoutes;
