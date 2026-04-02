import MedicalHistory from "../models/MedicalHistory.js";
import Patient        from "../models/Patient.js";

// =============================================================================
// GET MEDICAL HISTORY FOR A PATIENT  (by patientId param — doctor / assistant)
// =============================================================================
export const getMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await MedicalHistory.find({ patientId })
      .populate({
        path:    "doctorId",
        // doctorId references Doctor model; Doctor has a userId reference to User
        populate: {
          path:   "userId",
          select: "name",   // ← User model stores full name in `name`, not firstName/lastName
          model:  "User",
        },
        model: "Doctor",
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      _id:           record._id,
      visitDate:     record.visitDate,
      diagnosis:     record.diagnosis,
      doctorName:    record.doctorId?.userId?.name || "Unknown Doctor",
      prescriptions: record.prescriptions,
      labTests:      record.labTests,
      notes:         record.notes,
      createdAt:     record.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error("❌ getMedicalHistory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============================================================================
// GET MY OWN MEDICAL HISTORY  (patient fetches their own)
// =============================================================================
export const getMyMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const history = await MedicalHistory.find({ patientId: patient._id })
      .populate({
        path:     "doctorId",
        populate: { path: "userId", select: "name", model: "User" },
        model:    "Doctor",
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      _id:           record._id,
      visitDate:     record.visitDate,
      diagnosis:     record.diagnosis,
      doctorName:    record.doctorId?.userId?.name || "Unknown Doctor",
      prescriptions: record.prescriptions,
      labTests:      record.labTests,
      notes:         record.notes,
      createdAt:     record.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error("❌ getMyMedicalHistory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};