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

// import mongoose from "mongoose";

// const DoctorSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // Personal Info
//     firstName: { type: String, required: true, trim: true },
//     lastName: { type: String, required: true, trim: true },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
//     },

//     phone: {
//       type: String,
//       required: true,
//       match: /^[0-9+\-()\s]{8,20}$/,
//     },

//     alternatePhone: {
//       type: String,
//       match: /^[0-9+\-()\s]{8,20}$/,
//       default: null,
//     },

//     dateOfBirth: { type: String, required: true },

//     gender: {
//       type: String,
//       enum: ["male", "female", "other"],
//       required: true,
//     },

//     // Address
//     address: {
//       street: { type: String, required: true },
//       city: { type: String, required: true },
//       state: { type: String, required: true },
//       zipCode: { type: String, required: true },
//       country: { type: String, required: true },
//     },

//     // Medical Qualifications
//     medicalQualifications: {
//       degree: { type: String, required: true },
//       university: { type: String, required: true },
//       graduationYear: {
//         type: Number,
//         required: true,
//         min: 1950,
//         max: new Date().getFullYear(),
//       },
//       licenseNumber: { type: String, required: true },
//       licenseState: { type: String, required: true },
//       licenseExpiry: { type: String, required: true },
//     },

//     // Professional Data
//     professional: {
//       specialization: { type: String, required: true },
//       subSpecialization: { type: String },
//       experience: { type: Number, required: true, min: 0 },
//       currentHospital: { type: String, default: "Not specified" },
//       consultationFee: { type: Number, required: true, min: 0 },
//     },

//     availability: [
//       {
//         day: { type: String, required: true },
//         from: { type: String, required: true },
//         to: { type: String, required: true },
//       },
//     ],

//     languages: [{ type: String }],

//     bio: { type: String, required: true, minlength: 20 },

//     voiceFingerprint: {
//       audioPath: { type: String },
//     },

//     doctorId: { type: String }, // unique doctor identifier
//     password: { type: String }, // hashed by backend
//   },
//   { timestamps: true }
// );

// const Doctor = mongoose.model("Doctor", DoctorSchema);

// export default Doctor;
