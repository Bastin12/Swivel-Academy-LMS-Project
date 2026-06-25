const { pool } = require('../config/db');

const Course = {
  async find({ status } = {}) {
    if (status) {
      const result = await pool.query(
        'SELECT * FROM courses WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByTitle(title) {
    const result = await pool.query('SELECT * FROM courses WHERE title = $1', [title]);
    return result.rows[0] || null;
  },

  // Just the title strings — this is what every dropdown in the app
  // (trainer's quiz form, trainer's live-class form, admin's student
  // enrollment picker) should call to populate its course list, so they
  // all stay in sync with whatever the admin manages here.
  async listTitles({ status = 'active' } = {}) {
    const result = await pool.query(
      'SELECT title FROM courses WHERE status = $1 ORDER BY title',
      [status]
    );
    return result.rows.map((r) => r.title);
  },

  async create({ title, trainerName, category, price, thumb, status }) {
    if (!title || !title.trim()) throw new Error('Course title is required');

    const existing = await Course.findByTitle(title.trim());
    if (existing) throw new Error('A course with this title already exists');

    const result = await pool.query(
      `INSERT INTO courses (title, trainer_name, category, price, thumb, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        title.trim(),
        trainerName?.trim() || '',
        category?.trim() || 'General',
        price?.trim() || '₹0',
        thumb?.trim() || 'code',
        status === 'inactive' ? 'inactive' : 'active',
      ]
    );
    return result.rows[0];
  },

  async update(id, { title, trainerName, category, price, thumb, status }) {
    if (title !== undefined) {
      if (!title.trim()) throw new Error('Course title cannot be empty');
      const existing = await Course.findByTitle(title.trim());
      if (existing && String(existing.id) !== String(id)) {
        throw new Error('A course with this title already exists');
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined)       { fields.push(`title = $${idx++}`);        values.push(title.trim()); }
    if (trainerName !== undefined) { fields.push(`trainer_name = $${idx++}`); values.push(trainerName.trim()); }
    if (category !== undefined)    { fields.push(`category = $${idx++}`);     values.push(category.trim()); }
    if (price !== undefined)       { fields.push(`price = $${idx++}`);        values.push(price.trim()); }
    if (thumb !== undefined)       { fields.push(`thumb = $${idx++}`);        values.push(thumb.trim()); }
    if (status !== undefined)      { fields.push(`status = $${idx++}`);       values.push(status === 'inactive' ? 'inactive' : 'active'); }

    if (fields.length === 0) return await Course.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id, title', [id]);
    return result.rows[0] || null;
  },

  // How many students are currently enrolled in this course title —
  // used by the admin's Course Management table.
  async countStudents(title) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE course_title = $1',
      [title]
    );
    return Number(result.rows[0].count);
  },
};

module.exports = Course;
