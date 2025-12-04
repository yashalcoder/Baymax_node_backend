import express from "express";
import multer from "multer";
import { authenticateToken } from "../middlewares/jwt.js";
import {
  registerDoctor,
  getDoctors,
  updateDoctorProfile,
} from "../controllers/doctorControllers.js";

const doctorRouter = express.Router();

const upload = multer({ dest: "uploads/" });

doctorRouter.post("/register-doctor", upload.single("file"), registerDoctor);
doctorRouter.get("/doctors", getDoctors);
doctorRouter.put(
  "/doctor/profile",
  authenticateToken,

  updateDoctorProfile
);

export default doctorRouter;
