import express         from "express";
import cors            from "cors";
import path            from "path";
import authRoutes      from "./routes/authRoutes.js";
import doctorRouter    from "./routes/doctorRoutes.js";
import patientRouter   from "./routes/patientRoutes.js";
import assistantRouter from "./routes/assistantRoutes.js";
import pharmacyRouter  from "./routes/pharmacyRoutes.js";
import laboratoryRouter from "./routes/laboratoryRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";


const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",       authRoutes);       // signup, login, profile, refresh-token, change-password
app.use("/api/doctors",    doctorRouter);
app.use("/api/patient",   patientRouter);    // admin/doctor: list & get patients
app.use("/api/assistants", assistantRouter);  // assistant dashboard, search, vitals
app.use("/api/pharmacies",   pharmacyRouter);
app.use("/api/laboratories", laboratoryRouter);
app.use("/api",            transcribeRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
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