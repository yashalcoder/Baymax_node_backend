import Laboratory from "../models/Laboratory.js";

// Get lab profile
export const getLabProfile = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });
    res.json(lab);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all tests
export const getTests = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });
    res.json(lab.tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new test
export const addTest = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    lab.tests.push(req.body);
    lab.updatedAt = Date.now();
    await lab.save();

    res.status(201).json({ message: "Test added successfully", tests: lab.tests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update test by ID
export const updateTest = async (req, res) => {
  try {
    const lab = await Laboratory.findOne({ userId: req.user.id });
    if (!lab) return res.status(404).json({ message: "Laboratory not found" });

    const test = lab.tests.id(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    Object.assign(test, req.body);
    lab.updatedAt = Date.now();
    await lab.save();

    res.json({ message: "Test updated successfully", test });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
