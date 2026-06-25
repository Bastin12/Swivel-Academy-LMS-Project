const { pool } = require('../config/db');

// Validate a single question object shaped like:
//   { text, options: [string,string,string,string], correct: 0-3, marks }
function validateQuestion(q, idx) {
  if (!q || typeof q.text !== 'string' || !q.text.trim()) {
    throw new Error(`Question ${idx + 1}: text is required`);
  }
  if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== 'string' || !o.trim())) {
    throw new Error(`Question ${idx + 1}: exactly 4 non-empty options are required`);
  }
  const correct = Number(q.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
    throw new Error(`Question ${idx + 1}: correct must be an option index 0-3`);
  }
  const marks = Number(q.marks);
  if (!Number.isFinite(marks) || marks <= 0) {
    throw new Error(`Question ${idx + 1}: marks must be a positive number`);
  }
  return {
    text: q.text.trim(),
    options: q.options.map((o) => String(o).trim()),
    correct,
    marks,
  };
}

const Quiz = {
  // List quizzes. Trainers/admins can filter by course; students should be
  // pre-filtered to enrolled courses by the controller before calling this,
  // or pass courses: [...] to restrict server-side.
  async find({ course, courses, status } = {}) {
    const clauses = [];
    const values = [];
    let idx = 1;

    if (course) {
      clauses.push(`course = $${idx++}`);
      values.push(course);
    } else if (Array.isArray(courses)) {
      if (courses.length === 0) return [];
      clauses.push(`course = ANY($${idx++})`);
      values.push(courses);
    }

    if (status) {
      clauses.push(`status = $${idx++}`);
      values.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM quizzes ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  // Create a quiz. Throws on invalid payload (caught by controller -> 400).
  async create({ title, course, timeLimitMinutes, passMark, questions, status, createdBy, createdByRole, createdByName }) {
    if (!title || !title.trim()) throw new Error('Quiz title is required');
    if (!course || !course.trim()) throw new Error('Course is required');
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('At least one question is required');
    }

    const cleanQuestions = questions.map((q, i) => validateQuestion(q, i));

    const timeLimit = Number(timeLimitMinutes);
    const pass = Number(passMark);

    const result = await pool.query(
      `INSERT INTO quizzes
         (title, course, time_limit_minutes, pass_mark, questions, status, created_by, created_by_role, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        title.trim(),
        course.trim(),
        Number.isFinite(timeLimit) && timeLimit > 0 ? timeLimit : 15,
        Number.isFinite(pass) && pass >= 0 && pass <= 100 ? pass : 60,
        JSON.stringify(cleanQuestions),
        status === 'draft' ? 'draft' : 'published',
        createdBy || null,
        createdByRole || null,
        createdByName || '',
      ]
    );
    return result.rows[0];
  },

  async update(id, { title, course, timeLimitMinutes, passMark, questions, status }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title.trim()); }
    if (course !== undefined) { fields.push(`course = $${idx++}`); values.push(course.trim()); }
    if (timeLimitMinutes !== undefined) { fields.push(`time_limit_minutes = $${idx++}`); values.push(Number(timeLimitMinutes) || 15); }
    if (passMark !== undefined) { fields.push(`pass_mark = $${idx++}`); values.push(Number(passMark) || 60); }
    if (questions !== undefined) {
      const cleanQuestions = questions.map((q, i) => validateQuestion(q, i));
      fields.push(`questions = $${idx++}`);
      values.push(JSON.stringify(cleanQuestions));
    }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status === 'draft' ? 'draft' : 'published'); }

    if (fields.length === 0) return await Quiz.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  },

  // ── Attempts ─────────────────────────────────────────────────────────────

  async findAttempt(quizId, studentId) {
    const result = await pool.query(
      'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
      [quizId, studentId]
    );
    return result.rows[0] || null;
  },

  async findAttemptsForQuiz(quizId) {
    const result = await pool.query(
      `SELECT qa.*, s.name AS student_name, s.email AS student_email
         FROM quiz_attempts qa
         JOIN students s ON s.id = qa.student_id
        WHERE qa.quiz_id = $1
        ORDER BY qa.submitted_at DESC`,
      [quizId]
    );
    return result.rows;
  },

  async findAttemptsForStudent(studentId) {
    const result = await pool.query(
      'SELECT * FROM quiz_attempts WHERE student_id = $1',
      [studentId]
    );
    return result.rows;
  },

  // Score a submission server-side (never trust client-computed scores) and
  // persist the attempt. answers is an array of selected option indices
  // (or null) aligned to quiz.questions.
  async submitAttempt(quiz, studentId, answers) {
    const questions = quiz.questions || [];
    let score = 0;
    let totalMarks = 0;

    questions.forEach((q, i) => {
      totalMarks += Number(q.marks) || 0;
      const given = Array.isArray(answers) ? answers[i] : undefined;
      if (given !== null && given !== undefined && Number(given) === Number(q.correct)) {
        score += Number(q.marks) || 0;
      }
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
    const passed = percentage >= Number(quiz.pass_mark || 0);

    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total_marks, percentage, passed)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (quiz_id, student_id)
       DO UPDATE SET answers = $3, score = $4, total_marks = $5, percentage = $6, passed = $7, submitted_at = NOW()
       RETURNING *`,
      [quiz.id, studentId, JSON.stringify(answers || []), score, totalMarks, percentage, passed]
    );
    return result.rows[0];
  },
};

module.exports = Quiz;
