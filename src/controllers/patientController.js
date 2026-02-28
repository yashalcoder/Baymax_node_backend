import Patient from "../models/Patient.js";
import User from "../models/user.js";

// =========================
// GET CURRENT PATIENT DASHBOARD DATA
// =========================
export const getMyPatientDashboard = async (req, res) => {
  try {
    // Basic user info
    const user = await User.findById(req.user.id).select(
      "name email contact address role"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role !== "patient") {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: not a patient" });
    }

    // Patient-specific info
    const patient = await Patient.findOne({ userId: req.user.id }).select(
      "-__v"
    );

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }

    return res.status(200).json({
      success: true,
      user,
      patient,
    });
  } catch (error) {
    console.error("Error fetching patient dashboard:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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
