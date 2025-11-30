// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const verifyToken = require("./middleware/verifyToken");

// Import routes
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
const authRoutes = require("./routes/authRoutes");

const app = express();

// --- MIDDLEWARE --- //

// CORS configuration for your frontend (Vercel)
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://brix-ai-front-end.vercel.app",
  credentials: true, // if you use cookies or auth headers
}));

// Parse JSON request bodies
app.use(bodyParser.json());

// Serve static widget files for Zoho Cliq integration
app.use('/widget', express.static(path.join(__dirname, 'widget')));

// --- PUBLIC ROUTES --- //

// Health check
app.get("/", (req, res) => res.send("🚀 BrixAI backend running..."));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Authentication routes
app.use("/api/auth", authRoutes);

// Public routes
app.use("/api/cliq", cliqRoutes);
app.use("/api/webhooks", webhookRoutes);

// --- PROTECTED ROUTES --- //
app.use(verifyToken); // All routes below require valid JWT

app.use("/api/widget", widgetRoutes);

app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/daylogs", daylogRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ai", aiRoutes);

// Test route to check JWT
app.get("/api/test-token", (req, res) => {
  res.json({ message: "Token OK", user: req.user });
});

// --- DATABASE CONNECTION --- //
connectDB();

// --- SERVER LISTEN --- //
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
