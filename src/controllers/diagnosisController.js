import express from 'express';
import Consultation from '../models/Consultation.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Users from '../models/user.js';
// Helper functions
function formatSymptomName(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export const getSymptomps=async (req, res) => {
   try {
     const consultation = await Consultation.findById(req.params.consultationId);
  const patientInfo=await Users.findById(consultation.patientId)
     console.log("patientInfo",patientInfo);
     if (!consultation) {
       return res.status(404).json({ message: 'Consultation not found' });
     }
 
     // Format symptoms from extractedEntities.diseases
     const symptoms = consultation.extractedEntities.diseases.map((disease, index) => ({
       id: index + 1,
       name: formatSymptomName(disease),         // "constipation" → "Constipation"
       duration: consultation.extractedEntities.duration || 'Not specified',
     }));
 
     // Format diagnoses from prescription
     const diseases = [{
       id: 1,
       name: consultation.prescription.diagnosis,
       confidence: 85,                            // or calculate dynamically
       // category: getCategoryForDiagnosis(consultation.prescription.diagnosis),
       // description: getDescriptionForDiagnosis(consultation.prescription.diagnosis),
       matchingSymptoms: consultation.extractedEntities.diseases.map(formatSymptomName),
       recommendations: consultation.prescription.advice || [],
     }];
 
    
     res.json({
       patientInfo,
       symptoms,
       diseases,
       disclaimer: consultation.prescription.disclaimer,
     });
 
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
};
export const updateSymptom = async (req, res) => {
  try {
    const { name, duration, severity } = req.body;
    const consultation = await Consultation.findById(req.params.consultationId);
    if (!consultation) return res.status(404).json({ message: 'Not found' });

    const symptomIndex = parseInt(req.params.symptomId) - 1;
    if (consultation.extractedEntities.diseases[symptomIndex] !== undefined) {
      consultation.extractedEntities.diseases[symptomIndex] = name.toLowerCase();
      if (duration) consultation.extractedEntities.duration = duration;
      consultation.markModified('extractedEntities'); 
      await consultation.save();
    }
    res.json({ message: 'Symptom updated', symptom: { id: req.params.symptomId, name, duration, severity } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const updateDisease=  async (req, res) => {
  try {
    const { name, category, confidence, description, matchingSymptoms, recommendations } = req.body;
    const consultation = await Consultation.findById(req.params.consultationId);
    if (!consultation) return res.status(404).json({ message: 'Not found' });

    consultation.prescription.diagnosis = name;
    consultation.prescription.advice = recommendations;
    await consultation.save();

    res.json({ message: 'Diagnosis updated', disease: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const exportReport = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.consultationId);
    if (!consultation) return res.status(404).json({ message: 'Not found' });

    // Manually find karo
    const doctor = await Doctor.findById(consultation.doctorId);
    const patient = await Patient.findById(consultation.patientId);

    console.log('Doctor found:', doctor);
    console.log('Patient found:', patient);

    res.json({
      reportDate: new Date().toISOString(),
      doctor: doctor?.name || doctor?.fullName || doctor?.firstName || 'N/A',
      patient: patient?.name || patient?.fullName || patient?.firstName || 'N/A',
      patientAge: patient?.age || 'N/A',
      transcript: consultation.input_text,
      diseases: consultation.extractedEntities?.diseases,
      diagnosis: consultation.prescription?.diagnosis,
      prescription: consultation.prescription?.prescription,
      advice: consultation.prescription?.advice,
      disclaimer: consultation.prescription?.disclaimer,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};