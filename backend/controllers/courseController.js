const Course = require('../models/Course');

// @desc    Get all courses (admin/trainer view, includes enrolled student count)
// @route   GET /api/courses
// @access  Private (admin, trainer)
const getCourses = async (req, res) => {
  try {
    const { status } = req.query;
    const courseRows = await Course.find(status ? { status } : {});

    const enriched = await Promise.all(
      courseRows.map(async (c) => ({
        ...c,
        students: await Course.countStudents(c.title),
      }))
    );

    res.status(200).json({ success: true, count: enriched.length, courses: enriched });
  } catch (error) {
    console.error('getCourses error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get just the list of active course titles — lightweight,
//          used to populate dropdowns (trainer's quiz form, live-class
//          form, admin's student enrollment picker) so every part of the
//          app always offers the exact same course names.
// @route   GET /api/courses/titles
// @access  Private (any logged-in role)
const getCourseTitles = async (req, res) => {
  try {
    const titles = await Course.listTitles({ status: 'active' });
    res.status(200).json({ success: true, titles });
  } catch (error) {
    console.error('getCourseTitles error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single course
// @route   GET /api/courses/:id
// @access  Private (admin, trainer)
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    course.students = await Course.countStudents(course.title);
    res.status(200).json({ success: true, course });
  } catch (error) {
    console.error('getCourseById error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (admin only)
const createCourse = async (req, res) => {
  try {
    const { title, trainerName, category, price, thumb, status } = req.body;
    const course = await Course.create({ title, trainerName, category, price, thumb, status });
    course.students = 0;
    res.status(201).json({ success: true, course });
  } catch (error) {
    // Validation errors (duplicate title, empty title) are safe to show directly.
    res.status(400).json({ success: false, message: error.message || 'Failed to create course' });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (admin only)
const updateCourse = async (req, res) => {
  try {
    const { title, trainerName, category, price, thumb, status } = req.body;
    const course = await Course.update(req.params.id, { title, trainerName, category, price, thumb, status });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    course.students = await Course.countStudents(course.title);
    res.status(200).json({ success: true, course });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update course' });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (admin only)
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.delete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('deleteCourse error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCourses,
  getCourseTitles,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
