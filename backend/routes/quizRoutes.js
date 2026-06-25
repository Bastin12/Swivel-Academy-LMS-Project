const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizResults,
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require a valid JWT
router.use(protect);

// GET  /api/quizzes   – students see only published quizzes for enrolled courses; trainers see all
// POST /api/quizzes   – trainer / admin only
router
  .route('/')
  .get(getQuizzes)
  .post(authorize('trainer', 'admin'), createQuiz);

// ── Named-action routes MUST come BEFORE the /:id catch-all ──────────────
// POST /api/quizzes/:id/submit   – student submits answers
router.post('/:id/submit', authorize('student'), submitQuiz);

// GET /api/quizzes/:id/results   – trainer/admin views all student attempts
router.get('/:id/results', authorize('trainer', 'admin'), getQuizResults);

// GET    /api/quizzes/:id   – view a single quiz
// PUT    /api/quizzes/:id   – edit
// DELETE /api/quizzes/:id   – delete
router
  .route('/:id')
  .get(getQuizById)
  .put(authorize('trainer', 'admin'), updateQuiz)
  .delete(authorize('trainer', 'admin'), deleteQuiz);

module.exports = router;
