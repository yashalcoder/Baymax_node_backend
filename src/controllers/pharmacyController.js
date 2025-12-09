import Pharmacy from "../models/Pharmacy.js";

// Get pharmacy profile
export const getPharmacyProfile = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
    res.json(pharmacy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all medicines
export const getMedicines = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
    res.json(pharmacy.medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new medicine
export const addMedicine = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    pharmacy.medicines.push(req.body);
    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.status(201).json({ message: "Medicine added successfully", medicines: pharmacy.medicines });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update medicine by ID
export const updateMedicine = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    const medicine = pharmacy.medicines.id(req.params.medicineId);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });

    Object.assign(medicine, req.body);
    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.json({ message: "Medicine updated successfully", medicine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
