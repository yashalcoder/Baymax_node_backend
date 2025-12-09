import express from "express";
import cors from "cors";
import connectdb from "./config/db.js";
import path from "path";
import doctorRouter from "./routes/doctorRoutes.js";
import patientRouter from "./routes/patientRoutes.js";
import assistantRouter from "./routes/assistantRoutes.js";
import pharmacyRouter from "./routes/pharmacyRoutes.js";
import laboratoryRouter from "./routes/laboratoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";

const app = express();
connectdb();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Serve uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRouter);
app.use("/api/patients", patientRouter);
app.use("/api/assistants", assistantRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/laboratory", laboratoryRouter);
app.use("/api", transcribeRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Node API running successfully" });
});

export default app;
