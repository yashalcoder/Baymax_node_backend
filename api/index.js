// import app from "../src/app.js";
// export default app;


// for deployment 
import dotenv from "dotenv";
import connectdb from "../src/config/db.js";
import app from "../src/app.js";

dotenv.config();

// DB connect karein
let isConnected = false;
export default async function handler(req, res) {
  if (!isConnected) {
    await connectdb();
    isConnected = true;
  }
  return app(req, res);
}
