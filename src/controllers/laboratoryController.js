import Laboratory from "../models/Laboratory.js";

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
// PUBLIC
// ─────────────────────────────────────────────

export const getAllLaboratories = async (req, res) => {
  try {
    const labs = await Laboratory.find()
      .populate("userId", "name email contact")
      .select("-__v");

    const formatted = labs.map((lab) => ({
      _id:            lab._id,
      labName:        lab.labName || lab.userId?.name || "Unknown Lab",
      address:        lab.address?.street || "",
      phone:          lab.userId?.contact || lab.phone || "",
      email:          lab.userId?.email   || "",
      location: lab.location?.coordinates?.length === 2
        ? { lat: lab.location.coordinates[1], lng: lab.location.coordinates[0] }
        : null,
      openHours:      lab.openHours      || "",
      homeCollection: lab.homeCollection || false,
      reportTime:     lab.reportTime     || "",
      rating:         lab.rating         || null,
      discount:       lab.discount       || 0,
      prices:         lab.prices         || {},
      services:       lab.services       || "",
    }));

    return res.status(200).json({ success: true, laboratories: formatted });
  } catch (error) {
    console.error("❌ getAllLaboratories:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getLabTests = async (req, res) => {
  try {
    const labs = await Laboratory.find().select("tests");
    const testMap = new Map();

    labs.forEach((lab) => {
      (lab.tests || []).forEach((t) => {
        const key = t.name?.toLowerCase().trim();
        if (key && !testMap.has(key)) {
          testMap.set(key, {
            _id:         t._id || t.name,
            name:        t.name,
            description: t.description || "",
            category:    t.category    || "general",
            minPrice:    t.price       || 0,
            maxPrice:    t.price       || 0,
          });
        }
      });
    });

    return res.status(200).json({ success: true, tests: Array.from(testMap.values()) });
  } catch (error) {
    console.error("❌ getLabTests:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// FIX: replaced MongoDB $near (requires 2dsphere index) with in-memory
// haversine filter — works without any Atlas index changes.
export const getNearbyLaboratories = async (req, res) => {
  try {
    const { lat, lng, tests, maxKm = 5 } = req.query;

    if (!lat || !lng)
      return res.status(400).json({ message: "Missing parameters: lat and lng are required" });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius  = parseFloat(maxKm);

    if (isNaN(userLat) || isNaN(userLng))
      return res.status(400).json({ message: "lat and lng must be valid numbers" });

    // Build test filter list (optional)
    const testList = tests
      ? String(tests).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch all labs that have coordinates stored
    const allLabs = await Laboratory.find()
      .populate("userId", "name email contact")
      .select("-__v");

    const nearby = allLabs
      .filter((lab) => {
        // Must have coordinates
        const coords = lab.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) return false;

        // Within radius
        const lLng = coords[0];
        const lLat = coords[1];
        const dist = haversineKm(userLat, userLng, lLat, lLng);
        if (dist > radius) return false;

        // Test filter (if requested)
        if (testList.length > 0) {
          const has = testList.some((testName) =>
            (lab.tests || []).some(
              (t) =>
                t.name?.toLowerCase().includes(testName) &&
                t.available !== false
            )
          );
          if (!has) return false;
        }

        return true;
      })
      .map((lab) => {
        const coords = lab.location.coordinates;
        const dist   = haversineKm(userLat, userLng, coords[1], coords[0]);
        return {
          _id:            lab._id,
          labName:        lab.labName || lab.userId?.name || "Unknown Lab",
          address:        lab.address?.street || "",
          phone:          lab.userId?.contact || lab.phone || "",
          email:          lab.userId?.email   || "",
          location:       { lat: coords[1], lng: coords[0] },
          openHours:      lab.openHours      || "",
          homeCollection: lab.homeCollection || false,
          reportTime:     lab.reportTime     || "",
          rating:         lab.rating         || null,
          discount:       lab.discount       || 0,
          prices:         lab.prices         || {},
          tests:          lab.tests          || [],
          distanceKm:     parseFloat(dist.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);  // closest first

    return res.status(200).json({ success: true, laboratories: nearby });
  } catch (error) {
    console.error("❌ getNearbyLaboratories:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─────────────────────────────────────────────
// PROTECTED (lab owner)
// ─────────────────────────────────────────────

export const getLabProfile = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });
    res.json(lab);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update lab address + location coordinates (FR-6.5)
export const updateLabLocation = async (req, res) => {
  try {
    const { ownerName, contactNumber, address, coordinates } = req.body;

    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    if (ownerName) lab.ownerName = ownerName;
    if (contactNumber) lab.contactNumber = contactNumber;
    if (address) lab.address = address;
    if (coordinates) {
      lab.location = {
        type: "Point",
        coordinates: coordinates,
      };
    }

    lab.updatedAt = Date.now();
    await lab.save();

    res.json({ message: "Lab profile updated successfully", lab });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all tests (FR-6.6)
export const getTests = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });
    res.json(lab.tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addTest = async (req, res) => {
  try {
    const { name, category, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Test name and price are required" });
    }

    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    lab.tests.push({ name, category, price });
    lab.updatedAt = Date.now();
    await lab.save();

    res.status(201).json({ message: "Test added successfully", tests: lab.tests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    const test = lab.tests.id(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    Object.assign(test, req.body);
    test.lastUpdated = Date.now();
    lab.updatedAt = Date.now();
    await lab.save();

    res.json({ message: "Test updated successfully", test });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete test by ID (FR-6.4)
export const deleteTest = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    const test = lab.tests.id(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    test.deleteOne();
    lab.updatedAt = Date.now();
    await lab.save();

    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search labs by test name — for patients (FR-6.6)
export const searchLabTests = async (req, res) => {
  try {
    const { testName } = req.query;

    if (!testName) {
      return res.status(400).json({ message: "testName query parameter is required" });
    }

    const labs = await Laboratory.find({
      "tests.name": { $regex: testName, $options: "i" },
    });

    if (!labs.length) {
      return res.status(404).json({ message: "No labs found for this test" });
    }

    const results = labs.map((lab) => ({
      labName: lab.labName,
      ownerName: lab.ownerName,
      contactNumber: lab.contactNumber,
      address: lab.address,
      location: lab.location,
      tests: lab.tests.filter((t) =>
        t.name.toLowerCase().includes(testName.toLowerCase())
      ),
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};