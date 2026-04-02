import express from "express"
import multer from "multer"
import { authenticateToken } from '../middlewares/jwt.js';
import { extractMedicalTerms } from "../controllers/medicalHistoryController.js";
const router=express.Router();
const upload=multer();
router.post("/ocr", upload.single("image"), extractMedicalTerms);
export default router;