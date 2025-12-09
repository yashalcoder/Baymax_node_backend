import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
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
      ], // you can expand roles if needed
      default: "patient",
    },

    address: {
      type: String,
      default: null,
    },
    // Additional optional fields for patient signup
    contact: { type: String },
    address: { type: String },
    allergies: { type: String },
    bloodGroup: { type: String },
    majorDisease: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", UserSchema);
