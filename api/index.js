import dotenv from "dotenv";
dotenv.config();

export default async function handler(req, res) {
  try {
    const { default: connectdb } = await import("../src/config/db.js");
    await connectdb();
    res.status(200).json({ message: "DB connected" });
  } catch (err) {
    res.status(500).json({ message: "DB failed", error: err.message, stack: err.stack });
  }
}
