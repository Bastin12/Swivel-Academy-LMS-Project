// One-time setup script — creates the FIRST admin account so someone can
// log in and start using the "Add User" / "Add Trainer" screens to create
// every other account for real. It does NOT create any demo students,
// demo trainers, or demo enrollments — the database starts genuinely empty
// apart from this one admin.
//
// Safe to run multiple times: if an admin already exists, it does nothing.
//
// Usage:
//   node seed.js
//   node seed.js --name "Jane Admin" --email "jane@swivel.com" --password "ChangeMe123"
//
// If no flags are given, it falls back to the values below — change the
// password immediately after your first login.

const dotenv = require('dotenv');
dotenv.config();

const { pool, connectDB } = require('./config/db');
const Admin = require('./models/Admin');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, i, all) => {
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = all[i + 1];
    }
  });
  return args;
}

const args = parseArgs();

const ADMIN = {
  name: args.name || 'Admin',
  email: (args.email || 'admin@swivel.com').toLowerCase().trim(),
  password: args.password || 'Admin@123',
};

const setup = async () => {
  try {
    await connectDB();
    console.log('PostgreSQL connected for setup...');

    const existingAdmin = await pool.query('SELECT id, email FROM admins LIMIT 1');

    if (existingAdmin.rows.length > 0) {
      console.log(`An admin account already exists (${existingAdmin.rows[0].email}). Nothing to do.`);
      console.log('To add more trainers or students, log in as that admin and use the Admin Dashboard.');
    } else {
      const admin = await Admin.create(ADMIN);
      console.log('First admin account created:');
      console.log(`  email:    ${admin.email}`);
      console.log(`  password: ${ADMIN.password}`);
      console.log('IMPORTANT: log in and change this password right away.');
      console.log('Once logged in, use the Admin Dashboard to add trainers and students — no other demo data was created.');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Setup error:', error.message);
    process.exit(1);
  }
};

setup();
