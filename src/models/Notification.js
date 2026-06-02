import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ["doctor", "assistant", "patient", "pharmacy", "laboratory"],
      required: true,
    },
    type: {
      type: String,
      enum: ["patient_assigned", "patient_discharged", "vitals_added", "general"],
      default: "general",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      patientId:   { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
      patientName: { type: String },
      patientEmail:{ type: String },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);