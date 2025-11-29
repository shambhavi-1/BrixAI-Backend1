// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const zohoController = require('../controllers/zohoAuthController');

// TEMP debug (You can remove after it works)
console.log("Loaded authController:", authController);

// Local register/login
router.post('/register', authController.signup);
router.post('/login', authController.login);

// Zoho OAuth
router.get('/zoho/login', zohoController.loginUrl);
router.get('/zoho/callback', zohoController.callback);
router.post('/zoho/callback', zohoController.callback);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
