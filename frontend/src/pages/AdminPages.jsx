import { useEffect, useState, useCallback } from 'react';
import { courses as dashboardCourses, thumbEmoji } from '../data/data';
import { TrainersPage } from './PublicPages';
import { TrainerDashboard } from './TrainerPages';

// ── Shared API helpers (mirrors the pattern used in TrainerPages.jsx /
// StudentPages.jsx for live classes and quizzes) ──────────────────────────
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
});

// Course titles for the student-enrollment picker — fetched from the real
// `courses` table the admin manages on this same page, instead of the old
// hardcoded data.js list. Any role can hit GET /api/courses/titles.
function useCourseTitles() {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/courses/titles`, { headers: authHeaders() });
        const json = await res.json();
        if (!cancelled && res.ok) setTitles(json.titles || []);
      } catch {
        // leave empty rather than fall back to a stale hardcoded list
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { courseTitles: titles, loadingCourseTitles: loading };
}

export function AdminDashboard({ userName }) {
  const bars = [48, 62, 38, 75, 55, 82, 91, 70, 88, 65, 74, 96];
  const barColors = ['var(--sa-teal)', 'var(--sa-accent)', 'var(--sa-gold)'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Admin Dashboard</div>
        <div className="page-sub">Platform overview · {userName}</div>
      </div>

      

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Enrollment trend <small>last 12 months</small></div>
          <div className="mini-chart" style={{ height: 80 }}>
            {bars.map((b, i) => (
              <div key={i} className="bar" style={{ height: `${b}%`, background: barColors[i % 3], opacity: 0.7 }} title={`${b * 30} enrollments`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--sa-muted)', marginTop: 4 }}>
            <span>Feb</span><span>May</span><span>Aug</span><span>Jan</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top performing courses</div>
          {dashboardCourses.slice(0, 4).map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 16 }}>{thumbEmoji[c.thumb]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--sa-text)' }}>{c.title}</div>
                <div className="progress-bar" style={{ marginTop: 3 }}>
                  <div className="progress-fill" style={{ width: `${Math.round(c.students / 14)}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{c.students}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (students) — fully wired to the backend. Students now
// live in their own `students` table (separate from trainers/admins), so
// every single-record call includes ?role=student to tell the backend
// which table to use.
//   GET    /api/users?role=student              list
//   POST   /api/users                            create (role: 'student', name, email, password, courses[])
//   PUT    /api/users/:id?role=student           edit   (name, email, isActive, password?, courses[])
//   DELETE /api/users/:id?role=student           remove
// ════════════════════════════════════════════════════════════════════════════
function UserFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const { courseTitles: COURSE_TITLES, loadingCourseTitles } = useCourseTitles();
  const [name, setName]           = useState(initial?.name || '');
  const [email, setEmail]         = useState(initial?.email || '');
  const [password, setPassword]   = useState('');
  const [isActive, setIsActive]   = useState(initial?.is_active ?? true);
  const [selectedCourses, setSelectedCourses] = useState(initial?.courses || []);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const toggleCourse = (title) =>
    setSelectedCourses((prev) => prev.includes(title) ? prev.filter((c) => c !== title) : [...prev, title]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!isEdit && (!password || password.length < 6)) { setError('Password must be at least 6 characters.'); return; }
    if (isEdit && password && password.length < 6) { setError('New password must be at least 6 characters.'); return; }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      role: 'student',
      courses: selectedCourses,
    };
    if (!isEdit) payload.password = password;
    if (isEdit && password) payload.password = password;
    if (isEdit) payload.isActive = isActive;

    setSaving(true);
    try {
      const url = isEdit ? `${API}/users/${initial.id}?role=student` : `${API}/users`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save user');
      onSaved(json.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', zIndex: 200 }}>
      <div className="modal" style={{ width: 480, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: 24 }}>
        <div className="modal-title" style={{ textAlign: 'left' }}>{isEdit ? 'Edit Student' : 'Add Student'}</div>
        <div className="modal-sub" style={{ textAlign: 'left' }}>{isEdit ? 'Update this student\u2019s details. Leave password blank to keep it unchanged.' : 'This creates a real login the student can use right away.'}</div>

        {error && (
          <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anjali Sharma" />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">{isEdit ? 'New Password (optional)' : 'Password *'}</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 6 characters'} />
        </div>
        {isEdit && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Enrolled Courses</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', padding: 8 }}>
            {loadingCourseTitles && <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>Loading courses…</div>}
            {!loadingCourseTitles && COURSE_TITLES.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>No courses yet — add one in Course Management first.</div>
            )}
            {COURSE_TITLES.map((title) => (
              <label key={title} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedCourses.includes(title)} onChange={() => toggleCourse(title)} style={{ accentColor: 'var(--sa-teal)' }} />
                {title}
              </label>
            ))}
          </div>
        </div>

        <div className="modal-btns" style={{ marginTop: 16 }}>
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Student'}</button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [modalUser, setModalUser] = useState(undefined); // undefined = closed, null = add, object = edit

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/users?role=student`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load students');
      setUsers(json.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete student "${user.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/users/${user.id}?role=student`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to delete user');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSaved = (savedUser) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === savedUser.id);
      return exists ? prev.map((u) => (u.id === savedUser.id ? savedUser : u)) : [savedUser, ...prev];
    });
    setModalUser(undefined);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) => (name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">User Management</div>
        <div className="page-sub">Students you create here can log in immediately with the email and password you set</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="action-btn accent" onClick={() => setModalUser(null)}>+ Add User</button>
          <button className="action-btn" onClick={loadUsers}>↻ Refresh</button>
        </div>
      </div>

      <div className="search-bar">
        <span>🔍</span>
        <input
          placeholder="Search students by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>⏳ Loading students…</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>
            {users.length === 0 ? 'No students yet. Click "+ Add User" to create the first one.' : 'No students match your search.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Enrolled In</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar av-a" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(u.name)}</div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{u.email}</td>
                  <td style={{ fontSize: 11 }}>{(u.courses && u.courses.length > 0) ? u.courses.join(', ') : '—'}</td>
                  <td>
                    <span className={`status-pill status-${u.is_active ? 'active' : 'pending'}`}>{u.is_active ? 'active' : 'inactive'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setModalUser(u)}>✏️</button>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--sa-accent)' }} onClick={() => handleDeleteUser(u)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalUser !== undefined && (
        <UserFormModal initial={modalUser} onClose={() => setModalUser(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COURSE MANAGEMENT — fully wired to the backend. This is the single
// source of truth for course titles used everywhere else in the app
// (trainer's quiz form, trainer's live-class form, student enrollment
// picker) via GET /api/courses/titles.
//   GET    /api/courses             list (admin, includes live enrolled-student counts)
//   POST   /api/courses             create
//   PUT    /api/courses/:id         edit
//   DELETE /api/courses/:id         remove
// ════════════════════════════════════════════════════════════════════════════
const THUMB_OPTIONS = Object.keys(thumbEmoji);
const CATEGORY_OPTIONS = ['Web Dev', 'Data Science', 'Design', 'DevOps', 'Mobile', 'AI/ML', 'IT Support', 'General'];

function CourseFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [title, setTitle]             = useState(initial?.title || '');
  const [trainerName, setTrainerName] = useState(initial?.trainer_name || '');
  const [category, setCategory]       = useState(initial?.category || CATEGORY_OPTIONS[0]);
  const [price, setPrice]             = useState(initial?.price || '');
  const [thumb, setThumb]             = useState(initial?.thumb || THUMB_OPTIONS[0]);
  const [status, setStatus]           = useState(initial?.status || 'active');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Course title is required.'); return; }

    const payload = {
      title: title.trim(),
      trainerName: trainerName.trim(),
      category,
      price: price.trim() || '₹0',
      thumb,
      status,
    };

    setSaving(true);
    try {
      const url = isEdit ? `${API}/courses/${initial.id}` : `${API}/courses`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save course');
      onSaved(json.course);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', zIndex: 200 }}>
      <div className="modal" style={{ width: 460, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: 24 }}>
        <div className="modal-title" style={{ textAlign: 'left' }}>{isEdit ? 'Edit Course' : 'Add Course'}</div>
        <div className="modal-sub" style={{ textAlign: 'left' }}>{isEdit ? 'Changing the title updates it everywhere this course is referenced.' : 'This course immediately becomes available in every quiz/live-class course picker.'}</div>

        {error && (
          <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Course Title *</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Stack Web Development" />
        </div>
        <div className="form-group">
          <label className="form-label">Trainer Name</label>
          <input className="form-input" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="e.g. Pandeeswaran" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Category</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Icon</label>
            <select className="form-input" value={thumb} onChange={(e) => setThumb(e.target.value)}>
              {THUMB_OPTIONS.map((t) => <option key={t} value={t}>{thumbEmoji[t]} {t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Price</label>
            <input className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ₹12,999" />
          </div>
          {isEdit && (
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status</label>
              <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        <div className="modal-btns" style={{ marginTop: 16 }}>
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}</button>
        </div>
      </div>
    </div>
  );
}

export function CourseManagementPage() {
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [modalCourse, setModalCourse] = useState(undefined); // undefined = closed, null = add, object = edit

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/courses`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load courses');
      setCourseList(json.courses || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete "${course.title}"? Existing quizzes/classes that reference this course title won't be removed, but it will disappear from every course picker.`)) return;
    try {
      const res = await fetch(`${API}/courses/${course.id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to delete course');
      setCourseList((prev) => prev.filter((c) => c.id !== course.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSaved = (savedCourse) => {
    setCourseList((prev) => {
      const exists = prev.some((c) => c.id === savedCourse.id);
      return exists ? prev.map((c) => (c.id === savedCourse.id ? savedCourse : c)) : [savedCourse, ...prev];
    });
    setModalCourse(undefined);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Course Management</div>
        <div className="page-sub">Courses created here are immediately available in every quiz and live-class course picker, and in students' enrollment options</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="action-btn accent" onClick={() => setModalCourse(null)}>+ Add Course</button>
          <button className="action-btn" onClick={loadCourses}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Trainer</th>
              <th>Category</th>
              <th>Students</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>⏳ Loading courses…</td></tr>
            ) : courseList.length > 0 ? (
              courseList.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{thumbEmoji[c.thumb] || '📘'}</span>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.title}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{c.trainer_name || '—'}</td>
                  <td style={{ fontSize: 11 }}>{c.category}</td>
                  <td style={{ fontSize: 12 }}>{c.students}</td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>{c.price}</td>
                  <td>
                    <span className={`status-pill status-${c.status === 'active' ? 'active' : 'pending'}`}>{c.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setModalCourse(c)}>✏️</button>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--sa-accent)' }} onClick={() => handleDeleteCourse(c)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No courses yet. Click "+ Add Course" to create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalCourse !== undefined && (
        <CourseFormModal initial={modalCourse} onClose={() => setModalCourse(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TRAINER MANAGEMENT — fully wired to the backend. Trainers now live in
// their own `trainers` table (separate from students/admins), so every
// single-record call includes ?role=trainer to tell the backend which
// table to use.
//   GET    /api/users?role=trainer              list
//   POST   /api/users                            create (role: 'trainer', name, email, password, specialization)
//   PUT    /api/users/:id?role=trainer           edit   (name, email, isActive, specialization, password?)
//   DELETE /api/users/:id?role=trainer           remove
// ════════════════════════════════════════════════════════════════════════════
function TrainerFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [name, setName]                   = useState(initial?.name || '');
  const [email, setEmail]                 = useState(initial?.email || '');
  const [password, setPassword]           = useState('');
  const [specialization, setSpecialization] = useState(initial?.specialization || '');
  const [isActive, setIsActive]           = useState(initial?.is_active ?? true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState(null);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!isEdit && (!password || password.length < 6)) { setError('Password must be at least 6 characters.'); return; }
    if (isEdit && password && password.length < 6) { setError('New password must be at least 6 characters.'); return; }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      role: 'trainer',
      specialization: specialization.trim(),
    };
    if (!isEdit) payload.password = password;
    if (isEdit && password) payload.password = password;
    if (isEdit) payload.isActive = isActive;

    setSaving(true);
    try {
      const url = isEdit ? `${API}/users/${initial.id}?role=trainer` : `${API}/users`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save trainer');
      onSaved(json.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', zIndex: 200 }}>
      <div className="modal" style={{ width: 440, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: 24 }}>
        <div className="modal-title" style={{ textAlign: 'left' }}>{isEdit ? 'Edit Trainer' : 'Add Trainer'}</div>
        <div className="modal-sub" style={{ textAlign: 'left' }}>{isEdit ? 'Update this trainer\u2019s details. Leave password blank to keep it unchanged.' : 'This creates a real login the trainer can use right away.'}</div>

        {error && (
          <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pandeeswaran" />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trainer@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">{isEdit ? 'New Password (optional)' : 'Password *'}</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 6 characters'} />
        </div>
        <div className="form-group">
          <label className="form-label">Specialization</label>
          <input className="form-input" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. React, Node.js, UI/UX" />
        </div>
        {isEdit && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        <div className="modal-btns" style={{ marginTop: 16 }}>
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Trainer'}</button>
        </div>
      </div>
    </div>
  );
}

export function TrainerManagementPage() {
  const [trainerList, setTrainerList] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [modalTrainer, setModalTrainer] = useState(undefined); // undefined = closed, null = add, object = edit

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/users?role=trainer`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load trainers');
      setTrainerList(json.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrainers(); }, [loadTrainers]);

  const handleDeleteTrainer = async (trainer) => {
    if (!window.confirm(`Delete trainer "${trainer.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/users/${trainer.id}?role=trainer`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to delete trainer');
      setTrainerList((prev) => prev.filter((t) => t.id !== trainer.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSaved = (savedTrainer) => {
    setTrainerList((prev) => {
      const exists = prev.some((t) => t.id === savedTrainer.id);
      return exists ? prev.map((t) => (t.id === savedTrainer.id ? savedTrainer : t)) : [savedTrainer, ...prev];
    });
    setModalTrainer(undefined);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Trainer Management</div>
        <div className="page-sub">Trainers you create here can log in immediately with the email and password you set</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="action-btn accent" onClick={() => setModalTrainer(null)}>+ Add Trainer</button>
          <button className="action-btn" onClick={loadTrainers}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>⏳ Loading trainers…</td></tr>
            ) : trainerList.length > 0 ? (
              trainerList.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{t.email}</td>
                  <td>{t.specialization || '—'}</td>
                  <td>
                    <span className={`status-pill status-${t.is_active ? 'active' : 'pending'}`}>{t.is_active ? 'active' : 'inactive'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setModalTrainer(t)}>✏️</button>
                      <button className="action-btn" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--sa-accent)' }} onClick={() => handleDeleteTrainer(t)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  No trainers yet. Click "+ Add Trainer" to create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalTrainer !== undefined && (
        <TrainerFormModal initial={modalTrainer} onClose={() => setModalTrainer(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const bars2 = [30, 55, 70, 45, 88, 62, 74, 50, 92, 78, 65, 95];
  const categories = [
    { label: 'Web Dev', pct: 34, color: 'var(--sa-teal)' },
    { label: 'Data Science', pct: 24, color: 'var(--sa-accent)' },
    { label: 'Design', pct: 18, color: 'var(--sa-gold)' },
    { label: 'DevOps', pct: 14, color: '#185fa5' },
    { label: 'AI/ML', pct: 10, color: '#993c1d' },
  ];
  const activity = [
    { icon: '👤', text: 'Divya Menon enrolled in React Native', time: '5m ago', color: 'var(--sa-teal)' },
    { icon: '🏆', text: 'Kiran Kumar earned a certificate', time: '12m ago', color: 'var(--sa-gold)' },
    { icon: '❓', text: 'Quiz "CSS Flexbox" completed by 34 students', time: '1h ago', color: 'var(--sa-accent)' },
    { icon: '⬆️', text: 'New lesson uploaded: State Management', time: '2h ago', color: '#185fa5' },
  ];

  return (
    <div>
      <div className="page-header"><div className="page-title">Analytics & Reports</div></div>

      <div className="grid-4">
        {[
          ['Completion Rate', '68%', '↑ 5% vs last month', 'metric-up'],
          ['Avg Quiz Score', '74%', '', ''],
          ['Active This Week', '4,820', '', ''],
          ['Dropout Rate', '12%', '↓ 2% improvement', 'metric-down'],
        ].map(([label, value, sub, cls]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
            {sub && <div className={`metric-sub ${cls}`}>{sub}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Monthly active students</div>
        <div className="mini-chart" style={{ height: 90 }}>
          {bars2.map((b, i) => (
            <div key={i} className="bar" style={{ height: `${b}%`, background: 'var(--sa-teal)', opacity: 0.5 + i * 0.04 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--sa-muted)', marginTop: 4 }}>
          <span>Feb 25</span><span>May 25</span><span>Aug 25</span><span>Jan 26</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Category breakdown</div>
          {categories.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--sa-text)' }}>{r.label}</div>
              <div className="progress-bar" style={{ width: 100 }}>
                <div className="progress-fill" style={{ width: `${r.pct * 2.9}%`, background: r.color }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--sa-muted)', width: 28, textAlign: 'right' }}>{r.pct}%</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Recent activity</div>
          {activity.map((a, i) => (
            <div key={i} className="notif-item">
              <span style={{ fontSize: 15, color: a.color, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
              <div className="notif-body"><div className="notif-title">{a.text}</div></div>
              <div className="notif-time">{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState({
    adminName: "Admin User",
    email: "admin@example.com",
    platformName: "Learning Management System",
    maintenanceMode: false,
    emailNotifications: true,
    pushNotifications: false,
    twoFactorAuth: true,
    smsVerification: true,
  });

  const [profilePic, setProfilePic] = useState(
    "https://via.placeholder.com/120"
  );

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("adminSettings");

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);

      setSettings(parsed.settings);
      setProfilePic(parsed.profilePic);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  };

  const handlePasswordInput = (e) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordReset = () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      alert("Please fill all password fields");
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      alert("Passwords do not match");
      return;
    }

    alert("Password changed successfully");

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleForgotPassword = () => {
    alert(
      `Password reset link sent to ${settings.email}`
    );
  };

  const handleLogoutAllDevices = () => {
    const confirmLogout = window.confirm(
      "Logout from all devices?"
    );

    if (confirmLogout) {
      alert("Logged out from all devices");
    }
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "This action cannot be undone. Delete account permanently?"
    );

    if (confirmDelete) {
      localStorage.removeItem("adminSettings");

      alert("Account deleted successfully");
    }
  };

  const handleSave = () => {
    localStorage.setItem(
      "adminSettings",
      JSON.stringify({
        settings,
        profilePic,
      })
    );

    alert("Settings saved successfully!");
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    marginTop: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          marginBottom: "24px",
          color: "#111827",
        }}
      >
        Admin Settings
      </h1>

      {/* Profile Picture */}
      <div style={cardStyle}>
        <h2>Profile Picture</h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginTop: "15px",
          }}
        >
          <img
            src={profilePic}
            alt="Profile"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #e5e7eb",
            }}
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePicChange}
          />
        </div>
      </div>

      {/* Profile Settings */}
      <div style={cardStyle}>
        <h2>Profile Settings</h2>

        <div style={{ marginBottom: "15px" }}>
          <label>Admin Name</label>

          <input
            type="text"
            name="adminName"
            value={settings.adminName}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label>Email Address</label>

          <input
            type="email"
            name="email"
            value={settings.email}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Platform Settings */}
      <div style={cardStyle}>
        <h2>Platform Settings</h2>

        <div style={{ marginBottom: "15px" }}>
          <label>Platform Name</label>

          <input
            type="text"
            name="platformName"
            value={settings.platformName}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <label>
          <input
            type="checkbox"
            name="maintenanceMode"
            checked={settings.maintenanceMode}
            onChange={handleChange}
          />{" "}
          Maintenance Mode
        </label>
      </div>

      {/* Notification Settings */}
      <div style={cardStyle}>
        <h2>Notification Settings</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <label>
            <input
              type="checkbox"
              name="emailNotifications"
              checked={settings.emailNotifications}
              onChange={handleChange}
            />{" "}
            Email Notifications
          </label>

          <label>
            <input
              type="checkbox"
              name="pushNotifications"
              checked={settings.pushNotifications}
              onChange={handleChange}
            />{" "}
            Push Notifications
          </label>
        </div>
      </div>

      {/* Security Settings */}
      <div style={cardStyle}>
        <h2>Security Settings</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <label>
            <input
              type="checkbox"
              name="twoFactorAuth"
              checked={settings.twoFactorAuth}
              onChange={handleChange}
            />{" "}
            Email Two-Factor Authentication
          </label>

          <label>
            <input
              type="checkbox"
              name="smsVerification"
              checked={settings.smsVerification}
              onChange={handleChange}
            />{" "}
            SMS Verification
          </label>
        </div>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <h2>Change Password</h2>

        <input
          type="password"
          name="currentPassword"
          placeholder="Current Password"
          value={passwordData.currentPassword}
          onChange={handlePasswordInput}
          style={inputStyle}
        />

        <input
          type="password"
          name="newPassword"
          placeholder="New Password"
          value={passwordData.newPassword}
          onChange={handlePasswordInput}
          style={inputStyle}
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={passwordData.confirmPassword}
          onChange={handlePasswordInput}
          style={inputStyle}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "15px",
          }}
        >
          <button
          className="action-btn accent"
           onClick={handlePasswordReset}>
            Change Password
          </button>

          <button className="action-btn"
           onClick={handleForgotPassword}>
            Forgot Password
          </button>
        </div>
      </div>

      {/* Session Management */}
      <div style={cardStyle}>
        <h2>Session Management</h2>

        <button className="action-btn accent" onClick={handleLogoutAllDevices}>
          Logout From All Devices
        </button>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          ...cardStyle,
          border: "1px solid #ef4444",
        }}
      >
        <h2 style={{ color: "#dc2626" }}>
          Danger Zone
        </h2>

        <p>
          Permanently delete your account and all
          saved settings.
        </p>

        <button
          onClick={handleDeleteAccount}
          className="action-btn accent"
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Delete Account
        </button>
      </div>

      {/* Save Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={handleSave}
          className="action-btn accent"
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}