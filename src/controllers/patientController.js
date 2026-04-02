import Patient        from "../models/Patient.js";
import User           from "../models/user.js";
import MedicalHistory from "../models/MedicalHistory.js";
import Prescription   from "../models/Prescription.js";
import PDFDocument    from "pdfkit";

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
    const patients = await Patient.find().populate(
      "userId",
      "name email contact address"
    );
    res.status(200).json({ success: true, count: patients.length, patients });
  } catch (error) {
    console.error("❌ Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Server Error" });
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

    const prescriptions = await Prescription.find({ patientId: req.user.id })
      .populate({
        path:   "doctorId",
        select: "name email contact",
        model:  "User",
      })
      .sort({ createdAt: -1 });

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
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId)
      .populate({ path: "doctorId",  select: "name email contact", model: "User" })
      .populate({ path: "patientId", select: "name email contact", model: "User" });

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    // Ensure the requesting patient owns this prescription
    if (prescription.patientId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="prescription-${prescriptionId}.pdf"`
    );
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fontSize(20).font("Helvetica-Bold").text("Medical Prescription", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Doctor info ───────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("Doctor:");
    doc.font("Helvetica").text(prescription.doctorId?.name || "N/A");
    doc.text(`Contact: ${prescription.doctorId?.contact || "N/A"}`);
    doc.moveDown(0.5);

    // ── Patient info ──────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").text("Patient:");
    doc.font("Helvetica").text(prescription.patientId?.name || "N/A");
    doc.moveDown(0.5);

    // ── Date ──────────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").text("Date:");
    doc.font("Helvetica").text(
      new Date(prescription.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    );
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Medicines ─────────────────────────────────────────────────────────────
    doc.fontSize(14).font("Helvetica-Bold").text("Prescribed Medicines:");
    doc.moveDown(0.3);

    if (prescription.medicines?.length > 0) {
      prescription.medicines.forEach((med, i) => {
        doc.fontSize(12).font("Helvetica-Bold").text(`${i + 1}. ${med.name}`);
        doc.font("Helvetica")
          .text(`   Dosage: ${med.dosage || "N/A"}`)
          .text(`   Frequency: ${med.frequency || "N/A"}`)
          .text(`   Duration: ${med.duration || "N/A"}`);
        doc.moveDown(0.3);
      });
    } else {
      doc.font("Helvetica").text("No medicines listed.");
    }

    // ── Lab Tests ─────────────────────────────────────────────────────────────
    if (prescription.labTests?.length > 0) {
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica-Bold").text("Lab Tests Ordered:");
      doc.moveDown(0.2);
      prescription.labTests.forEach((test, i) => {
        doc.fontSize(12).font("Helvetica").text(`${i + 1}. ${test}`);
      });
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (prescription.notes) {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(12).font("Helvetica-Bold").text("Doctor's Notes:");
      doc.font("Helvetica").text(prescription.notes);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(9).fillColor("gray")
      .text("This prescription was generated electronically.", { align: "center" });

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