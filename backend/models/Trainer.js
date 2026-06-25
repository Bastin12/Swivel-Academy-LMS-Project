const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const Trainer = {
  async findOne({ email, id } = {}) {
    let result;
    if (email !== undefined) {
      result = await pool.query('SELECT * FROM trainers WHERE email = $1', [email]);
    } else if (id !== undefined) {
      result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
    } else {
      return null;
    }
    return result.rows[0] || null;
  },

  async findById(id, { excludePassword = true } = {}) {
    const result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
    const trainer = result.rows[0] || null;
    if (trainer && excludePassword) delete trainer.password;
    return trainer;
  },

  async find() {
    const result = await pool.query(
      'SELECT id, name, email, specialization, is_active, created_at, updated_at FROM trainers ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async create({ name, email, password, specialization }) {
    if (!name || !name.trim()) throw new Error('Name is required');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Please enter a valid email');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO trainers (name, email, password, specialization)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, specialization, is_active, created_at, updated_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, specialization?.trim() || null]
    );
    return result.rows[0];
  },

  async findByIdAndUpdate(id, { name, email, isActive, specialization, password }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)           { fields.push(`name = $${idx++}`);           values.push(name); }
    if (email !== undefined)          { fields.push(`email = $${idx++}`);          values.push(email.toLowerCase().trim()); }
    if (isActive !== undefined)       { fields.push(`is_active = $${idx++}`);      values.push(isActive); }
    if (specialization !== undefined) { fields.push(`specialization = $${idx++}`); values.push(specialization?.trim() || null); }

    if (password) {
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      fields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) return await Trainer.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE trainers SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, specialization, is_active, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  },

  async findByIdAndDelete(id) {
    const result = await pool.query(
      'DELETE FROM trainers WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    return result.rows[0] || null;
  },

  async matchPassword(enteredPassword, storedHash) {
    return await bcrypt.compare(enteredPassword, storedHash);
  },
};

module.exports = Trainer;
