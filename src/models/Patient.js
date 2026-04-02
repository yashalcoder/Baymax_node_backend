import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Medical Info
  bloodGroup: { type: String },
  allergies: { type: String },
  majorDisease: { type: String },
  currentMedications: { type: String },
  
  // Assignment — API mein use ho raha tha but schema mein nahi tha
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  assignedByAssistant: { type: mongoose.Schema.Types.ObjectId, ref: "Assistant" },
  
  // Vitals — expanded
  vitals: [
    {
      date: { type: Date, default: Date.now },
      temperature: Number,
      bloodPressure: String,
      heartRate: Number,
      sugarLevel: String,
      weight: Number,
      pulse: Number,
      respiratoryRate: Number,
      spO2: Number,
      notes: String,
    },
  ],
}, { timestamps: true });

export default mongoose.model("Patient", patientSchema);