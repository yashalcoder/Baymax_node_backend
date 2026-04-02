import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { authenticateToken } from "../middlewares/jwt.js";
import Doctor from "../models/doctor.js";
const router = express.Router();

// Multer config for handling file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";


router.post("/transcribe", authenticateToken, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No audio file provided",
      });
    }

    console.log("Received file:", req.file.originalname, "Size:", req.file.size);

    // ← Yeh add karo — JWT se doctor nikalo
    const doctorUserId = req.user.id;
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        message: "Doctor profile not found"
      });
    }

    console.log("Doctor found:", doctor._id, "userId:", doctor.userId);

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "recording.webm",
      contentType: req.file.mimetype,
    });
    
    // ← Fix — doctor.userId pass karo, req.body.doctorId nahi
    formData.append("doctor_id", doctor.userId.toString());
    formData.append("patient_id", req.body.patientId);
    console.log("Patient ID from request body:", req.body.patientId);
    const response = await axios.post(
      `${FASTAPI_URL}/consultation/start`,
      formData,
      {
        headers: { ...formData.getHeaders() },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("✅ FastAPI response:", response.data);
    return res.json(response.data);

  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: error.response?.data?.message || error.message || "Transcription failed",
    });
  }
});

export default router;