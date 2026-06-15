import Consultation from "../models/Consultation.js";

// ─── GET CURRENT PRESCRIPTION ─────────────────────────────────────────────────
export const getPrescription = async (req, res) => {
  const { consultationId } = req.params;

  try {
    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    if (!consultation.prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    return res.status(200).json(consultation.prescription);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── UPDATE PRESCRIPTION (auto-archives old version) ─────────────────────────
export const updatePrescription = async (req, res) => {
  const { consultationId } = req.params;
  const { diagnosis, prescription, advice, disclaimer } = req.body;

  try {
    // 1. Fetch current consultation to snapshot existing prescription
    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    if (!consultation.prescription) {
      return res.status(404).json({ message: "No existing prescription to update" });
    }

    // 2. Snapshot the OLD prescription before overwriting
    const historyEntry = {
      diagnosis:    consultation.prescription.diagnosis,
      prescription: consultation.prescription.prescription,
      advice:       consultation.prescription.advice,
      disclaimer:   consultation.prescription.disclaimer,
      replacedAt:   new Date(),
    };

    // 3. Write new prescription + push old one into history atomically
    const updated = await Consultation.findByIdAndUpdate(
      consultationId,
      {
        $set: {
          "prescription.diagnosis":    diagnosis,
          "prescription.prescription": prescription,
          "prescription.advice":       advice,
          "prescription.disclaimer":   disclaimer,
          "prescription.lastUpdatedAt": new Date(),
        },
        $push: {
          prescriptionHistory: historyEntry,   // ✅ old version archived
        },
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Prescription updated successfully",
      data: {
        current:      updated.prescription,
        historyCount: updated.prescriptionHistory?.length || 0,
      },
    });

  } catch (error) {
    console.error("updatePrescription error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── GET PRESCRIPTION HISTORY ─────────────────────────────────────────────────
export const getPrescriptionHistory = async (req, res) => {
  const { consultationId } = req.params;

  try {
    const consultation = await Consultation.findById(
      consultationId,
      "prescription prescriptionHistory"
    );

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    return res.status(200).json({
      current: consultation.prescription        || null,
      history: consultation.prescriptionHistory || [],  // oldest → newest
    });

  } catch (err) {
    console.error("getPrescriptionHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};