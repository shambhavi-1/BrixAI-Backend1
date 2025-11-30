// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const verifyToken = require("./middleware/verifyToken");

const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const daylogRoutes = require("./routes/daylogRoutes");
const issueRoutes = require("./routes/issueRoutes");
const materialRoutes = require("./routes/materialRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const aiRoutes = require("./routes/aiRoutes");
const cliqRoutes = require("./routes/cliqRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const widgetRoutes = require("./routes/widgetRoutes");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static widget files for Zoho Cliq integration
app.use('/widget', express.static(path.join(__dirname, 'widget')));

// Public basic route for healthcheck
app.get("/", (req, res) => res.send("BrixAI backend running..."));

// If you add authRoutes later, mount them BEFORE verifyToken:
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

app.use("/api/cliq", cliqRoutes);
app.use("/api/webhooks", webhookRoutes);

// Protect all routes below
app.use(verifyToken);

// Widget routes (public for iframe embedding)
app.use("/api/widget", widgetRoutes);

// Protected routes
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/daylogs", daylogRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ai", aiRoutes);

// test route to inspect req.user quickly
app.get("/api/test-token", (req, res) => {
  res.json({ message: "Token OK", user: req.user });
});

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
