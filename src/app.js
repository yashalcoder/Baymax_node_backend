// import express          from "express";
// import cors             from "cors";
// import path             from "path";
// import authRoutes       from "./routes/authRoutes.js";
// import doctorRouter     from "./routes/doctorRoutes.js";
// import patientRoutes    from "./routes/patientRoutes.js";
// import assistantRouter  from "./routes/assistantRoutes.js";
// import pharmacyRouter   from "./routes/pharmacyRoutes.js";
// import laboratoryRouter from "./routes/laboratoryRoutes.js";
// // import transcribeRoutes from "./routes/transcribeRoutes.js";//deloyment
// import diagnosisRoutes  from "./routes/diagnosisRoutes.js";
// import prescription     from "./routes/prescription.js";
// // import ocrRoute         from "./routes/ocr.js";//deployment
// import notificationRouter from "./routes/notificationRoutes.js"; // ← NEW

// const app = express();

// // ── Middleware ────────────────────────────────────────────────────────────────
// // app.use(cors({ origin: "http://localhost:3000", credentials: true }));
// const allowedOrigins = [
//   "http://localhost:3000",
//   process.env.FRONTEND_URL,
// ].filter(Boolean); //for deployment
// app.use(express.json());

// // ── Static files ──────────────────────────────────────────────────────────────
// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use("/api/auth",          authRoutes);
// app.use("/api/doctors",       doctorRouter);
// app.use("/api/patient",       patientRoutes);
// app.use("/api/assistants",    assistantRouter);
// app.use("/api/pharmacies",    pharmacyRouter);
// app.use("/api/laboratory",    laboratoryRouter);
// // app.use("/api",               transcribeRoutes);
// app.use("/api/diagnosis",     diagnosisRoutes);
// app.use("/api/prescription",  prescription);
// // app.use("/api/ocr",           ocrRoute);
// app.use("/api/notifications", notificationRouter); // ← NEW
// // ── OCR Route (safe - Vercel pe crash nahi karega) ────────────────────────────
// try {
//   const { default: ocrRoute } = await import("./routes/ocr.js");
//   app.use("/api/ocr", ocrRoute);
//   console.log("OCR route loaded");
// } catch (err) {
//   console.warn("OCR not available:", err.message);
//   app.use("/api/ocr", (_req, res) => {
//     res.status(503).json({ message: "OCR service not available on this server" });
//   });
// }

// // ── Transcribe Route (safe) ───────────────────────────────────────────────────
// try {
//   const { default: transcribeRoutes } = await import("./routes/transcribeRoutes.js");
//   app.use("/api", transcribeRoutes);
//   console.log("Transcribe route loaded");
// } catch (err) {
//   console.warn("Transcribe not available:", err.message);
// }
// app.get("/", (_req, res) => {
//   res.json({ message: "Node API running successfully" });
// });

// // ── 404 fallback ──────────────────────────────────────────────────────────────
// app.use((_req, res) => {
//   res.status(404).json({ status: "error", message: "Route not found" });
// });

// // ── Global error handler ──────────────────────────────────────────────────────
// // eslint-disable-next-line no-unused-vars
// app.use((err, _req, res, _next) => {
//   console.error("Unhandled error:", err);
//   res.status(500).json({ status: "error", message: err.message || "Internal server error" });
// });

// export default app;
import express from "express";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import doctorRouter from "./routes/doctorRoutes.js";

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Node API running successfully" });
});

app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

export default app;
