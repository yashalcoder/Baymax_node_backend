import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    medicines: [
      {
        name: { type: String, required: true },
        dosage: String,
        frequency: String,
        duration: String
      }
    ],

    labTests: [
      {
        type: String
      }
    ],

    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
