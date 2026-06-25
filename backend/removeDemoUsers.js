// One-time cleanup — deletes the OLD hardcoded demo accounts
// (bastin@swivel.com / bas@swivel.com / pand@swivel.com) that earlier
// versions of seed.js used to create, along with their enrollments.
//
// Safe to run on a database that never had these accounts — it simply
// deletes 0 rows in that case. Does NOT touch any other student/trainer/
// admin you've created through the Admin Dashboard.
//
// Usage:
//   node removeDemoUsers.js

const dotenv = require('dotenv');
dotenv.config();

const { pool, connectDB } = require('./config/db');

const DEMO_EMAILS = ['bastin@swivel.com', 'bas@swivel.com', 'pand@swivel.com'];

const run = async () => {
  try {
    await connectDB();
    console.log('PostgreSQL connected...');

    let totalRemoved = 0;

    // Students
    const studentRes = await pool.query('SELECT id, email FROM students WHERE email = ANY($1)', [DEMO_EMAILS]);
    if (studentRes.rows.length > 0) {
      const ids = studentRes.rows.map((r) => r.id);
      await pool.query('DELETE FROM enrollments WHERE student_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM quiz_attempts WHERE student_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM students WHERE id = ANY($1)', [ids]);
      studentRes.rows.forEach((u) => console.log(`  [student] removed ${u.email}`));
      totalRemoved += studentRes.rows.length;
    }

    // Trainers
    const trainerRes = await pool.query('SELECT id, email FROM trainers WHERE email = ANY($1)', [DEMO_EMAILS]);
    if (trainerRes.rows.length > 0) {
      const ids = trainerRes.rows.map((r) => r.id);
      await pool.query('DELETE FROM trainers WHERE id = ANY($1)', [ids]);
      trainerRes.rows.forEach((u) => console.log(`  [trainer] removed ${u.email}`));
      totalRemoved += trainerRes.rows.length;
    }

    // Admins
    const adminRes = await pool.query('SELECT id, email FROM admins WHERE email = ANY($1)', [DEMO_EMAILS]);
    if (adminRes.rows.length > 0) {
      const ids = adminRes.rows.map((r) => r.id);
      await pool.query('DELETE FROM admins WHERE id = ANY($1)', [ids]);
      adminRes.rows.forEach((u) => console.log(`  [admin] removed ${u.email}`));
      totalRemoved += adminRes.rows.length;
    }

    if (totalRemoved === 0) {
      console.log('No old demo accounts found — nothing to remove.');
    } else {
      console.log(`Removed ${totalRemoved} demo account(s) total.`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error.message);
    process.exit(1);
  }
};

run();
