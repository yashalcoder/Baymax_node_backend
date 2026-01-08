import Patient from "../models/Patient.js";
import User from "../models/user.js";

// =========================
// GET ALL PATIENTS
// =========================
export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find().populate("userId", "name email contact address");

    res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =========================
// GET ONE PATIENT BY ID
// =========================
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).populate(
      "userId",
      "name email contact address"
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.status(200).json({ success: true, patient });
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
