import bcrypt from "bcryptjs";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Pharmacy from "../models/Pharmacy.js";
import Laboratory from "../models/Laboratory.js";
import Assistant from "../models/Assistant.js";
import User from "../models/user.js";
import { generateToken } from "../middlewares/jwt.js";

// LOGIN (role-aware)
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({
        status: "error",
        message: "Email, password, and role are required",
      });
    }

    // Always trust the DB for role, not the client
    const user = await User.findOne({ email });
    console.log("User found:", user);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Check isActive only if field exists (for doctor/patient models)
    if (user.isActive !== undefined && user.isActive === false) {
      return res.status(403).json({
        status: "error",
        message: "Account is deactivated. Contact support.",
      });
    }
const testHash = await bcrypt.hash("Yashal@123", 10);
console.log("New Hash:", testHash);

const check = await bcrypt.compare("Yashal@123", testHash);
console.log("Test Compare:", check);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Update lastLogin if field exists (for doctor/patient models)
    try {
      if (user.lastLogin !== undefined) {
        user.lastLogin = new Date();
        await user.save();
      }
    } catch (err) {
      // Ignore if lastLogin field doesn't exist
      console.log("lastLogin field not available for this user model");
    }

    const token = generateToken(user);
    console.log("user logged in:", user);
    console.log("After login token:", token);
    res.json({
      status: "success",
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        contact: user.contact,
        role: user.role,
        token,
      },
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // } catch {
    //   res.status(500).json({
    //     status: "error",
    //     message: "Login failed",
    //   });

    // }
  } catch (error) {
    console.error("Login error:", error); // log actual error
    res.status(500).json({
      status: "error",
      message: error.message || "Login failed",
    });
  }
};

// GET ME - unified profile by role
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

export const getMe = async (req, res) => {
  try {
    console.log("req.user:", req.user);

    if (!req.user.id) {
      return res
        .status(400)
        .json({ status: "error", message: "User ID missing in token" });
    }

    const baseUser = await User.findById(req.user.id).select(
      "-password -createdAt -updatedAt -__v"
    );
    if (!baseUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    let roleProfile = null;

    switch (req.user.role) {
      case "doctor":
        console.log("Fetching Doctor profile for userId:", req.user.id);
        roleProfile = await Doctor.findOne({
          userId: new ObjectId(req.user.id),
        });
        break;

      case "patient":
        roleProfile = await Patient.findOne({
          userId: new ObjectId(req.user.id),
        });
        break;

      case "pharmacy":
        roleProfile = await Pharmacy.findOne({
          userId: new ObjectId(req.user.id),
        });
        break;

      case "laboratory":
        roleProfile = await Laboratory.findOne({
          userId: new ObjectId(req.user.id),
        });
        break;

      case "assistant":
        roleProfile = await Assistant.findOne({
          userId: new ObjectId(req.user.id),
        });
        break;

      default:
        break;
    }

    if (!roleProfile) {
      return res.status(404).json({
        status: "error",
        message: `${req.user.role} profile not found`,
      });
    }

    res.json({
      status: "success",
      data: {
        user: baseUser,
        profile: roleProfile,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch profile" });
  }
};

// REFRESH TOKEN
export const refreshToken = async (req, res) => {
  try {
    const newToken = generateToken(req.user);

    res.json({
      status: "success",
      message: "Token refreshed successfully",
      token: newToken,
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Token refresh failed",
    });
  }
};
