import bcrypt      from "bcryptjs";
import mongoose    from "mongoose";
import User        from "../models/user.js";
import Assistant   from "../models/Assistant.js";
import Patient     from "../models/Patient.js";
import Doctor      from "../models/Doctor.js";
import Pharmacy    from "../models/Pharmacy.js";
import Laboratory  from "../models/Laboratory.js";
import { generateToken } from "../middlewares/jwt.js";

const { ObjectId } = mongoose.Types;

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      contact,
      address,
      cnic,
      gender,
      location,
      degree,
      allergies,
      bloodGroup,
      majorDisease,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status:  "error",
        message: "Name, email, password, and role are required",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        status:  "error",
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status:  "error",
        message: "Password must be at least 6 characters long",
      });
    }

    // Validate role
    const allowedRoles = ["doctor", "patient", "assistant", "pharmacy", "laboratory"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status:  "error",
        message: `Invalid role. Must be one of: ${allowedRoles.join(", ")}`,
      });
    }

    // ── Duplicate email check ─────────────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        status:  "error",
        message: "An account with this email already exists",
      });
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Create base User record ───────────────────────────────────────────────
    const user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      contact:  contact  || null,
      address:  address  || null,
      cnic:     cnic     || null,
      gender:   gender   || null,
    });

    console.log(`✅ User created: ${user._id} (${role})`);

    // ── Create role-specific profile ──────────────────────────────────────────
    try {
      switch (role) {

        case "assistant": {
          await Assistant.create({
            userId: user._id,
            degree: degree || "",
          });
          break;
        }

        case "patient": {
          await Patient.create({
            userId:       user._id,
            bloodGroup:   bloodGroup   || "",
            allergies:    allergies    || "",
            majorDisease: majorDisease || "",
          });
          break;
        }

        case "doctor": {
          await Doctor.create({
            userId: user._id,
          });
          break;
        }

        case "pharmacy": {
          let coordinates = [0, 0];
          if (location) {
            const coords = location.split(",").map((c) => parseFloat(c.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              coordinates = [coords[1], coords[0]]; // [lng, lat] for GeoJSON
            }
          }
          await Pharmacy.create({
            userId:       user._id,
            pharmacyName: name,
            address:      { street: address || "" },
            location:     { type: "Point", coordinates },
          });
          break;
        }

        case "laboratory": {
          let coordinates = [0, 0];
          if (location) {
            const coords = location.split(",").map((c) => parseFloat(c.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              coordinates = [coords[1], coords[0]];
            }
          }
          await Laboratory.create({
            userId:  user._id,
            labName: name,
            address: { street: address || "" },
            location: { type: "Point", coordinates },
          });
          break;
        }

        default:
          break;
      }
      console.log(`✅ Role profile created for: ${role}`);
    } catch (profileErr) {
      // If role-profile creation fails, delete the user to avoid orphaned records
      await User.findByIdAndDelete(user._id);
      console.error("❌ Role profile creation failed, rolled back user:", profileErr);
      return res.status(500).json({
        status:  "error",
        message: `Failed to create ${role} profile: ${profileErr.message}`,
      });
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const token = generateToken(user);

    return res.status(201).json({
      status:  "success",
      message: "Signup successful",
      token,
      role:    user.role,
      user: {
        id:      user._id,
        name:    user.name,
        email:   user.email,
        role:    user.role,
        contact: user.contact,
        address: user.address,
        cnic:    user.cnic,
        gender:  user.gender,
      },
    });

  } catch (error) {
    console.error("❌ Signup error:", error);

    // Handle mongoose duplicate key error explicitly
    if (error.code === 11000) {
      return res.status(400).json({
        status:  "error",
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      status:  "error",
      message: error.message || "Server error during signup",
    });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status:  "error",
        message: "Email and password are required",
      });
    }

    const query = role
      ? { email: email.toLowerCase().trim(), role }
      : { email: email.toLowerCase().trim() };

    const user = await User.findOne(query);
    console.log("user:", user);

    if (!user) {
      return res.status(401).json({
        status:  "error",
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status:  "error",
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    return res.json({
      status:  "success",
      message: "Login successful",
      token,
      role:    user.role,
      user: {
        id:      user._id,
        name:    user.name,
        email:   user.email,
        role:    user.role,
        contact: user.contact,
        address: user.address,
        cnic:    user.cnic,
        gender:  user.gender,
      },
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      status:  "error",
      message: error.message || "Login failed",
    });
  }
};

// ─── GET CURRENT USER PROFILE ─────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(400).json({ status: "error", message: "User ID missing in token" });
    }

    const baseUser = await User.findById(req.user.id).select("-password -__v");
    if (!baseUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const uid = new ObjectId(req.user.id);
    let roleProfile = null;

    switch (req.user.role) {
      case "doctor":
        roleProfile = await Doctor.findOne({ userId: uid });
        break;
      case "patient":
        roleProfile = await Patient.findOne({ userId: uid });
        break;
      case "pharmacy":
        roleProfile = await Pharmacy.findOne({ userId: uid });
        break;
      case "laboratory":
        roleProfile = await Laboratory.findOne({ userId: uid });
        break;
      case "assistant":
        roleProfile = await Assistant.findOne({ userId: uid });
        break;
      default:
        break;
    }

    if (!roleProfile) {
      return res.status(404).json({
        status:  "error",
        message: `${req.user.role} profile not found`,
      });
    }

    return res.json({
      status: "success",
      data: {
        user:    baseUser,
        profile: roleProfile,
        role:    req.user.role,
      },
    });

  } catch (error) {
    console.error("❌ getMe error:", error);
    return res.status(500).json({ status: "error", message: "Failed to fetch profile" });
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, contact, address } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const updateFields = {};
    if (name    !== undefined) updateFields.name    = name.trim();
    if (contact !== undefined) updateFields.contact = contact;
    if (address !== undefined) updateFields.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!updatedUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    return res.json({
      status:  "success",
      message: "Profile updated successfully",
      user: {
        id:      updatedUser._id,
        name:    updatedUser.name,
        email:   updatedUser.email,
        role:    updatedUser.role,
        contact: updatedUser.contact,
        address: updatedUser.address,
        cnic:    updatedUser.cnic,
        gender:  updatedUser.gender,
      },
    });

  } catch (error) {
    console.error("❌ updateProfile error:", error);
    return res.status(500).json({ status: "error", message: "Failed to update profile" });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const newToken = generateToken(req.user);
    return res.json({
      status:  "success",
      message: "Token refreshed successfully",
      token:   newToken,
    });
  } catch (error) {
    console.error("❌ refreshToken error:", error);
    return res.status(500).json({ status: "error", message: "Token refresh failed" });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status:  "error",
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status:  "error",
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status:  "error",
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      status:  "success",
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("❌ changePassword error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};