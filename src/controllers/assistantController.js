import User      from "../models/user.js";
import Patient   from "../models/Patient.js";
import Assistant from "../models/Assistant.js";
import Doctor    from "../models/Doctor.js";
import bcrypt    from "bcryptjs";

// ─── Helper ───────────────────────────────────────────────────────────────────
function requireAssistant(req, res) {
  if (req.user?.role !== "assistant") {
    res.status(403).json({ status: "error", message: "Forbidden: assistants only" });
    return false;
  }
  return true;
}

// ─── GET ALL DOCTORS (for dropdowns) ─────────────────────────────────────────
// Normalises firstName/lastName vs User.name so the frontend always gets
// a consistent { _id, displayName, specialization } shape.
export const getDoctors = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const doctors = await Doctor.find({}).populate("userId", "name email").lean();

    const data = doctors.map((d) => {
      const firstName = d.firstName || "";
      const lastName  = d.lastName  || "";
      const displayName =
        (firstName + " " + lastName).trim() ||
        d.userId?.name ||
        "Doctor";

      return {
        _id:            d._id,
        displayName,
        specialization: d.professional?.specialization || "",
        email:          d.userId?.email || d.email || "",
      };
    });

    return res.json({ status: "success", count: data.length, data });
  } catch (error) {
    console.error("getDoctors error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── GET MY PATIENTS ──────────────────────────────────────────────────────────
export const getMyPatients = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant) {
      return res.status(404).json({ status: "error", message: "Assistant profile not found" });
    }

    const patients = await Patient.find({
      _id: { $in: assistant.patientsManaged },
    }).populate("userId", "name email contact address");

    return res.json({ status: "success", count: patients.length, data: patients });
  } catch (error) {
    console.error("getMyPatients error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── SEARCH PATIENTS  (FR-2.1) ───────────────────────────────────────────────
export const searchPatients = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      role: "patient",
      $or: [
        { name:    { $regex: query, $options: "i" } },
        { email:   { $regex: query, $options: "i" } },
        { contact: { $regex: query, $options: "i" } },
      ],
    });

    const patients = await Patient.find({
      userId: { $in: users.map((u) => u._id) },
    })
      .populate("userId", "name email contact address")
      .populate("assignedDoctor");  // include current doctor info

    return res.json({ status: "success", count: patients.length, data: patients });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── ASSIGN DOCTOR TO EXISTING PATIENT ───────────────────────────────────────
export const assignDoctor = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const { patientId } = req.params;
    const { doctorId }  = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    const [patient, doctor, assistant] = await Promise.all([
      Patient.findById(patientId),
      Doctor.findById(doctorId),
      Assistant.findOne({ userId: req.user.id }),
    ]);

    if (!patient)   return res.status(404).json({ message: "Patient not found" });
    if (!doctor)    return res.status(404).json({ message: "Doctor not found" });
    if (!assistant) return res.status(404).json({ message: "Assistant profile not found" });

    // Remove from old doctor's list
    if (patient.assignedDoctor) {
      await Doctor.findByIdAndUpdate(patient.assignedDoctor, {
        $pull: { patientsAssigned: patient._id },
      });
    }

    // Update patient
    patient.assignedDoctor      = doctor._id;
    patient.assignedByAssistant = assistant._id;
    await patient.save();

    // Add to new doctor's list (no duplicates)
    if (!doctor.patientsAssigned) doctor.patientsAssigned = [];
    if (!doctor.patientsAssigned.map(String).includes(String(patient._id))) {
      doctor.patientsAssigned.push(patient._id);
      await doctor.save();
    }

    // Track patient in assistant's list too
    if (!assistant.patientsManaged.map(String).includes(String(patient._id))) {
      assistant.patientsManaged.push(patient._id);
      await assistant.save();
    }

    return res.json({
      status:  "success",
      message: "Doctor assigned successfully",
      data:    patient,
    });
  } catch (error) {
    console.error("assignDoctor error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// ─── ADD NEW PATIENT + ASSIGN DOCTOR  (FR-1.2, FR-1.4) ───────────────────────
export const addPatient = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const assistantUserId = req.user.id;
    const {
      name, email, contact, address,
      bloodGroup, allergies, majorDisease, doctorId,
    } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "A patient with this email already exists" });
    }

    const password = await bcrypt.hash("default123", 10);
    const user = await User.create({
      name, email, password, contact, address, role: "patient",
    });

    const assistant = await Assistant.findOne({ userId: assistantUserId });
    if (!assistant) {
      return res.status(404).json({ message: "Assistant profile not found" });
    }

    const patient = await Patient.create({
      userId:              user._id,
      bloodGroup:          bloodGroup   || "",
      allergies:           allergies    || "",
      majorDisease:        majorDisease || "",
      assignedDoctor:      doctor._id,
      assignedByAssistant: assistant._id,
    });

    if (!doctor.patientsAssigned) doctor.patientsAssigned = [];
    doctor.patientsAssigned.push(patient._id);
    await doctor.save();

    assistant.patientsManaged.push(patient._id);
    await assistant.save();

    return res.status(201).json({
      status:  "success",
      message: "Patient registered and assigned to doctor successfully",
      data:    patient,
    });
  } catch (error) {
    console.error("Add patient error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// ─── ADD VITALS  (FR-2.2) ────────────────────────────────────────────────────
export const addVitals = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const { patientId } = req.params;
    const { bloodPressure, temperature, heartRate, notes } = req.body;

    if (!bloodPressure && !temperature && !heartRate) {
      return res.status(400).json({ message: "At least one vital sign is required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.vitals.push({ bloodPressure, temperature, heartRate, notes });
    await patient.save();

    const sortedVitals = [...patient.vitals].sort(
      (a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt)
    );

    return res.json({
      status:  "success",
      message: "Vitals added successfully",
      data:    { patientId: patient._id, vitals: sortedVitals },
    });
  } catch (error) {
    console.error("Vitals error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// ─── GET VITALS HISTORY  (FR-2.3) ────────────────────────────────────────────
export const getPatientVitals = async (req, res) => {
  try {
    if (!requireAssistant(req, res)) return;

    const { patientId } = req.params;
    const patient = await Patient.findById(patientId)
      .populate("userId", "name email contact address");

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const vitals = [...patient.vitals].sort(
      (a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt)
    );

    return res.json({
      status: "success",
      data: {
        patientId:   patient._id,
        patientName: patient.userId?.name    || "",
        email:       patient.userId?.email   || "",
        contact:     patient.userId?.contact || "",
        vitals,
      },
    });
  } catch (error) {
    console.error("Get vitals error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};