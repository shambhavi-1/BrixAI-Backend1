const connectDB = require('../config/db');
const cliqController = require('../controllers/cliqController');

connectDB();

module.exports = async function(req, res) {
  req.body = req.body || req.payload || {};
  return cliqController.handleCliqCommand(req, res);
};
