const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../utils/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/assign-role', protect, authorize(['manager']), ctrl.assignRole);
router.get('/me', protect, ctrl.getProfile);

module.exports = router;
