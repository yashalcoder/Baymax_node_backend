import mongoose from "mongoose";

const medicalHistorySchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    visitDate: {
      type: Date,
      required: true,
    },

    diagnosis: {
      type: String,
      required: true,
    },

    prescriptions: [
      {
        medicineName: { type: String, required: true },
        dosage: { type: String, required: true },
        duration: { type: String, required: true },
      },
    ],

    labTests: [
      {
        testName: String,
        result: String,
        normalRange: String,
      },
    ],

    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("MedicalHistory", medicalHistorySchema);
