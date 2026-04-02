import Pharmacy from "../models/Pharmacy.js";

// Get pharmacy profile (FR-7.2)
export const getPharmacyProfile = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
    res.json(pharmacy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update pharmacy location + address (FR-7.5)
export const updatePharmacyLocation = async (req, res) => {
  try {
    const { contactNumber, address, coordinates } = req.body;

    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    if (contactNumber) pharmacy.contactNumber = contactNumber;
    if (address) pharmacy.address = address;
    if (coordinates) {
      pharmacy.location = {
        type: "Point",
        coordinates: coordinates,
      };
    }

    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.json({ message: "Pharmacy profile updated successfully", pharmacy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all medicines (FR-7.3)
export const getMedicines = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
    res.json(pharmacy.medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new medicine (FR-7.3)
export const addMedicine = async (req, res) => {
  try {
    const { name, strength, dosageForm, price, brand, quantityAvailable, expiryDate } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Medicine name and price are required" });
    }

    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    pharmacy.medicines.push({ name, strength, dosageForm, price, brand, quantityAvailable, expiryDate });
    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.status(201).json({ message: "Medicine added successfully", medicines: pharmacy.medicines });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update medicine by ID (FR-7.4)
export const updateMedicine = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    const medicine = pharmacy.medicines.id(req.params.medicineId);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });

    Object.assign(medicine, req.body);
    medicine.lastUpdated = Date.now();
    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.json({ message: "Medicine updated successfully", medicine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete medicine by ID
export const deleteMedicine = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    const medicine = pharmacy.medicines.id(req.params.medicineId);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });

    medicine.deleteOne();
    pharmacy.updatedAt = Date.now();
    await pharmacy.save();

    res.json({ message: "Medicine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search medicines by name — for patients
export const searchMedicines = async (req, res) => {
  try {
    const { medicineName } = req.query;

    if (!medicineName) {
      return res.status(400).json({ message: "medicineName query parameter is required" });
    }

    const pharmacies = await Pharmacy.find({
      "medicines.name": { $regex: medicineName, $options: "i" },
    });

    if (!pharmacies.length) {
      return res.status(404).json({ message: "No pharmacies found for this medicine" });
    }

    const results = pharmacies.map((pharmacy) => ({
      pharmacyName: pharmacy.pharmacyName,
      contactNumber: pharmacy.contactNumber,
      address: pharmacy.address,
      location: pharmacy.location,
      medicines: pharmacy.medicines.filter((m) =>
        m.name.toLowerCase().includes(medicineName.toLowerCase())
      ),
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};