// middleware/verifyToken.js
const tokenStore = require("../config/tokenStore");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token invalid" });
  }

  const token = authHeader.split(" ")[1].trim();
  const user = tokenStore[token];

  if (!user) {
    return res.status(401).json({ message: "Token invalid" });
  }

  // attach user object to request for all routes to use
  req.user = user;
  next();
};
