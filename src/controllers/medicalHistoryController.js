import MedicalHistory from "../models/MedicalHistory.js";

export const getMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await MedicalHistory.find({ patientId })
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "firstName lastName",
        },
      })
      .sort({ visitDate: -1 });

    const formattedHistory = history.map((record) => ({
      visitDate: record.visitDate,
      diagnosis: record.diagnosis,
      doctorName: `${record.doctorId.userId.firstName} ${record.doctorId.userId.lastName}`,
      prescriptions: record.prescriptions,
      labTests: record.labTests,
      notes: record.notes,
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
