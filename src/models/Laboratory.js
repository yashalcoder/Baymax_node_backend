import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., Complete Blood Count
  category: { type: String },                   // e.g., Hematology
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },  
  normalRange: { type: String },               // e.g., 4.5-11.0 x10^9/L
  units: { type: String },                      // e.g., x10^9/L
  lastUpdated: { type: Date, default: Date.now },
});

const laboratorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  labName: { type: String, required: true },
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
  tests: [testSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

laboratorySchema.index({ location: "2dsphere" });

export default mongoose.model("Laboratory", laboratorySchema);
