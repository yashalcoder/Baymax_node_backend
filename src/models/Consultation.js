// models/Consultation.js
import mongoose from "mongoose";

// Reusable prescription shape — used for both current & history
const prescriptionShape = {
  diagnosis:   String,
  prescription: Array,   // array of medicine objects
  advice:      [String],
  disclaimer:  String,
};

const ConsultationSchema = new mongoose.Schema({
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  transcript:  String,
  conversation: Array,
  extractedEntities: {
    input_text:      String,
    diseases:        [String],
    chemicals_drugs: [String],
    severity:        String,
    duration:        String,
  },

  // ── Current (latest) prescription ────────────────────────────────────────
  prescription: {
    ...prescriptionShape,
    lastUpdatedAt: { type: Date },   // set on every update
  },

  // ── History: every old version before it was updated ─────────────────────
  prescriptionHistory: [
    {
      ...prescriptionShape,
      replacedAt: { type: Date, default: Date.now }, // when this version was overwritten
    }
  ],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Consultation", ConsultationSchema);