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

    const formatted = labs.map((lab) => {
      // FIX: build a prices map from lab.tests[] because the model has no
      // separate "prices" field — tests ARE the source of truth for prices.
      // Key = test _id (string), Value = test price
      const prices = {};
      (lab.tests || []).forEach((t) => {
        if (t._id && t.available !== false) {
          prices[t._id.toString()] = t.price;
        }
      });

      return {
        _id:            lab._id,
        labName:        lab.labName || lab.userId?.name || "Unknown Lab",
        address:        lab.address?.street || "",
        phone:          lab.contactNumber || lab.userId?.contact || "",
        email:          lab.userId?.email   || "",
        location: lab.location?.coordinates?.length === 2
          ? { lat: lab.location.coordinates[1], lng: lab.location.coordinates[0] }
          : null,
        openHours:      lab.openHours      || "",
        homeCollection: lab.homeCollection || false,
        reportTime:     lab.reportTime     || "",
        rating:         lab.rating         || null,
        discount:       lab.discount       || 0,
        prices,   // ← now correctly populated from tests[]
        services:       lab.services       || "",
      };
    });

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
        if (!key) return;

        if (testMap.has(key)) {
          // Update min/max price across all labs
          const existing = testMap.get(key);
          existing.minPrice = Math.min(existing.minPrice, t.price || 0);
          existing.maxPrice = Math.max(existing.maxPrice, t.price || 0);
        } else {
          testMap.set(key, {
            // FIX: always use the MongoDB subdoc _id (ObjectId) so it matches
            // the keys in the prices map built by getAllLaboratories
            _id:         t._id.toString(),
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

    const testList = tests
      ? String(tests).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const allLabs = await Laboratory.find()
      .populate("userId", "name email contact")
      .select("-__v");

    const nearby = allLabs
      .filter((lab) => {
        const coords = lab.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) return false;

        const dist = haversineKm(userLat, userLng, coords[1], coords[0]);
        if (dist > radius) return false;

        if (testList.length > 0) {
          const has = testList.some((testName) =>
            (lab.tests || []).some(
              (t) => t.name?.toLowerCase().includes(testName) && t.available !== false
            )
          );
          if (!has) return false;
        }

        return true;
      })
      .map((lab) => {
        const coords = lab.location.coordinates;
        const dist   = haversineKm(userLat, userLng, coords[1], coords[0]);

        const prices = {};
        (lab.tests || []).forEach((t) => {
          if (t._id && t.available !== false) {
            prices[t._id.toString()] = t.price;
          }
        });

        return {
          _id:            lab._id,
          labName:        lab.labName || lab.userId?.name || "Unknown Lab",
          address:        lab.address?.street || "",
          phone:          lab.contactNumber || lab.userId?.contact || "",
          email:          lab.userId?.email   || "",
          location:       { lat: coords[1], lng: coords[0] },
          openHours:      lab.openHours      || "",
          homeCollection: lab.homeCollection || false,
          reportTime:     lab.reportTime     || "",
          rating:         lab.rating         || null,
          discount:       lab.discount       || 0,
          prices,
          tests:          lab.tests          || [],
          distanceKm:     parseFloat(dist.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

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

export const updateLabLocation = async (req, res) => {
  try {
    const { ownerName, contactNumber, address, coordinates } = req.body;

    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    if (ownerName)     lab.ownerName     = ownerName;
    if (contactNumber) lab.contactNumber = contactNumber;
    if (address)       lab.address       = address;
    if (coordinates) {
      lab.location = { type: "Point", coordinates };
    }

    lab.updatedAt = Date.now();
    await lab.save();

    res.json({ message: "Lab profile updated successfully", lab });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns the calling lab's own tests (protected, lab role only)
// Route changed to GET /my-tests to avoid shadowing public GET /tests
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
    const { name, category, price, code, sampleType, turnaroundValue, turnaroundUnit } = req.body;

    if (!name || !price)
      return res.status(400).json({ message: "Test name and price are required" });
    if (name.trim().length < 3)
      return res.status(400).json({ message: "Test name must be at least 3 characters" });
    if (price <= 0)
      return res.status(400).json({ message: "Price must be greater than 0" });

    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    lab.tests.push({ name, category, price, code, sampleType, turnaroundValue, turnaroundUnit });
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
    lab.updatedAt    = Date.now();
    await lab.save();

    res.json({ message: "Test updated successfully", test });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

export const searchLabTests = async (req, res) => {
  try {
    const { testName } = req.query;
    if (!testName)
      return res.status(400).json({ message: "testName query parameter is required" });

    const labs = await Laboratory.find({
      "tests.name": { $regex: testName, $options: "i" },
    });

    if (!labs.length)
      return res.status(404).json({ message: "No labs found for this test" });

    const results = labs.map((lab) => ({
      labName:       lab.labName,
      ownerName:     lab.ownerName,
      contactNumber: lab.contactNumber,
      address:       lab.address,
      location:      lab.location,
      tests:         lab.tests.filter((t) =>
        t.name.toLowerCase().includes(testName.toLowerCase())
      ),
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};