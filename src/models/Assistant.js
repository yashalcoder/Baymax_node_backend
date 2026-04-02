import mongoose from "mongoose";

const assistantSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  degree:          { type: String, default: "" },
  patientsManaged: [{ type: mongoose.Schema.Types.ObjectId, ref: "Patient" }],
});

export default mongoose.model("Assistant", assistantSchema);