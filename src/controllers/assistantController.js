import User from "../models/user.js";
import Patient from "../models/Patient.js";
import Assistant from "../models/Assistant.js";
import Doctor from "../models/Doctor.js";
import bcrypt from "bcryptjs";

// ---------------------------------------------
// SEARCH PATIENT 
// ---------------------------------------------
export const searchPatients = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      role: "patient",
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { contact: { $regex: query, $options: "i" } },
      ],
    });

    const patients = await Patient.find({
      userId: { $in: users.map((u) => u._id) },
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
// ADD NEW PATIENT + ASSIGN DOCTOR 
// ---------------------------------------------
export const addPatient = async (req, res) => {
  try {
    const assistantUserId = req.user.id;

    const {
      name,
      email,
      contact,
      address,
      bloodGroup,
      allergies,
      majorDisease,
      doctorId,
    } = req.body;

    // 1️⃣ check doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // 2️⃣ check patient user exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "Patient with this email already exists" });
    }

    // 3️⃣ create patient user
    const password = await bcrypt.hash("default123", 10);
    user = await User.create({
      name,
      email,
      password,
      contact,
      address,
      role: "patient",
    });

    // 4️⃣ find assistant profile
    const assistant = await Assistant.findOne({ userId: assistantUserId });
    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found" });
    }

    // 5️⃣ create patient profile
    const patient = await Patient.create({
      userId: user._id,
      bloodGroup,
      allergies,
      majorDisease,
      assignedDoctor: doctor._id,
      assignedByAssistant: assistant._id,
    });

    // 6️⃣ link patient to doctor
    doctor.patientsAssigned.push(patient._id);
    await doctor.save();

    // 7️⃣ link patient to assistant
    assistant.patientsManaged.push(patient._id);
    await assistant.save();

    res.status(201).json({
      status: "success",
      message: "Patient created and assigned to doctor successfully",
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
      message: "Vitals added successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Vitals error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
