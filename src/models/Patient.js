// import mongoose from "mongoose";

// const patientSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   bloodGroup: { type: String },
//   allergies: { type: String },
//   majorDisease: { type: String },
//   vitals: [
//     {
//       date: { type: Date, default: Date.now },
//       temperature: Number,
//       bloodPressure: String,
//       heartRate: Number,
//       notes: String,
//     },
//   ],
// });

// export default mongoose.model("Patient", patientSchema);

import mongoose from "mongoose";

// ─── Vitals sub-document ─────────────────────────────────────────────────────
// recordedAt is stored so the doctor always sees the newest entry first (FR-2.3).
// Vitals are append-only; no update/delete routes are exposed (FR-2.4).
const vitalSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, default: "" },   // e.g. "120/80"
    temperature:   { type: String, default: "" },   // e.g. "98.6°F"
    heartRate:     { type: String, default: "" },   // pulse, e.g. "72 bpm"
    notes:         { type: String, default: "" },
  },
  {
    timestamps: true,   // adds createdAt / updatedAt per vital entry
  }
);

// ─── Patient document ────────────────────────────────────────────────────────
const patientSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // Medical history (FR-1.4)
    bloodGroup:   { type: String, default: "" },
    allergies:    { type: String, default: "" },
    majorDisease: { type: String, default: "" },
    medications:  [{ type: String }],

    // Assignment
    assignedDoctor:       { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    assignedByAssistant:  { type: mongoose.Schema.Types.ObjectId, ref: "Assistant" },

    // Vitals history (FR-2.2 – FR-2.4)
    vitals: [vitalSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Patient", patientSchema);