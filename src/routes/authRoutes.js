import express from "express";
import { authenticateToken } from "../middlewares/jwt.js";
import { login, getMe, refreshToken } from "../controllers/authControllers.js";

const authRoutes = express.Router();
authRoutes.post("/login", login);
authRoutes.get("/profile", authenticateToken, getMe);
authRoutes.post("/refresh-token", authenticateToken, refreshToken);

export default authRoutes;
