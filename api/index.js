import dotenv from "dotenv";
import connectdb from "../src/config/db.js";
import app from "../src/app.js";

dotenv.config();

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectdb();
      isConnected = true;
    } catch (err) {
      console.error("DB connection failed:", err);
      return res.status(500).json({ message: "DB connection failed", error: err.message });
    }
  }
  return app(req, res);
}
