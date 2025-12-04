import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
      ], // you can expand roles if needed
      default: "patient",
    },
    password: {
      type: String,
      required: true, // optional if some users won't have password yet
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

const User = mongoose.model("User", userSchema);

export default User;
