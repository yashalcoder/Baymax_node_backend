import express         from "express";
import cors            from "cors";
import path            from "path";
import authRoutes      from "./routes/authRoutes.js";
import doctorRouter    from "./routes/doctorRoutes.js";
import patientRoutes   from "./routes/patientRoutes.js";
import assistantRouter from "./routes/assistantRoutes.js";
import pharmacyRouter  from "./routes/pharmacyRoutes.js";
import laboratoryRouter from "./routes/laboratoryRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";
import diagnosisRoutes from "./routes/diagnosisRoutes.js";
import prescription from "./routes/prescription.js";
import ocrRoute from "./routes/ocr.js";
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRouter);
app.use("/api/patient", patientRoutes);
app.use("/api/assistants", assistantRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/laboratory", laboratoryRouter);
app.use("/api", transcribeRoutes);
app.use('/api/diagnosis', diagnosisRoutes);
app.use('/api/prescription', prescription);
app.use('/api/ocr', ocrRoute);
app.get("/", (req, res) => {
  res.json({ message: "Node API running successfully" });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ status: "error", message: err.message || "Internal server error" });
});

export default app;