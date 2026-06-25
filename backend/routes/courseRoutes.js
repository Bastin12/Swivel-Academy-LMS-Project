const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseTitles,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Every route here requires login
router.use(protect);

// GET /api/courses/titles — lightweight list of active course titles.
// Any logged-in role can read this (trainers need it for their quiz/
// live-class forms, students could use it for browsing) — it has no
// sensitive data, just the names.
router.get('/titles', getCourseTitles);

// Full course management is admin-only.
router
  .route('/')
  .get(authorize('admin'), getCourses)
  .post(authorize('admin'), createCourse);

router
  .route('/:id')
  .get(authorize('admin'), getCourseById)
  .put(authorize('admin'), updateCourse)
  .delete(authorize('admin'), deleteCourse);

module.exports = router;
