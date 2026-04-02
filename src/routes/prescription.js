import express from "express";
import  {authenticateToken} from "../middlewares/jwt.js";
import {getPrescription}  from "../controllers/prescriptionController.js";
import {updatePrescription} from "../controllers/prescriptionController.js"
const router=express();
router.get("/:consultationId",authenticateToken,getPrescription);
router.put("/:consultaionId",authenticateToken,updatePrescription);
export default router;