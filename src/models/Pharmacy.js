import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Paracetamol
  brand: { type: String },                // e.g., Panadol
  dosageForm: { type: String },          // e.g., tablet, syrup
  strength: { type: String },            // e.g., 500mg
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, default: 0 },
  expiryDate: { type: Date },             // optional but useful
  lastUpdated: { type: Date, default: Date.now },
});

const pharmacySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pharmacyName: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  location: { 
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  medicines: [medicineSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

pharmacySchema.index({ location: "2dsphere" });

export default mongoose.model("Pharmacy", pharmacySchema);
