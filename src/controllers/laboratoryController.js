import Laboratory from "../models/Laboratory.js";

// Get lab profile (FR-6.2)
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

// Add new test (FR-6.3)
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

// Update test by ID (FR-6.4)
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