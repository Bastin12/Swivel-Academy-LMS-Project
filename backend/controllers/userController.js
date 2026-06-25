const Student = require('../models/Student');
const Trainer = require('../models/Trainer');
const Account = require('../models/Account');
const { pool } = require('../config/db');

const MODEL_BY_ROLE = { student: Student, trainer: Trainer };

// Admins are managed separately (there's no "Admin Management" screen in
// this app — only students and trainers are created/edited from the Admin
// Dashboard), so this controller only ever deals with those two roles.
function modelFor(role) {
  return MODEL_BY_ROLE[role] || null;
}

// @desc    Get all students or all trainers (role is required since they're
//          now separate tables — there's no single "all users" query)
// @route   GET /api/users?role=student | GET /api/users?role=trainer
// @access  Private (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const Model = modelFor(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Query param "role" must be "student" or "trainer"' });
    }

    const records = await Model.find();

    if (role === 'student') {
      // Attach enrolled course titles in one extra query instead of N+1.
      const ids = records.map((r) => r.id);
      let coursesById = new Map();
      if (ids.length > 0) {
        const enrollRes = await pool.query(
          'SELECT student_id, course_title FROM enrollments WHERE student_id = ANY($1)',
          [ids]
        );
        coursesById = enrollRes.rows.reduce((map, row) => {
          const list = map.get(row.student_id) || [];
          list.push(row.course_title);
          map.set(row.student_id, list);
          return map;
        }, new Map());
      }
      const enriched = records.map((r) => ({ ...r, courses: coursesById.get(r.id) || [] }));
      return res.status(200).json({ success: true, count: enriched.length, users: enriched });
    }

    res.status(200).json({ success: true, count: records.length, users: records });
  } catch (error) {
    console.error('getAllUsers error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single student or trainer by id
// @route   GET /api/users/:id?role=student | GET /api/users/:id?role=trainer
// @access  Private (admin only)
const getUserById = async (req, res) => {
  try {
    const { role } = req.query;
    const Model = modelFor(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Query param "role" must be "student" or "trainer"' });
    }

    const user = await Model.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: `${role} not found` });
    }
    if (role === 'student') {
      user.courses = await Student.getEnrolledCourses(user.id);
    }
    res.status(200).json({ success: true, user: { ...user, role } });
  } catch (error) {
    console.error('getUserById error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new student or trainer
// @route   POST /api/users   body: { role: 'student'|'trainer', name, email, password, specialization?, courses? }
// @access  Private (admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, specialization, courses } = req.body;

    const Model = modelFor(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: '"role" must be "student" or "trainer"' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check across ALL THREE tables, not just this one — prevents creating
    // a student with the same email as an existing trainer/admin, which
    // would otherwise be allowed now that they're separate tables.
    const existing = await Account.findEmailAnywhere(email);
    if (existing) {
      return res.status(400).json({ success: false, message: `Email already in use by an existing ${existing.role}` });
    }

    const user = role === 'trainer'
      ? await Model.create({ name, email, password, specialization })
      : await Model.create({ name, email, password });

    // Optional: enroll a newly created student in courses right away.
    if (role === 'student' && Array.isArray(courses) && courses.length > 0) {
      for (const courseTitle of courses) {
        if (!courseTitle) continue;
        await pool.query(
          'INSERT INTO enrollments (student_id, course_title) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, courseTitle]
        );
      }
      user.courses = courses;
    }

    res.status(201).json({ success: true, user: { ...user, role } });
  } catch (error) {
    // Validation errors thrown by the model (bad email, short password, etc.)
    // are safe to show directly — they're written for end users.
    res.status(400).json({ success: false, message: error.message || 'Failed to create user' });
  }
};

// @desc    Update a student or trainer. Supports resetting the password
//          and, for students, replacing their full set of enrolled courses.
// @route   PUT /api/users/:id?role=student | PUT /api/users/:id?role=trainer
// @access  Private (admin only)
const updateUser = async (req, res) => {
  try {
    const { role } = req.query;
    const Model = modelFor(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Query param "role" must be "student" or "trainer"' });
    }

    const { name, email, isActive, specialization, password, courses } = req.body;

    if (email !== undefined) {
      const existing = await Account.findEmailAnywhere(email);
      if (existing && !(existing.role === role && String(existing.id) === String(req.params.id))) {
        return res.status(400).json({ success: false, message: `Email already in use by an existing ${existing.role}` });
      }
    }

    const updatePayload = role === 'trainer'
      ? { name, email, isActive, specialization, password }
      : { name, email, isActive, password };

    const user = await Model.findByIdAndUpdate(req.params.id, updatePayload);

    if (!user) {
      return res.status(404).json({ success: false, message: `${role} not found` });
    }

    // Replace enrollments wholesale if the admin edited the course list
    if (role === 'student' && Array.isArray(courses)) {
      await pool.query('DELETE FROM enrollments WHERE student_id = $1', [user.id]);
      for (const courseTitle of courses) {
        if (!courseTitle) continue;
        await pool.query(
          'INSERT INTO enrollments (student_id, course_title) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, courseTitle]
        );
      }
      user.courses = courses;
    } else if (role === 'student') {
      user.courses = await Student.getEnrolledCourses(user.id);
    }

    res.status(200).json({ success: true, user: { ...user, role } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update user' });
  }
};

// @desc    Delete a student or trainer
// @route   DELETE /api/users/:id?role=student | DELETE /api/users/:id?role=trainer
// @access  Private (admin only)
const deleteUser = async (req, res) => {
  try {
    const { role } = req.query;
    const Model = modelFor(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Query param "role" must be "student" or "trainer"' });
    }

    // The self-delete guard only matters for an admin deleting their own
    // admin account, which this endpoint never touches — but keep a role
    // check anyway in case the logged-in admin's id happens to collide
    // numerically with the student/trainer id being deleted (harmless,
    // since the tables are independent, but explicit is safer than clever).
    if (req.user.role === role && String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account while logged in' });
    }

    const user = await Model.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: `${role} not found` });
    }
    res.status(200).json({ success: true, message: `${role} deleted successfully` });
  } catch (error) {
    console.error('deleteUser error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
