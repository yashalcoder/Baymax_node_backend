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

// FIX: replaced MongoDB $near (requires 2dsphere index) with in-memory
// haversine filter — works without any Atlas index changes.
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

    // Build medicine filter list (optional)
    const medicineList = medicines
      ? String(medicines).split(",").map((m) => m.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch all pharmacies that are open and have coordinates stored
    const allPharmacies = await Pharmacy.find({ isOpen: true })
      .populate("userId", "name email contact")
      .select("-__v");

    const nearby = allPharmacies
      .filter((p) => {
        // Must have coordinates
        const coords = p.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) return false;

        // Within radius
        const pLng = coords[0];
        const pLat = coords[1];
        const dist = haversineKm(userLat, userLng, pLat, pLng);
        if (dist > radius) return false;

        // Medicine filter (if requested)
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
      .sort((a, b) => a.distanceKm - b.distanceKm);   // closest first

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

export const getMedicines = async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user.id });
    if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
    res.json(pharmacy.medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addMedicine = async (req, res) => {
  try {
    console.log("in conroller");
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