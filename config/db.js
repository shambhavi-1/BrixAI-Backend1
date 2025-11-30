const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use local MongoDB for development, fallback to env if available
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/buildpro';
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    console.log("Continuing without database connection for demo purposes...");
    // Don't exit for demo purposes, but registration will fail
  }
};

module.exports = connectDB;
