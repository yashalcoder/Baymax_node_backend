import express from "express";
import cors from "cors";
import transcribeRoutes from "./routes/transcribeRoutes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Node API running successfully 🚀" });
});
app.use("/api", transcribeRoutes);
export default app;
