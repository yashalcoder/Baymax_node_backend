import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "patient",
        "doctor",
        "admin",
        "assistant",
        "laboratory",
        "pharmacy",
      ], 
      default: "patient",
    },
    password: {
      type: String,
      required: true, // optional if some users won't have password yet
    },
    // Additional optional fields for patient signup
    contact: { type: String },
    address: { type: String },
    allergies: { type: String },
    bloodGroup: { type: String },
    majorDisease: { type: String },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

const User = mongoose.model("User", userSchema);

export default User;
