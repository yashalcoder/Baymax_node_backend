import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },
  dosageForm: { type: String },
  strength: { type: String },
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, default: 0 },
  expiryDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
});

const pharmacySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    pharmacyName: {
      type: String,
      required: true
    },

    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },

    //GEOJSON LOCATION
    location: {
      type: {
        type: String,
        enum: ["Point"],     // required
        required: true,
        default: "Point"
      },
      coordinates: {
        type: [Number],      // [longitude, latitude]
        required: true
      }
    },

    medicines: [medicineSchema],

    isOpen: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

pharmacySchema.index({ location: "2dsphere" });

export default mongoose.model("Pharmacy", pharmacySchema);
