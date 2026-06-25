const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const Student = {
  async findOne({ email, id } = {}) {
    let result;
    if (email !== undefined) {
      result = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
    } else if (id !== undefined) {
      result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    } else {
      return null;
    }
    return result.rows[0] || null;
  },

  async findById(id, { excludePassword = true } = {}) {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    const student = result.rows[0] || null;
    if (student && excludePassword) delete student.password;
    return student;
  },

  async find() {
    const result = await pool.query(
      'SELECT id, name, email, is_active, created_at, updated_at FROM students ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Get the list of course titles a student is enrolled in.
  async getEnrolledCourses(studentId) {
    const result = await pool.query(
      'SELECT course_title FROM enrollments WHERE student_id = $1 ORDER BY enrolled_at',
      [studentId]
    );
    return result.rows.map((r) => r.course_title);
  },

  async create({ name, email, password }) {
    if (!name || !name.trim()) throw new Error('Name is required');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Please enter a valid email');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO students (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, is_active, created_at, updated_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );
    return result.rows[0];
  },

  async findByIdAndUpdate(id, { name, email, isActive, password }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)     { fields.push(`name = $${idx++}`);      values.push(name); }
    if (email !== undefined)    { fields.push(`email = $${idx++}`);     values.push(email.toLowerCase().trim()); }
    if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(isActive); }

    if (password) {
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      fields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) return await Student.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, is_active, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  },

  async findByIdAndDelete(id) {
    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    return result.rows[0] || null;
  },

  async matchPassword(enteredPassword, storedHash) {
    return await bcrypt.compare(enteredPassword, storedHash);
  },
};

module.exports = Student;
