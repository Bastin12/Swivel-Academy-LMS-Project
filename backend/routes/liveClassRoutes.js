const express = require('express');
const router = express.Router();
const {
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  cancelLiveClass,
  completeLiveClass,
  deleteLiveClass,
} = require('../controllers/liveClassController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require a valid JWT
router.use(protect);

// GET  /api/live-classes   – students see only enrolled courses; trainers see all
// POST /api/live-classes   – trainer / admin only
router
  .route('/')
  .get(getLiveClasses)
  .post(authorize('trainer', 'admin'), createLiveClass);

// ── Named-action routes MUST come BEFORE the /:id catch-all ──────────────
// PUT /api/live-classes/:id/cancel
router.put('/:id/cancel', authorize('trainer', 'admin'), cancelLiveClass);

// PUT /api/live-classes/:id/complete
router.put('/:id/complete', authorize('trainer', 'admin'), completeLiveClass);

// PUT    /api/live-classes/:id   – edit
// DELETE /api/live-classes/:id   – delete
router
  .route('/:id')
  .put(authorize('trainer', 'admin'), updateLiveClass)
  .delete(authorize('trainer', 'admin'), deleteLiveClass);

module.exports = router;
