const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');  // path must be correct
const zohoController = require('../controllers/zohoAuthController'); // fix path

// local signup/login
router.post('/register', authController.signup);
router.post('/login', authController.login);

// Zoho OAuth endpoints
router.get('/zoho/login', zohoController.loginUrl);
router.get('/zoho/callback', zohoController.callback);
router.post('/zoho/callback', zohoController.callback);

// refresh token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
