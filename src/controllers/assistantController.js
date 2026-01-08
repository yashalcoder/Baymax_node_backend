import User from "../models/user.js";
import Patient from "../models/Patient.js";
import bcrypt from "bcryptjs";

// ---------------------------------------------
// SEARCH PATIENT
// ---------------------------------------------
export const searchPatients = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query)
      return res.status(400).json({ message: "Search query is required" });

    const users = await User.find({
      role: "patient",
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { contact: { $regex: query, $options: "i" } },
      ],
    });

    // fetch matching patient profiles
    const patients = await Patient.find({
      email: { $in: users.map((u) => u.email) },
    }).populate("userId", "name email contact address");

    res.json({
      status: "success",
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------------------------------------
// ADD NEW PATIENT
// ---------------------------------------------
export const addPatient = async (req, res) => {
  try {
    const { name, email, contact, address, bloodGroup, allergies, majorDisease } =
      req.body;

    // check if user exists
    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ message: "Patient with this email already exists" });
    }

    // create user record
    const password = await bcrypt.hash("default123", 10); // patient temporary password

    user = await User.create({
      name,
      email,
      password,
      contact,
      address,
      role: "patient",
    });

    // create patient
    const patient = await Patient.create({
      userId: user._id,
      bloodGroup,
      allergies,
      majorDisease,
    });

    res.status(201).json({
      status: "success",
      message: "Patient created successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Add patient error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// ---------------------------------------------
// ADD VITALS
// ---------------------------------------------
export const addVitals = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { temperature, bloodPressure, heartRate, notes } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    patient.vitals.push({
      temperature,
      bloodPressure,
      heartRate,
      notes,
    });

    await patient.save();

    res.json({
      status: "success",
      message: "Vitals added",
      data: patient,
    });
  } catch (error) {
    console.error("Vitals error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
