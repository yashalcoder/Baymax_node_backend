import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

// Multer config for handling file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

// Handle file upload from frontend
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No audio file provided",
      });
    }

    console.log(
      "Received file:",
      req.file.originalname,
      "Size:",
      req.file.size
    );

    // Create FormData for FastAPI
    const formData = new FormData();
    // Change 'audio' to 'file' for FastAPI
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "recording.webm",
      contentType: req.file.mimetype,
    });

    // Send to FastAPI
    const response = await axios.post(
      `${FASTAPI_URL}/transcribe/audio`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      "❌ Error calling FastAPI:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      status: "error",
      message:
        error.response?.data?.message ||
        error.message ||
        "Transcription failed",
    });
  }
});

export default router;
