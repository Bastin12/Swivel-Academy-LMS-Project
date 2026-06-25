const express = require('express');
const router = express.Router();
const { login, getMe, debugUsers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', protect, getMe);

// GET /api/auth/debug-users  (dev only — lists all users without passwords)
router.get('/debug-users', debugUsers);

module.exports = router;
