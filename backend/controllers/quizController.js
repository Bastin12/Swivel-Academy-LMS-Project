const { pool } = require('../config/db');
const Quiz = require('../models/Quiz');

// Strip the `correct` answer key out of each question before sending to a
// student who has NOT yet attempted the quiz, so the answer can't be read
// from the network tab. Once they've submitted, it's safe to reveal.
function stripAnswers(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map(({ correct, ...rest }) => rest),
  };
}

// @desc    Get quizzes
//          Trainer/admin → all quizzes they can manage (optionally ?course=)
//          Student       → only published quizzes for their enrolled courses
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { course } = req.query;

    if (role === 'trainer' || role === 'admin') {
      const quizzes = await Quiz.find({ course });
      return res.json({ success: true, data: quizzes });
    }

    // Student: restrict to enrolled courses, published only
    const enrollRes = await pool.query(
      'SELECT course_title FROM enrollments WHERE student_id = $1',
      [userId]
    );
    const myCourses = enrollRes.rows.map((r) => r.course_title);

    const quizzes = await Quiz.find({ courses: myCourses, status: 'published' });

    // Attach this student's attempt (if any) and hide answer key until attempted
    const attempts = await Quiz.findAttemptsForStudent(userId);
    const attemptByQuiz = new Map(attempts.map((a) => [a.quiz_id, a]));

    const data = quizzes.map((q) => {
      const attempt = attemptByQuiz.get(q.id) || null;
      return {
        ...(attempt ? q : stripAnswers(q)),
        myAttempt: attempt,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getQuizzes error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single quiz by id
// @route   GET /api/quizzes/:id
// @access  Private
const getQuizById = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (role === 'trainer' || role === 'admin') {
      return res.json({ success: true, data: quiz });
    }

    // Student: verify enrollment + published, hide answers until attempted
    const enrollRes = await pool.query(
      'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_title = $2',
      [userId, quiz.course]
    );
    if (enrollRes.rows.length === 0 || quiz.status !== 'published') {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this quiz\'s course' });
    }

    const attempt = await Quiz.findAttempt(quiz.id, userId);
    return res.json({ success: true, data: { ...(attempt ? quiz : stripAnswers(quiz)), myAttempt: attempt } });
  } catch (error) {
    console.error('getQuizById error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a quiz
// @route   POST /api/quizzes
// @access  Private (trainer/admin)
const createQuiz = async (req, res) => {
  try {
    const { title, course, timeLimitMinutes, passMark, questions, status } = req.body;

    const quiz = await Quiz.create({
      title,
      course,
      timeLimitMinutes,
      passMark,
      questions,
      status,
      createdBy: req.user.id,
      createdByRole: req.user.role,
      createdByName: req.user.name,
    });

    return res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    console.error('createQuiz error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Private (trainer/admin)
const updateQuiz = async (req, res) => {
  try {
    const existing = await Quiz.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const { title, course, timeLimitMinutes, passMark, questions, status } = req.body;
    const quiz = await Quiz.update(req.params.id, { title, course, timeLimitMinutes, passMark, questions, status });

    return res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('updateQuiz error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (trainer/admin)
const deleteQuiz = async (req, res) => {
  try {
    const deleted = await Quiz.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteQuiz error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit a student's answers for scoring
// @route   POST /api/quizzes/:id/submit
// @access  Private (student)
const submitQuiz = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can submit quiz attempts' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Verify enrollment
    const enrollRes = await pool.query(
      'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_title = $2',
      [userId, quiz.course]
    );
    if (enrollRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this quiz\'s course' });
    }

    // Block re-submission — one attempt per student per quiz
    const already = await Quiz.findAttempt(quiz.id, userId);
    if (already) {
      return res.status(409).json({ success: false, message: 'You have already submitted this quiz', data: already });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers must be an array of selected option indices' });
    }

    const attempt = await Quiz.submitAttempt(quiz, userId, answers);
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('submitQuiz error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all attempts/results for a quiz (trainer view)
// @route   GET /api/quizzes/:id/results
// @access  Private (trainer/admin)
const getQuizResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    const attempts = await Quiz.findAttemptsForQuiz(quiz.id);
    return res.json({ success: true, data: { quiz, attempts } });
  } catch (error) {
    console.error('getQuizResults error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizResults,
};
