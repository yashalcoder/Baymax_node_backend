// models/Consultation.js
import mongoose from "mongoose";
const ConsultationSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  transcript: String,
  conversation: Array,
  extractedEntities: {
    input_text: String,
    diseases: [String],
    chemicals_drugs: [String],
    severity: String,
    duration: String,
  },
  prescription: {
    diagnosis: String,
    prescription: Array,
    advice: [String],
    disclaimer: String,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Consultation', ConsultationSchema);