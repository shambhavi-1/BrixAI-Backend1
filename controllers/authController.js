const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ------------------- TOKEN GENERATION -------------------
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// ------------------- SIGNUP -------------------
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    let existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      password,
      role: role || "labor",
      isZohoUser: false
    });

    const tokens = generateTokens(user);

    res.json({ message: "Signup successful", user, ...tokens });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- LOGIN -------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isZohoUser)
      return res.status(400).json({ message: "Login via Zoho only" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const tokens = generateTokens(user);

    res.json({ message: "Login successful", user, ...tokens });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- ZOHO OAUTH -------------------
exports.zohoOAuth = async (req, res) => {
  try {
    const { access_token, email, name } = req.body;

    if (!email) return res.status(400).json({ message: "Email required" });

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: "ZOHO_USER",
        isZohoUser: true,
        role: "labor"
      });
    }

    const tokens = generateTokens(user);
    res.json({ message: "Zoho login successful", user, ...tokens });
  } catch (err) {
    console.error("Zoho OAuth error:", err);
    res.status(500).json({ message: "OAuth failure" });
  }
};

// ------------------- REFRESH TOKEN -------------------
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: "Invalid refresh token" });

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
