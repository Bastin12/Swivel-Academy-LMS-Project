const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Trainer = require('../models/Trainer');

const isDev = process.env.NODE_ENV !== 'production';

const MODEL_BY_ROLE = { admin: Admin, student: Student, trainer: Trainer };

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and role',
      });
    }

    const validRoles = ['student', 'trainer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected',
      });
    }

    // Look the email up directly in the table for the selected role — this
    // also means selecting the wrong role for a real account correctly
    // reports "no user found" rather than leaking that the email exists
    // under a different role.
    const Model = MODEL_BY_ROLE[role];
    const account = await Model.findOne({ email: email.toLowerCase().trim() });

    if (!account) {
      return res.status(401).json({
        success: false,
        message: isDev
          ? `No ${role} account found with email: ${email}.`
          : 'Invalid credentials',
      });
    }

    // Check account active
    if (!account.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check password
    const isMatch = await Model.matchPassword(password, account.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: isDev
          ? 'Password does not match.'
          : 'Invalid credentials',
      });
    }

    const token = generateToken(account.id, role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user was already populated by the `protect` middleware (which
    // knows the role from the JWT), so we already have everything needed.
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Dev helper — list every account across all three tables
//          (emails + roles, no passwords)
// @route   GET /api/auth/debug-users
// @access  Dev only
const debugUsers = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  try {
    const [admins, students, trainers] = await Promise.all([
      Admin.find(),
      Student.find(),
      Trainer.find(),
    ]);
    const users = [
      ...admins.map((u) => ({ ...u, role: 'admin' })),
      ...students.map((u) => ({ ...u, role: 'student' })),
      ...trainers.map((u) => ({ ...u, role: 'trainer' })),
    ];
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login, getMe, debugUsers };
