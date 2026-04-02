import MedicalHistory from "../models/MedicalHistory.js";
import openai from "../config/openai.js";
export const getMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await MedicalHistory.find({ patientId })
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "firstName lastName",
        },
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      visitDate: record.visitDate,
      diagnosis: record.diagnosis,
      doctorName: `${record.doctorId.userId.firstName} ${record.doctorId.userId.lastName}`,
      prescriptions: record.prescriptions,
      labTests: record.labTests,
      notes: record.notes,
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import pdfPoppler from "pdf-poppler";

import MedicalReport from "../models/MedicalReport.js";
import Patient from "../models/Patient.js";

// 🔥 IMAGE PREPROCESS
const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);
};

export const extractMedicalTerms = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File upload karo pehle",
      });
    }

    let text = "";
    let imagePath = "";

    // 🔥 PDF → IMAGE (BETTER THAN pdfreader)
    if (req.file.mimetype === "application/pdf") {
      const pdfPath = path.join("uploads", `temp_${Date.now()}.pdf`);
      fs.writeFileSync(pdfPath, req.file.buffer);

      const opts = {
        format: "png",
        out_dir: "uploads",
        out_prefix: `page_${Date.now()}`,
        page: 1,
      };

      await pdfPoppler.convert(pdfPath, opts);
      imagePath = `uploads/${opts.out_prefix}-1.png`;

      fs.unlinkSync(pdfPath);
    } else {
      imagePath = path.join("uploads", `temp_${Date.now()}.png`);
      fs.writeFileSync(imagePath, req.file.buffer);
    }

    // 🔥 PREPROCESS IMAGE
    const cleanPath = path.join("uploads", `clean_${Date.now()}.png`);
    await preprocessImage(imagePath, cleanPath);

    // 🔥 TESSERACT WITH CONFIG
    const { data } = await Tesseract.recognize(cleanPath, "eng", {
      tessedit_pageseg_mode: 6, // 🔥 important
    });

    text = data.text;

    // cleanup
    fs.unlinkSync(imagePath);
    fs.unlinkSync(cleanPath);

    // 🔥 CLEAN TEXT
    text = text
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\n+/g, "\n")
      .trim();

    console.log("Clean OCR Text:", text);

    // 🔥 GPT EXTRACTION (UPDATED WITH NOTES)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
Extract ALL medical info from the report.

IMPORTANT RULES:
- Return ONLY JSON
- medicines MUST be array of strings
- diagnoses MUST be array of strings
- dosages MUST be array of strings
- doctor_notes MUST be extracted even if text is unclear

Text:
${text}

Return format:

{
  "extracted_text": "",
  "medical_terms": [],
  "medicines": [],
  "diagnoses": [],
  "dosages": [],
  "doctor_notes": []
}
`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0].message.content
    );

    // 🔥 LIGHT SAFETY (avoid crash)
    result.medicines = result.medicines?.map(m => String(m));
    result.diagnoses = result.diagnoses?.map(d => String(d));
    result.dosages = result.dosages?.map(d => String(d));
    result.doctor_notes = result.doctor_notes?.map(n => String(n));

    // 🔥 SAVE REPORT
    const report = await MedicalReport.create({
      patientId,
      extractedData: result,
      filePath: req.file.originalname,
    });

    // 🔗 LINK WITH PATIENT
    await Patient.findByIdAndUpdate(patientId, {
      $push: { medicalReports: report._id },
    });

    return res.status(200).json({
      success: true,
      data: result,
      reportId: report._id,
    });

  } catch (error) {
    console.error("Error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};