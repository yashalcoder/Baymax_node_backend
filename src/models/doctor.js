import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    alternatePhone: { type: String },

    dateOfBirth: { type: String },
    gender: { type: String },

    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },

    medicalQualifications: {
      degree: { type: String },
      university: { type: String },
      graduationYear: { type: Number },
      licenseNumber: { type: String },
      licenseState: { type: String },
      licenseExpiry: { type: String },
    },

    professional: {
      specialization: { type: String },
      subSpecialization: { type: String },
      experience: { type: String },
      currentHospital: { type: String },
      consultationFee: { type: Number },
    },
    voice_fingerprint: { type: [Number], default: [] },
    availability: [
      {
        day: { type: String }, // Example: Monday
        from: { type: String }, // Example: "09:00"
        to: { type: String }, // Example: "17:00"
      },
    ],

    languages: [{ type: String }],

    bio: { type: String },

    voiceFingerprint: {
      audioPath: { type: String },
    },

    password: { type: String }, // hashed password (backend auto)
    doctorId: { type: String },
  },
  { timestamps: true }
);

const Doctor = mongoose.model("Doctor", DoctorSchema);

export default Doctor;
