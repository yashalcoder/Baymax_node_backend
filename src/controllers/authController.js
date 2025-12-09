import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Pharmacy from "../models/Pharmacy.js";
import Laboratory from "../models/Laboratory.js";
import Assistant from "../models/Assistant.js";
import Patient from "../models/Patient.js";
import { generateToken } from "../middlewares/jwt.js";

// SIGNUP CONTROLLER
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, contact, address, location, degree, allergies, bloodGroup, majorDisease, confirmPassword, ...otherFields } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        status: "error",
        message: "Name, email, password, and role are required" 
      });
    }

    // Validate password confirmation
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ 
        status: "error",
        message: "Passwords do not match" 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        status: "error",
        message: "Password must be at least 6 characters long" 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        status: "error",
        message: "User with this email already exists" 
      });
    }

    // HASH PASSWORD
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create User record
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      contact,
      address,
      allergies,
      bloodGroup,
      majorDisease,
      ...otherFields,
    });

    // Create role-specific records
    if (role === "pharmacy") {
      // Parse location if provided (format: "lat, lng" or "lat,lng")
      let coordinates = [0, 0];
      if (location) {
        const coords = location.split(",").map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          coordinates = [coords[1], coords[0]]; // MongoDB uses [longitude, latitude]
        }
      }

      await Pharmacy.create({
        userId: user._id,
        pharmacyName: name,
        address: {
          street: address || "",
        },
        location: {
          type: "Point",
          coordinates: coordinates,
        },
      });
    } else if (role === "laboratory") {
      // Parse location if provided
      let coordinates = [0, 0];
      if (location) {
        const coords = location.split(",").map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          coordinates = [coords[1], coords[0]]; // MongoDB uses [longitude, latitude]
        }
      }

      await Laboratory.create({
        userId: user._id,
        labName: name,
        address: {
          street: address || "",
        },
        location: {
          type: "Point",
          coordinates: coordinates,
        },
      });
    } else if (role === "assistant") {
      await Assistant.create({
        userId: user._id,
        degree: degree || "",
      });
    } else if (role === "patient") {
      await Patient.create({
        userId: user._id,
        bloodGroup: bloodGroup || "",
        allergies: allergies || "",
        majorDisease: majorDisease || "",
      });
    }

    // Generate JWT token
    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      status: "success",
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      role: user.role,
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message || "Server error" 
    });
  }
};

// LOGIN CONTROLLER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      message: "Login successful",
      role: user.role,
      userId: user._id,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
