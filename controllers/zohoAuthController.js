// backend/controllers/zohoAuthController.js
const axios = require("axios");
const User = require("../models/User");
const {
  signAccessToken,
  signRefreshToken,
} = require("../utils/jwtHelper");

exports.loginUrl = (req, res) => {
  const base = process.env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com";
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirect = encodeURIComponent(process.env.ZOHO_REDIRECT_URI);
  const scope = encodeURIComponent("AaaServer.profile.Read");

  const url = `${base}/oauth/v2/auth?scope=${scope}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirect}`;
  return res.json({ url });
};

exports.callback = async (req, res) => {
  try {
    const code = req.query.code || req.body.code;
    if (!code) return res.status(400).json({ message: "code required" });

    const base = process.env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com";

    const tokenResp = await axios.post(
      `${base}/oauth/v2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        code,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResp.data.access_token;

    const infoResp = await axios.get(`${base}/oauth/user/info`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const userInfo = infoResp.data?.user || infoResp.data;
    const email = userInfo.email;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: userInfo.name,
        email,
        password: Math.random().toString(36).slice(2, 8),
        role: "labor",
      });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (err) {
    console.error("Zoho error:", err.message);
    return res.status(500).json({ message: "Zoho auth failed" });
  }
};
