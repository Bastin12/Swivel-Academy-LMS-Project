const { pool } = require('../config/db');

// @desc    Get all live classes
//          Trainer/admin → all classes
//          Student       → only classes for their enrolled courses
// @route   GET /api/live-classes
// @access  Private
const getLiveClasses = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let result;

    if (role === 'trainer' || role === 'admin') {
      result = await pool.query(
        'SELECT * FROM live_classes ORDER BY date DESC, time DESC'
      );
    } else {
      // Student: join against enrollments so they only see their own courses
      result = await pool.query(
        `SELECT lc.*
           FROM live_classes lc
           INNER JOIN enrollments e ON e.course_title = lc.course
          WHERE e.student_id = $1
          ORDER BY lc.date DESC, lc.time DESC`,
        [userId]
      );
    }

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getLiveClasses error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a live class
// @route   POST /api/live-classes
// @access  Private (trainer/admin)
const createLiveClass = async (req, res) => {
  try {
    const {
      title, course, date, time, duration,
      platform, link, description, host,
      recurring, recurType, recurCount, notify,
    } = req.body;

    if (!title || !course || !date || !time || !link) {
      return res.status(400).json({
        success: false,
        message: 'title, course, date, time, and link are required',
      });
    }

    // Count how many students are enrolled in this course
    const enrollCount = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE course_title = $1',
      [course]
    );
    const enrolled = parseInt(enrollCount.rows[0].count, 10) || 0;

    const newId = `lc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const result = await pool.query(
      `INSERT INTO live_classes
         (id, title, course, date, time, duration, platform, link,
          description, host, status, enrolled, joined,
          recurring, recur_type, recur_count, notify)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'scheduled',$11,0,$12,$13,$14,$15)
       RETURNING *`,
      [
        newId,
        title,
        course,
        date,
        time,
        Number(duration) || 60,
        platform || 'Zoom',
        link,
        description || '',
        host || req.user.name || '',
        enrolled,
        !!recurring,
        recurType || 'weekly',
        Number(recurCount) || 1,
        JSON.stringify(notify || {}),
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createLiveClass error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a live class
// @route   PUT /api/live-classes/:id
// @access  Private (trainer/admin)
const updateLiveClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course, date, time, duration, platform, link, description } = req.body;

    const result = await pool.query(
      `UPDATE live_classes
          SET title=$1, course=$2, date=$3, time=$4, duration=$5,
              platform=$6, link=$7, description=$8,
              manually_ended=false, updated_at=NOW()
        WHERE id=$9
        RETURNING *`,
      [
        title, course, date, time,
        Number(duration) || 60,
        platform || 'Zoom',
        link,
        description || '',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateLiveClass error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel a live class
// @route   PUT /api/live-classes/:id/cancel
// @access  Private (trainer/admin)
const cancelLiveClass = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE live_classes
          SET status='cancelled', updated_at=NOW()
        WHERE id=$1
        RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('cancelLiveClass error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a live class as completed / manually ended
// @route   PUT /api/live-classes/:id/complete
// @access  Private (trainer/admin)
const completeLiveClass = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE live_classes
          SET status='completed', manually_ended=true, updated_at=NOW()
        WHERE id=$1
        RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('completeLiveClass error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a live class
// @route   DELETE /api/live-classes/:id
// @access  Private (trainer/admin)
const deleteLiveClass = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM live_classes WHERE id=$1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteLiveClass error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  cancelLiveClass,
  completeLiveClass,
  deleteLiveClass,
};
