import MedicalHistory from "../models/MedicalHistory.js";
import Patient        from "../models/Patient.js";
import Prescription from "../models/Prescription.js";

import openai from "../config/openai.js";
import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import pdfPoppler from "pdf-poppler";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import MedicalReport from "../models/MedicalReport.js";

// =============================================================================
// GET MEDICAL HISTORY FOR A PATIENT  (by patientId param — doctor / assistant)
// =============================================================================
export const getMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await MedicalHistory.find({ patientId })
      .populate({
        path:    "doctorId",
        // doctorId references Doctor model; Doctor has a userId reference to User
        populate: {
          path:   "userId",
          select: "name",   // ← User model stores full name in `name`, not firstName/lastName
          model:  "User",
        },
        model: "Doctor",
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      _id:           record._id,
      visitDate:     record.visitDate,
      diagnosis:     record.diagnosis,
      doctorName:    record.doctorId?.userId?.name || "Unknown Doctor",
      prescriptions: record.prescriptions,
      labTests:      record.labTests,
      notes:         record.notes,
      createdAt:     record.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error("❌ getMedicalHistory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============================================================================
// GET MY OWN MEDICAL HISTORY  (patient fetches their own)
// =============================================================================
export const getMyMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const history = await MedicalHistory.find({ patientId: patient._id })
      .populate({
        path:     "doctorId",
        populate: { path: "userId", select: "name", model: "User" },
        model:    "Doctor",
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      _id:           record._id,
      visitDate:     record.visitDate,
      diagnosis:     record.diagnosis,
      doctorName:    record.doctorId?.userId?.name || "Unknown Doctor",
      prescriptions: record.prescriptions,
      labTests:      record.labTests,
      notes:         record.notes,
      createdAt:     record.createdAt,
    }));
    console.log(`Fetched medical history for patient ${patient._id}:`, formattedHistory);
    res.status(200).json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error("❌ getMyMedicalHistory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ─────────────────────────────────────────────
// 🔧 ENSURE UPLOADS DIR EXISTS
// ─────────────────────────────────────────────
const UPLOADS_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// 🗑️ SAFE FILE DELETE (Windows-compatible)
// On Windows, Tesseract/Sharp hold a file lock briefly after finishing.
// We retry up to 5 times with a 200ms delay before giving up silently.
// ─────────────────────────────────────────────
const safeUnlink = async (filePath, retries = 5, delayMs = 200) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return; // success
    } catch (err) {
      if (i < retries - 1 && (err.code === "EPERM" || err.code === "EBUSY")) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.warn(`⚠️  Could not delete temp file ${filePath}:`, err.code);
        return; // give up silently — temp file stays but doesn't crash the request
      }
    }
  }
};

// ─────────────────────────────────────────────
// 🖼️ IMAGE PREPROCESSOR
// ─────────────────────────────────────────────
const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .resize({ width: 2480 })         // Upscale for better OCR accuracy
    .grayscale()
    .normalize()
    .linear(1.5, -30)                // Boost contrast
    .sharpen({ sigma: 1.5 })
    .threshold(128)                  // Pure black/white for Tesseract
    .toFile(outputPath);
};

// ─────────────────────────────────────────────
// 🔍 OCR FROM IMAGE FILE
// ─────────────────────────────────────────────
const extractTextFromImage = async (imagePath) => {
  const cleanPath = path.join(UPLOADS_DIR, `clean_${Date.now()}.png`);

  try {
    await preprocessImage(imagePath, cleanPath);

    const { data } = await Tesseract.recognize(cleanPath, "eng", {
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/()+% \n",
      preserve_interword_spaces: "1",
    });

    return data.text || "";
  } finally {
    await safeUnlink(cleanPath);
  }
};

// ─────────────────────────────────────────────
// 📄 PDF TEXT EXTRACTOR (TEXT-BASED PDF)
// ─────────────────────────────────────────────
const extractTextFromPDF = async (buffer) => {
  try {
    const pdfData = await pdfParse(buffer);
    return pdfData.text?.trim() || "";
  } catch (err) {
    console.warn("pdf-parse failed:", err.message);
    return "";
  }
};

// ─────────────────────────────────────────────
// 📄 PDF → IMAGE → OCR (SCANNED PDF FALLBACK)
// ─────────────────────────────────────────────
const extractTextFromScannedPDF = async (buffer) => {
  const timestamp = Date.now();
  const pdfPath = path.join(UPLOADS_DIR, `temp_${timestamp}.pdf`);
  let imagePath = null;

  try {
    fs.writeFileSync(pdfPath, buffer);

    const prefix = `page_${timestamp}`;
    await pdfPoppler.convert(pdfPath, {
      format: "png",
      out_dir: UPLOADS_DIR,
      out_prefix: prefix,
      page: 1,
    });

    // pdf-poppler can output -01 or -1 depending on version
    const possiblePaths = [
      path.join(UPLOADS_DIR, `${prefix}-01.png`),
      path.join(UPLOADS_DIR, `${prefix}-1.png`),
      path.join(UPLOADS_DIR, `${prefix}.png`),
    ];

    imagePath = possiblePaths.find((p) => fs.existsSync(p));

    if (!imagePath) {
      throw new Error(
        `PDF to image conversion failed — none of these found: ${possiblePaths.join(", ")}`
      );
    }

    const text = await extractTextFromImage(imagePath);
    return text;
  } finally {
    await safeUnlink(pdfPath);
    if (imagePath) await safeUnlink(imagePath);
  }
};

// ─────────────────────────────────────────────
// 🧹 CLEAN EXTRACTED TEXT
// ─────────────────────────────────────────────
const cleanText = (raw) =>
  raw
    .replace(/[^\x00-\x7F]/g, "")   // Remove non-ASCII
    .replace(/[ \t]+/g, " ")         // Collapse spaces
    .replace(/\n{3,}/g, "\n\n")      // Max 2 newlines
    .trim();

// ─────────────────────────────────────────────
// 🤖 GPT MEDICAL EXTRACTION
// ─────────────────────────────────────────────
const extractWithGPT = async (text) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a medical document parser. Extract structured data from medical reports. Always return valid JSON only — no markdown, no explanation.",
      },
      {
        role: "user",
        content: `
Extract ALL medical information from the report below.

RULES:
- Return ONLY a valid JSON object
- Every field must be an array of strings
- Extract as much as possible even from partial/unclear text
- doctor_notes should include any handwritten-style instructions or remarks
- If a field has no data, return an empty array []

Return exactly this structure:
{
  "extracted_text": "<full cleaned text>",
  "medical_terms": [],
  "medicines": [],
  "diagnoses": [],
  "dosages": [],
  "doctor_notes": []
}

Report Text:
${text}
        `,
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);

  // Safety: ensure all fields are string arrays
  const toStringArray = (val) =>
    Array.isArray(val) ? val.map((v) => String(v)) : [];

  return {
    extracted_text: String(parsed.extracted_text || ""),
    medical_terms: toStringArray(parsed.medical_terms),
    medicines: toStringArray(parsed.medicines),
    diagnoses: toStringArray(parsed.diagnoses),
    dosages: toStringArray(parsed.dosages),
    doctor_notes: toStringArray(parsed.doctor_notes),
  };
};

// ─────────────────────────────────────────────
// 🚀 MAIN CONTROLLER
// ─────────────────────────────────────────────
export const extractMedicalTerms = async (req, res) => {
  try {
    const { patientId } = req.body;

    // ── Validation ──────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File upload karo pehle (PDF ya image)",
      });
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "patientId required hai",
      });
    }

    let rawText = "";

    // ── PDF Flow ────────────────────────────
    if (req.file.mimetype === "application/pdf") {
      console.log("📄 PDF detected — trying direct text extraction...");

      rawText = await extractTextFromPDF(req.file.buffer);
      console.log(`Direct PDF text length: ${rawText.length}`);

      // If too short, it's likely a scanned PDF
      if (rawText.length < 30) {
        console.log("⚠️  Text too short — falling back to OCR on scanned PDF...");
        rawText = await extractTextFromScannedPDF(req.file.buffer);
        console.log(`Scanned PDF OCR text length: ${rawText.length}`);
      }

    // ── Image Flow ──────────────────────────
    } else if (req.file.mimetype.startsWith("image/")) {
      console.log("🖼️  Image detected — running OCR...");

      const imagePath = path.join(UPLOADS_DIR, `temp_${Date.now()}.png`);
      fs.writeFileSync(imagePath, req.file.buffer);

      try {
        rawText = await extractTextFromImage(imagePath);
      } finally {
        await safeUnlink(imagePath);
      }

    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${req.file.mimetype}. PDF ya image upload karo.`,
      });
    }

    // ── Clean Text ──────────────────────────
    const text = cleanText(rawText);
    console.log("📝 Final clean text:\n", text);

    if (text.length < 15) {
      return res.status(422).json({
        success: false,
        error:
          "Document se readable text extract nahi hua. " +
          "Check karo: file blurry/corrupted to nahi, ya sirf image hai without text.",
      });
    }

    // ── GPT Extraction ──────────────────────
    console.log("🤖 Sending to GPT for medical extraction...");
    
    const result = await extractWithGPT(text);

    // ── Save to DB ──────────────────────────
    const report = await MedicalReport.create({
  patientId,
  extractedData: result,
  filePath: req.file.originalname,
}).catch(err => {
  console.error("❌ DB Save Error:", err);  // Full error
  throw err;
});

    await Patient.findByIdAndUpdate(patientId, {
      $push: { medicalReports: report._id },
    });

    console.log("✅ Report saved:", report._id);

    return res.status(200).json({
      success: true,
      data: result,
      reportId: report._id,
    });

  } catch (error) {
    console.error("❌ extractMedicalTerms error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};