import Pharmacy from "../models/Pharmacy.js";

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────
// PUBLIC  (patients / no auth required)
// ─────────────────────────────────────────────

export const getAllPharmacies = async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find()
      .populate("userId", "name email contact")
      .select("-__v");

    const formatted = pharmacies.map((pharmacy) => ({
      _id:          pharmacy._id,
      pharmacyName: pharmacy.pharmacyName || pharmacy.userId?.name || "Unknown Pharmacy",
      address:      pharmacy.address?.street || "",
      phone:        pharmacy.userId?.contact || "",
      email:        pharmacy.userId?.email   || "",
      location: pharmacy.location?.coordinates?.length === 2
        ? {
            lat: pharmacy.location.coordinates[1],
            lng: pharmacy.location.coordinates[0],
          }
        : null,
      isOpen:    pharmacy.isOpen   ?? true,
      medicines: pharmacy.medicines || [],
    }));

    return res.status(200).json({ success: true, pharmacies: formatted });
  } catch (error) {
    console.error("❌ getAllPharmacies:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getNearbyPharmacies = async (req, res) => {
  try {
    const { lat, lng, medicines, maxKm = 5 } = req.query;

    if (!lat || !lng)
      return res.status(400).json({ message: "Missing parameters: lat and lng are required" });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius  = parseFloat(maxKm);

    if (isNaN(userLat) || isNaN(userLng))
      return res.status(400).json({ message: "lat and lng must be valid numbers" });

    const medicineList = medicines
      ? String(medicines).split(",").map((m) => m.trim().toLowerCase()).filter(Boolean)
      : [];

    const allPharmacies = await Pharmacy.find({ isOpen: true })
      .populate("userId", "name email contact")
      .select("-__v");

    const nearby = allPharmacies
      .filter((p) => {
        const coords = p.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) return false;

        const pLng = coords[0];
        const pLat = coords[1];
        const dist = haversineKm(userLat, userLng, pLat, pLng);
        if (dist > radius) return false;

        if (medicineList.length > 0) {
          const has = medicineList.some((med) =>
            (p.medicines || []).some(
              (m) =>
                m.name?.toLowerCase().includes(med) &&
                (m.quantityAvailable ?? 1) > 0
            )
          );
          if (!has) return false;
        }

        return true;
      })
      .map((p) => {
        const coords = p.location.coordinates;
        const dist   = haversineKm(userLat, userLng, coords[1], coords[0]);
        return {
          _id:          p._id,
          pharmacyName: p.pharmacyName || p.userId?.name || "Unknown Pharmacy",
          address:      p.address?.street || "",
          phone:        p.userId?.contact || "",
          email:        p.userId?.email   || "",
          location:     { lat: coords[1], lng: coords[0] },
          isOpen:       p.isOpen ?? true,
          medicines:    p.medicines || [],
          distanceKm:   parseFloat(dist.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({ success: true, pharmacies: nearby });
  } catch (error) {
    console.error("❌ getNearbyPharmacies:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─────────────────────────────────────────────
// PROTECTED  (pharmacy owner — auth required)
// ─────────────────────────────────────────────

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
    const { name, strengthValue, strengthUnit, dosageForm, price, brand, quantityAvailable, expiryDate } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Medicine name and price are required" });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({ message: "Medicine name must be at least 3 characters" });
    }

    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    // Auto status based on stock
    const status = !quantityAvailable || quantityAvailable === 0
      ? "Out of Stock"
      : quantityAvailable <= 50
      ? "Low Stock"
      : "Available";

    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });

    pharmacy.medicines.push({ name, strengthValue, strengthUnit, dosageForm, price, brand, quantityAvailable, expiryDate, status });
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

    // Auto update status based on quantity
    if (req.body.quantityAvailable !== undefined) {
      medicine.status = req.body.quantityAvailable === 0
        ? "Out of Stock"
        : req.body.quantityAvailable <= 50
        ? "Low Stock"
        : "Available";
    }

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
      pharmacyName:  pharmacy.pharmacyName,
      contactNumber: pharmacy.contactNumber,
      address:       pharmacy.address,
      location:      pharmacy.location,
      medicines:     pharmacy.medicines.filter((m) =>
        m.name.toLowerCase().includes(medicineName.toLowerCase())
      ),
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};