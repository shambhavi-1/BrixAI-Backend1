// backend/controllers/zohoAuthController.js
const axios = require('axios');
const User = require('../models/User');
const { signToken } = require('../utils/jwtHelper');

/**
 * Step 1: Redirect user to Zoho authorize URL
 * GET /auth/zoho/login
 */
exports.loginUrl = (req, res) => {
  const base = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirect = encodeURIComponent(process.env.ZOHO_REDIRECT_URI);
  const scope = encodeURIComponent('AaaServer.profile.Read'); // minimal
  const url = `${base}/oauth/v2/auth?scope=${scope}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirect}`;
  return res.json({ url });
};

/**
 * Step 2: Callback endpoint (Zoho sends ?code=...)
 * POST/GET /auth/zoho/callback?code=...
 */
exports.callback = async (req, res) => {
  try {
    const code = req.query.code || req.body.code;
    if (!code) return res.status(400).json({ message: 'code required' });

    const base = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
    const tokenUrl = `${base}/oauth/v2/token`;

    // Exchange code for access token
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.ZOHO_CLIENT_ID);
    params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
    params.append('redirect_uri', process.env.ZOHO_REDIRECT_URI);
    params.append('code', code);

    const tokenResp = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResp.data.access_token;
    if (!accessToken) return res.status(500).json({ message: 'No access token from Zoho' });

    // Get user info from Zoho
    // Zoho userinfo endpoint
    const infoResp = await axios.get(`${base}/oauth/user/info`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
    });

    const userInfo = infoResp.data?.user || infoResp.data; // adapt to possible response shapes
    const email = userInfo.email || (userInfo && userInfo.Emails && userInfo.Emails[0] && userInfo.Emails[0].value);

    if (!email) return res.status(500).json({ message: 'Could not get email from Zoho' });

    // Find or create local user
    let user = await User.findOne({ email });
    if (!user) {
      // auto-role assignment based on domain list (optional)
      let role = process.env.ZOHO_DEFAULT_ROLE || 'labor';
      if (process.env.ZOHO_ADMIN_DOMAINS) {
        const domains = process.env.ZOHO_ADMIN_DOMAINS.split(',').map(s => s.trim().toLowerCase());
        const userDomain = email.split('@')[1].toLowerCase();
        if (domains.includes(userDomain)) role = 'manager';
      }

      user = await User.create({
        name: userInfo.name || userInfo.display_name || email.split('@')[0],
        email,
        password: Math.random().toString(36).slice(2,8), // random placeholder, user can reset
        role,
      });
    }

    // Create JWT for your app
    const token = signToken(user);

    // You can redirect to your frontend with token as a param OR return JSON
    const frontend = process.env.FRONTEND_BASE_URL || '';
    if (req.query.redirect === 'true' && frontend) {
      // redirect with token (be careful with exposing tokens in URL in production)
      const redirectUrl = `${frontend}/auth/zoho/success?token=${token}`;
      return res.redirect(redirectUrl);
    }

    return res.json({ token, user });
  } catch (err) {
    console.error('zoho callback error', err.response?.data || err.message || err);
    return res.status(500).json({ message: 'Zoho auth failed', error: err.response?.data || err.message });
  }
};
