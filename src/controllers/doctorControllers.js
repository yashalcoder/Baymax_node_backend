import bcrypt from "bcryptjs";
import Doctor from "../models/doctor.js";
import User from "../models/user.js";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import FormData from "form-data";
import multer from "multer";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// Multer setup (keep as-is)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // ✅ Extract extension from original filename
    const ext = path.extname(file.originalname) || ".webm"; // Default to .webm if no extension
    const nameWithoutExt = path.basename(file.originalname, ext);

    // Generate unique filename WITH extension
    const uniqueName = `${Date.now()}-${nameWithoutExt}${ext}`;

    console.log(`📁 Saving file as: ${uniqueName}`);
    cb(null, uniqueName);
  },
});
export const upload = multer({ storage });
import fs from "fs";
import axios from "axios";
const generateVoiceEmbedding = async (filePath) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎤 VOICE EMBEDDING GENERATION");
    console.log("=".repeat(60));
    console.log("[1/2] Sending audio to HuggingFace embedding service...");

    // Create form data with audio file
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    // Call FastAPI voice embedding service
    const response = await axios.post(
      "http://127.0.0.1:8000/transcribe/enroll-doctor", // Your FastAPI service
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000, // 60 second timeout
      }
    );

    if (response.data.status !== "success") {
      throw new Error("Voice embedding generation failed");
    }

    console.log("[2/2] ✅ Voice embedding generated successfully!");
    console.log(`   ➤ Model: ${response.data.metadata.model}`);
    console.log(
      `   ➤ Embedding dimension: ${response.data.metadata.embedding_dimension}D`
    );
    console.log(`   ➤ Framework: ${response.data.metadata.framework}`);
    console.log("=".repeat(60) + "\n");

    // Return the embedding array (768-dimensional vector)
    return response.data.embedding;
  } catch (error) {
    console.error("\n❌ Voice embedding error:");
    console.error("   ", error.response?.data || error.message);
    console.log("=".repeat(60) + "\n");
    throw new Error("Failed to generate voice embedding: " + error.message);
  }
};

// REGISTER DOCTOR
export const registerDoctor = async (req, res) => {
  try {
    const {
      doctorId,
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      country,
      medicalDegree,
      university,
      graduationYear,
      medicalLicense,
      licenseState,
      licenseExpiry,
      specialization,
      subSpecialization,
      experience,
      currentHospital,
      consultationFee,
      availability,
      languages,
      bio,
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        role: "doctor",
        password: await bcrypt.hash(password, 10),
      });
      await user.save();
    } else {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    const existingDoctor = await Doctor.findOne({
      $or: [{ email }, { doctorId }],
    });

    if (existingDoctor) {
      return res.status(400).json({
        status: "error",
        message: "Doctor with this email or ID already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Original path from multer
    let voiceAudioPath = req.file ? req.file.path : null;

    if (!voiceAudioPath) {
      return res.status(400).json({
        status: "error",
        message:
          "Voice sample is required. Registration cannot continue without it.",
      });
    }

    // Convert uploaded file to WAV
    const originalPath = req.file.path;
    const wavFilename = `${Date.now()}-converted.wav`;
    const wavPath = path.join("uploads/", wavFilename);

    console.log("🎧 Converting audio to WAV...");

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .toFormat("wav")
        .on("end", () => {
          console.log("✅ Converted to WAV:", wavPath);
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg conversion error:", err);
          reject(err);
        })
        .save(wavPath);
    });

    // Use WAV file for embedding
    voiceAudioPath = wavPath;

    // Remove original file to save space
    fs.unlinkSync(originalPath);

    console.log("Voice audio path:", voiceAudioPath);

    let voiceEmbedding;
    try {
      // Generate embedding using HuggingFace Wav2Vec2
      voiceEmbedding = await generateVoiceEmbedding(voiceAudioPath);
      console.log(
        `✅ Voice fingerprint created: ${voiceEmbedding.length}D vector`
      );
    } catch (error) {
      console.error("⚠️ Voice enrollment failed:", error.message);
      return res.status(500).json({
        status: "error",
        message:
          "Voice enrollment failed. Registration cannot continue without a valid voice sample.",
      });
    }

    // Save doctor
    const doctor = new Doctor({
      userId: user._id,
      doctorId:
        doctorId || `dr_${email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_")}`,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      gender,
      address: {
        street: address,
        city,
        state,
        zipCode,
        country,
      },
      voice_fingerprint: voiceEmbedding,
      medicalQualifications: {
        degree: medicalDegree,
        university,
        graduationYear,
        licenseNumber: medicalLicense,
        licenseState,
        licenseExpiry,
      },
      professional: {
        specialization,
        subSpecialization,
        experience,
        currentHospital,
        consultationFee,
      },

      availability: availability ? JSON.parse(availability) : [],
      languages: languages ? JSON.parse(languages) : [],
      bio,
    });

    await doctor.save();

    res.status(201).json({
      status: "success",
      message: "Doctor registered successfully",
      data: {
        doctorId: doctor.doctorId,
        name: `${doctor.firstName} ${doctor.lastName}`,
        email: doctor.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Registration failed",
    });
  }
};

// GET ALL DOCTORS
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .select("-password -voiceFingerprint")
      .limit(50);

    res.json({
      status: "success",
      count: doctors.length,
      data: doctors,
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch doctors",
    });
  }
};

// UPDATE DOCTOR PROFILE
export const updateDoctorProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      street,
      city,
      state,
      zipCode,
      country,
      degree,
      university,
      graduationYear,
      licenseNumber,
      licenseState,
      licenseExpiry,
      specialization,
      subSpecialization,
      experience,
      currentHospital,
      consultationFee,
      availability,
      languages,
      bio,
    } = req.body;

    const updates = {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,

      address: {
        street,
        city,
        state,
        zipCode,
        country,
      },

      medicalQualifications: {
        degree,
        university,
        graduationYear,
        licenseNumber,
        licenseState,
        licenseExpiry,
      },

      professional: {
        specialization,
        subSpecialization,
        experience,
        currentHospital,
        consultationFee,
      },

      availability: availability ? JSON.parse(availability) : [],
      languages: languages ? JSON.parse(languages) : [],
      bio,
    };

    const updated = await Doctor.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json({
      status: "success",
      message: "Profile updated successfully",
      data: updated,
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Failed to update profile",
    });
  }
};
