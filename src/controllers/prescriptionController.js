import Consultation from "../models/Consultation.js";

export const getPrescription=async(req, res)=> {
  const { consultationId } = req.params;

  try {
    const consultation = await Consultation.findById(consultationId); // ✅ await

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    const prescription = consultation.prescription;

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    return res.status(200).json(prescription); // ✅ sirf ek baar response

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" }); // ✅ DB error handle
  }
}
export const  updatePrescription=async(req, res) =>{
  const { consultationId } = req.params;  // URL se: /prescription/:consultationId
  const { medicine, dosage, instructions } = req.body;  // Frontend se bheji gai updated values

  try {
    const updated = await Consultation.findOneAndUpdate(
      { consultationId },
      { medicine, dosage, instructions },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    res.status(200).json({ message: "Updated successfully", data: updated });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}