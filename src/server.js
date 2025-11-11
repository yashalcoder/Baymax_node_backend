import express from "express";
import dotenv from "dotenv";
import connectdb from "./config/db.js"; // import your DB connection
import app from "./app.js"; // your Express app

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB first
  await connectdb();

  // Then start the server
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
};

startServer();
