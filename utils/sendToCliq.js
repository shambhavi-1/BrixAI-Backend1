const axios = require('axios');

module.exports = async (message) => {
  if (!process.env.CLIQ_POST_URL) return null;
  try {
    const res = await axios.post(process.env.CLIQ_POST_URL, { text: message }, {
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CLIQ_BOT_TOKEN ? { Authorization: `Zoho-oauthtoken ${process.env.CLIQ_BOT_TOKEN}` } : {})
      }
    });
    return res.data;
  } catch (err) {
    console.warn('sendToCliq error', err.message);
    return null;
  }
};
