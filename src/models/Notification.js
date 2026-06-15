import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient (FR-8.4) ────────────────────────────────────────────────────
    recipientId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    // recipientRole is the critical field that isolates notifications per role.
    // The GET /api/notifications route filters on BOTH recipientId AND recipientRole,
    // so a patient and a doctor who share the same User._id (impossible in this
    // schema, but defensive) would still never see each other's notifications.
    recipientRole: {
      type:     String,
      enum:     ["doctor", "assistant", "patient", "pharmacy", "laboratory"],
      required: true,
      index:    true,   // ← index for fast role-filtered queries
    },

    // ── Type (FR-8.1 = patient_assigned → doctor,  FR-8.2 = prescription_sent → patient)
    type: {
      type: String,
      enum: [
        "patient_assigned",    // FR-8.1 — doctor receives when assistant assigns patient
        "patient_discharged",  // doctor discharges patient
        "vitals_added",        // doctor notified when assistant logs vitals
        "prescription_sent",   // FR-8.2 — patient receives when doctor sends prescription
        "general",
      ],
      default: "general",
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    // ── Payload data ──────────────────────────────────────────────────────────
    data: {
      patientId:      { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
      patientName:    { type: String },
      patientEmail:   { type: String },
      prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Prescription" },
      doctorName:     { type: String },
    },

    // ── FR-8.5: Read state ────────────────────────────────────────────────────
    isRead: { type: Boolean, default: false },

    // ── FR-8.3: Delivery audit — timestamp is automatic via { timestamps: true }
    // deliveredAt is set when the notification is first fetched by the recipient
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: true,   // createdAt = FR-8.3 log timestamp, updatedAt = last read time
  }
);

// Auto-expire notifications after 30 days (keeps the collection lean)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for the most common query pattern (GET /api/notifications)
notificationSchema.index({ recipientId: 1, recipientRole: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);