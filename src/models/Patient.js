import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodGroup: { type: String },
  allergies: { type: String },
  majorDisease: { type: String },
  vitals: [
    {
      date: { type: Date, default: Date.now },
      temperature: Number,
      bloodPressure: String,
      heartRate: Number,
      notes: String,
    },
  ],
});

export default mongoose.model("Patient", patientSchema);
