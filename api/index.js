import dotenv from "dotenv";
dotenv.config();

let isConnected = false;

export default async function handler(req, res) {
  try {
    const { default: connectdb } = await import("../src/config/db.js");
    if (!isConnected) {
      await connectdb();
      isConnected = true;
    }
    const { default: app } = await import("../src/app.js");
    return app(req, res);
  } catch (err) {
    res.status(500).json({ message: "App failed", error: err.message, stack: err.stack });
  }
}
