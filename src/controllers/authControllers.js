import bcrypt from "bcryptjs";
import Doctor from "../models/doctor.js";
import User from "../models/user.js";
import { generateToken } from "../middlewares/jwt.js";

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        status: "error",
        message: "Email, password, and role are required",
      });
    }

    let user;

    if (role === "doctor") {
      user = await User.findOne({ email });
    } else if (role === "patient") {
      user = await User.findOne({ email });
    } else {
      return res.status(400).json({ status: "error", message: "Invalid role" });
    }
    console.log("User found:", user);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        status: "error",
        message: "Account is deactivated. Contact support.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    console.log("user logged in:", user);
    console.log("After login token:", token);
    res.json({
      status: "success",
      message: "Login successful",
      data: {
        _id: user._id,
        doctorId: user.doctorId || null,
        name: user.name,
        email: user.email,
        address: user.address,
        contact: user.contact,
        role,
        token,
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

// GET ME
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

    let userProfile;

    if (req.user.role === "doctor") {
      console.log("Fetching Doctor profile for userId:", req.user.id);

      userProfile = await Doctor.findOne({
        userId: new ObjectId(req.user.id),
      }).select("-password");

      if (!userProfile) {
        return res
          .status(404)
          .json({ status: "error", message: "Doctor profile not found" });
      }
    } else {
      userProfile = await Patient.findById(req.user.id).select("-password");
      if (!userProfile) {
        return res
          .status(404)
          .json({ status: "error", message: "Patient profile not found" });
      }
    }

    res.json({ status: "success", data: userProfile });
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
