// routes/diagnosis.js
import express from 'express';
import { authenticateToken } from '../middlewares/jwt.js';
import {getSymptomps, exportReport, updateDisease, updateSymptom } from '../controllers/diagnosisController.js';
const router = express.Router();

// Returns full data for DiagnosisPage component
router.get('/:consultationId', authenticateToken, getSymptomps);
// Save edited symptom
router.put('/:consultationId/symptoms/:symptomId',authenticateToken,updateSymptom);
// Save edited disease/diagnosis
router.put('/:consultationId/diseases/:diseaseId',authenticateToken,updateDisease);
// Export report as JSON (frontend can convert to PDF)
router.get('/:consultationId/export',authenticateToken,exportReport);


export default router;