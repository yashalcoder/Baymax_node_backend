import Patient        from "../models/Patient.js";
import User           from "../models/user.js";
import Prescription      from "../models/Prescription.js";

import MedicalHistory from "../models/MedicalHistory.js";
import Doctor from "../models/doctor.js";

import PDFDocument    from "pdfkit";
import Consultation from "../models/Consultation.js";

// =============================================================================
// GET CURRENT PATIENT DASHBOARD DATA
// =============================================================================
export const getMyPatientDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email contact address role"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role !== "patient") {
      return res.status(403).json({ success: false, message: "Forbidden: not a patient" });
    }

    const patient = await Patient.findOne({ userId: req.user.id }).select("-__v");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    return res.status(200).json({ success: true, user, patient });
  } catch (error) {
    console.error("❌ Error fetching patient dashboard:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =============================================================================
// GET ALL PATIENTS  (doctor / assistant access)
// =============================================================================
export const getAllPatients = async (req, res) => {
  try {
    // Query params
    const {
      page = 1,
      limit = 0, // 0 = no pagination (return all)
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // 🔍 Filtering (search by name/email/contact)
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { contact: { $regex: search, $options: "i" } },
        ],
      };
    }

    // 📊 Sorting
    const sortOrder = order === "asc" ? 1 : -1;

    // 📦 Base query
    let patientQuery = Patient.find(query)
      .populate("userId", "name email contact address")
      .sort({ [sortBy]: sortOrder });

    // 📄 Pagination (only if limit > 0)
    if (limit > 0) {
      const skip = (page - 1) * limit;
      patientQuery = patientQuery.skip(skip).limit(Number(limit));
    }

    const patients = await patientQuery;

    // 📊 Total count (for frontend pagination)
    const total = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error("❌ Error fetching patients:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =============================================================================
// GET ONE PATIENT BY ID
// =============================================================================
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
    console.error("❌ Error fetching patient:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =============================================================================
// GET MY PRESCRIPTIONS  (real data from DB)
// =============================================================================

export const getMyPrescriptions = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const consultations = await Consultation.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

    const prescriptions = await Promise.all(
      consultations
        .filter((c) => c.prescription?.diagnosis)
        .map(async (c) => {

          let doctorName = "N/A";
          if (c.doctorId) {
            // ✅ doctorId = User._id — Doctor table mein userId se dhundo
            const doctor = await Doctor.findOne({ userId: c.doctorId }).select("firstName lastName");
            if (doctor) {
              doctorName = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || "N/A";
            }
          }

          return {
            _id:        c._id,
            createdAt:  c.createdAt,
            doctor:     doctorName,
            diagnosis:  c.prescription.diagnosis,
            medicines:  c.prescription.prescription?.map((m) => ({
              name:        m.medicine,
              type:        m.type,
              dosage:      m.dosage,
              duration:    m.duration,
              precautions: m.precautions,
            })) || [],
            advice:     c.prescription.advice,
            disclaimer: c.prescription.disclaimer,
            diseases:   c.extractedEntities?.diseases,
            severity:   c.extractedEntities?.severity,
          };
        })
    );

    return res.status(200).json({ success: true, prescriptions });

  } catch (error) {
    console.error("❌ Error fetching prescriptions:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// =============================================================================
// DOWNLOAD ONE PRESCRIPTION AS PDF
// =============================================================================
export const downloadPrescriptionPDF = async (req, res) => {
  try {
    const { prescriptionId } = req.params; // this is actually consultationId 

    const consultation = await Consultation.findById(prescriptionId)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email contact" },
      })
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email contact" },
      });

    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    // Make sure this patient owns it
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient || consultation.patientId._id.toString() !== patient._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const rx          = consultation.prescription;
    const doctorName  = consultation.doctorId?.userId?.name || consultation.doctorId?.name || "N/A";
    const patientName = consultation.patientId?.userId?.name || "N/A";

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="prescription-${prescriptionId}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("Medical Prescription", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Doctor / Patient / Date
    doc.fontSize(12).font("Helvetica-Bold").text("Doctor:");
    doc.font("Helvetica").text(doctorName);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Patient:");
    doc.font("Helvetica").text(patientName);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Date:");
    doc.font("Helvetica").text(new Date(consultation.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    }));
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Diagnosis
    doc.fontSize(13).font("Helvetica-Bold").text("Diagnosis:");
    doc.fontSize(11).font("Helvetica").text(rx.diagnosis || "N/A");
    doc.moveDown(0.5);

    // Medicines — use "medicine" key from AI response
    doc.fontSize(13).font("Helvetica-Bold").text("Prescribed Medicines:");
    doc.moveDown(0.3);
    if (rx.prescription?.length > 0) {
      rx.prescription.forEach((med, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i + 1}. ${med.medicine}`);
        doc.font("Helvetica")
          .text(`   Type: ${med.type || "N/A"}`)
          .text(`   Dosage: ${med.dosage || "N/A"}`)
          .text(`   Duration: ${med.duration || "N/A"}`)
          .text(`   Precautions: ${med.precautions || "N/A"}`);
        doc.moveDown(0.3);
      });
    }

    // Advice
    if (rx.advice?.length > 0) {
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(13).font("Helvetica-Bold").text("Advice:");
      doc.moveDown(0.2);
      rx.advice.forEach((a) => {
        doc.fontSize(11).font("Helvetica").text(`• ${a}`);
      });
      doc.moveDown(0.3);
    }

    // Disclaimer
    if (rx.disclaimer) {
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("gray").text(rx.disclaimer, { align: "center" });
    }

    doc.end();
  } catch (error) {
    console.error("❌ Error generating prescription PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }
  }
};
// =============================================================================
// EXPORT FULL MEDICAL HISTORY AS PDF
// =============================================================================
export const exportMedicalHistoryPDF = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email contact address");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    // Fetch medical history
    const history = await MedicalHistory.find({ patientId: patient._id })
      .populate({
        path:    "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ visitDate: -1 });

    // Fetch prescriptions
    const prescriptions = await Prescription.find({ patientId: req.user.id })
      .populate({ path: "doctorId", select: "name", model: "User" })
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="medical-history-${user.name.replace(/\s+/g, "-")}.pdf"`
    );
    doc.pipe(res);

    // ── Cover header ──────────────────────────────────────────────────────────
    doc.fontSize(22).font("Helvetica-Bold")
      .text("Complete Medical History", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke();
    doc.moveDown(0.5);

    // ── Patient info block ────────────────────────────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text("Patient Information");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica")
      .text(`Name:         ${user.name || "N/A"}`)
      .text(`Email:        ${user.email || "N/A"}`)
      .text(`Contact:      ${user.contact || "N/A"}`)
      .text(`Address:      ${user.address || "N/A"}`)
      .text(`Blood Group:  ${patient.bloodGroup || "N/A"}`)
      .text(`Allergies:    ${patient.allergies || "None"}`)
      .text(`Major Disease:${patient.majorDisease || "None"}`);

    if (patient.medications?.length > 0) {
      doc.text(`Medications:  ${patient.medications.join(", ")}`);
    }

    doc.moveDown(0.5);
    doc.text(`Report generated: ${new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })}`);

    // ── Vitals ────────────────────────────────────────────────────────────────
    if (patient.vitals?.length > 0) {
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica-Bold").text("Vitals History");
      doc.moveDown(0.3);

      const sortedVitals = [...patient.vitals].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      sortedVitals.forEach((v, i) => {
        doc.fontSize(11).font("Helvetica-Bold")
          .text(`Entry ${i + 1} — ${new Date(v.createdAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}`);
        doc.font("Helvetica")
          .text(`   Blood Pressure: ${v.bloodPressure || "N/A"}`)
          .text(`   Temperature:    ${v.temperature   || "N/A"}`)
          .text(`   Heart Rate:     ${v.heartRate      || "N/A"}`);
        if (v.notes) doc.text(`   Notes: ${v.notes}`);
        doc.moveDown(0.3);
      });
    }

    // ── Visit History ─────────────────────────────────────────────────────────
    if (history.length > 0) {
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica-Bold").text("Visit History");
      doc.moveDown(0.3);

      history.forEach((record, i) => {
        const doctorName = record.doctorId?.userId?.name || "Unknown Doctor";
        doc.fontSize(11).font("Helvetica-Bold")
          .text(`Visit ${i + 1} — ${new Date(record.visitDate).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}`);
        doc.font("Helvetica")
          .text(`   Doctor:    ${doctorName}`)
          .text(`   Diagnosis: ${record.diagnosis}`);

        if (record.prescriptions?.length > 0) {
          doc.text("   Prescriptions:");
          record.prescriptions.forEach((p) => {
            doc.text(`      • ${p.medicineName} — ${p.dosage}, ${p.duration}`);
          });
        }

        if (record.labTests?.length > 0) {
          doc.text("   Lab Tests:");
          record.labTests.forEach((t) => {
            doc.text(`      • ${t.testName}: ${t.result || "Pending"} (Normal: ${t.normalRange || "N/A"})`);
          });
        }

        if (record.notes) doc.text(`   Notes: ${record.notes}`);
        doc.moveDown(0.5);
      });
    }

    // ── Prescriptions ─────────────────────────────────────────────────────────
    if (prescriptions.length > 0) {
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica-Bold").text("Prescriptions");
      doc.moveDown(0.3);

      prescriptions.forEach((rx, i) => {
        doc.fontSize(11).font("Helvetica-Bold")
          .text(`Prescription ${i + 1} — ${new Date(rx.createdAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}`);
        doc.font("Helvetica")
          .text(`   Doctor: ${rx.doctorId?.name || "N/A"}`);

        if (rx.medicines?.length > 0) {
          doc.text("   Medicines:");
          rx.medicines.forEach((m) => {
            doc.text(`      • ${m.name} — ${m.dosage || ""} ${m.frequency || ""} for ${m.duration || ""}`);
          });
        }

        if (rx.notes) doc.text(`   Notes: ${rx.notes}`);
        doc.moveDown(0.4);
      });
    }

    if (history.length === 0 && prescriptions.length === 0) {
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica").fillColor("gray")
        .text("No medical history or prescriptions on record.", { align: "center" });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(9).fillColor("gray")
      .text("This report was generated electronically from your health portal.", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("❌ Error exporting medical history PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export medical history" });
    }
  }
};