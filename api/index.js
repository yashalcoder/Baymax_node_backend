import dotenv from "dotenv";
import connectdb from "../src/config/db.js";
import app from "../src/app.js";

dotenv.config();

// Connect to MongoDB
connectdb();

export default app;
