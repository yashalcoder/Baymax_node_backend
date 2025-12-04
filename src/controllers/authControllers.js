import bcrypt from "bcryptjs";
import Doctor from "../models/doctor.js";
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
      user = await Doctor.findOne({ email });
    } else if (role === "patient") {
      user = await Patient.findOne({ email });
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

    const token = generateToken({
      id: user._id,
      role,
      doctorId: user.doctorId || null,
    });

    res.json({
      status: "success",
      message: "Login successful",
      data: {
        _id: user._id,
        doctorId: user.doctorId || null,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
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
export const getMe = async (req, res) => {
  try {
    let user;

    if (req.user.role === "doctor") {
      user = await Doctor.findById(req.user.id).select("-password");
    } else {
      user = await Patient.findById(req.user.id).select("-password");
    }

    if (!user) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }

    res.json({ status: "success", data: user });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user data",
    });
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
