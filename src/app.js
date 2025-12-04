import express from "express";
import cors from "cors";
import connectdb from "./config/db.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import doctorRouter from "./routes/doctorRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";

const app = express();
connectdb();
app.use(
  cors({
    origin: "http://localhost:3000", // your Next.js frontend
    credentials: true, // if you send cookies or auth headers
  })
);

// Serve uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json());
app.use("/api/doctors", doctorRouter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Node API running successfully 🚀" });
});
app.use("/api", transcribeRoutes);
export default app;
