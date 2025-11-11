import express from "express";
import cors from "cors";
import connectdb from "./config/db.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";
const app = express();
connectdb();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Node API running successfully 🚀" });
});
app.use("/api", transcribeRoutes);
export default app;
