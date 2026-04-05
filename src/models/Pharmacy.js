import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },
  dosageForm: { type: String },
  strengthValue: { type: Number, min: 0 },
  strengthUnit: { type: String, enum: ["mg", "ml", "g", "mcg", "IU"], default: "mg" },
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, default: 0 },
  status: { type: String, enum: ["Available", "Low Stock", "Out of Stock"], default: "Available" },
  expiryDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
});

const pharmacySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pharmacyName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    medicines: [medicineSchema], 
  },
  { timestamps: true }
);

pharmacySchema.index({ location: "2dsphere" });

export default mongoose.model("Pharmacy", pharmacySchema);