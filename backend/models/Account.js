// Account.js — the ONLY place that knows how to search across all three
// role tables (admins / students / trainers). Everything else (the admin's
// user-management screens, quiz code, etc.) should talk to Admin.js,
// Student.js, or Trainer.js directly once it already knows the role.
//
// This file exists specifically for the two places that DON'T know the
// role ahead of time:
//   - login (only has an email, has to find out which table it's in)
//   - auth middleware (has {id, role} from the JWT, needs one lookup call
//     that works no matter which role it turns out to be)

const Admin = require('./Admin');
const Student = require('./Student');
const Trainer = require('./Trainer');

const TABLES_BY_ROLE = {
  admin: Admin,
  student: Student,
  trainer: Trainer,
};

const Account = {
  // Search admins, then students, then trainers for a matching email.
  // Returns { ...personRow, role } or null. Email is assumed unique
  // *within* each table, but since the tables are now separate, the same
  // email could theoretically exist in two tables — first match wins,
  // checked in this fixed order (admin > student > trainer) to keep
  // behavior predictable. createUser/createAdmin should each check the
  // OTHER tables too before inserting if you want true global-uniqueness;
  // see findEmailAnywhere() below for that check.
  async findByEmail(email) {
    const normalized = email.toLowerCase().trim();

    const admin = await Admin.findOne({ email: normalized });
    if (admin) return { ...admin, role: 'admin' };

    const student = await Student.findOne({ email: normalized });
    if (student) return { ...student, role: 'student' };

    const trainer = await Trainer.findOne({ email: normalized });
    if (trainer) return { ...trainer, role: 'trainer' };

    return null;
  },

  // Look up by id when the role is already known (e.g. from a JWT or from
  // req.user after `protect` has run). Returns the row (without password)
  // plus `role`, or null if that id doesn't exist in that role's table.
  async findByIdAndRole(id, role) {
    const Model = TABLES_BY_ROLE[role];
    if (!Model) return null;
    const person = await Model.findById(id);
    if (!person) return null;
    return { ...person, role };
  },

  // Check whether an email is already taken in ANY of the three tables —
  // used by the admin's "create user" forms so you can't accidentally
  // create a student and a trainer with the same email.
  async findEmailAnywhere(email) {
    return await Account.findByEmail(email);
  },
};

module.exports = Account;
