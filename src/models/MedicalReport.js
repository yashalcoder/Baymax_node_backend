// models/MedicalReport.js
import mongoose from "mongoose";

const medicalReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    extractedData: {
      extracted_text: String,
      medical_terms: [String],
      medicines: [String],
      diagnoses: [String],
      dosages: [String],
    },

    filePath: String,
  },
  { timestamps: true }
);

export default mongoose.model("MedicalReport", medicalReportSchema);