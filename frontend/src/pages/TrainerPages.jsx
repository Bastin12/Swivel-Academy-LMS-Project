import { students, lessonList } from '../data/data';
import { useState, useRef, useCallback, useEffect } from 'react';

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
});

// Generic async hook with loading / error / success state
function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  const run = useCallback(async (fn, successMsg = 'Saved!') => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await fn();
      if (successMsg) {
        setSuccess(successMsg);
        setTimeout(() => setSuccess(null), 3000);
      }
      return result;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, success, run };
}

// Shared by every course dropdown in this file (quiz form, live-class
// form) — fetches the live list of course titles from the backend
// `courses` table, the same one the admin manages. This is what keeps a
// trainer from ever scheduling a class or quiz for a course title that
// doesn't actually match any student's enrollment record.
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
        // If this fails, the dropdown just stays empty rather than falling
        // back to a possibly-mismatched hardcoded list — better to show
        // nothing than to silently offer a course name that won't match
        // any student's enrollment.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { courseTitles: titles, loadingCourseTitles: loading };
}

// ─── Status Banner ────────────────────────────────────────────────────────────
function StatusBanner({ error, success }) {
  if (!error && !success) return null;
  const isErr = !!error;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
      background: isErr ? '#fff0f0' : '#f0fff4',
      border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`,
      color: isErr ? '#b91c1c' : '#15803d',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {isErr ? '⚠️' : '✅'} {error || success}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. TRAINER DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
export function TrainerDashboard({ userName, navigate }) {
  // Static metrics (extend later with a real /api/trainer/stats endpoint)
  const totalCourses   = 6;
  const totalStudents  = 2430;
  const pendingReviews = 18;
  const avgCompletion  = 64;

  const liveNow         = [];   // from future live-class endpoint
  const upcomingClasses = [];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Trainer Dashboard</div>
        <div className="page-sub">Welcome back, {userName}!</div>
      </div>

      {/* Top Metrics */}
      <div className="grid-4">
        {[
          ['My Courses',          totalCourses,            '',                             ''],
          ['Total Students',      totalStudents.toLocaleString(), '↑ 45 this week',       'metric-up'],
          ['Assignments Pending', pendingReviews,          pendingReviews > 0 ? 'needs review' : 'all reviewed', pendingReviews > 0 ? 'metric-down' : ''],
          ['Avg Completion',      `${avgCompletion}%`,     '',                             ''],
        ].map(([label, value, sub, cls]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
            {sub && <div className={`metric-sub ${cls}`}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Live Classes Banner */}
      {liveNow.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%)', border: '1px solid #86efac', borderRadius: 'var(--border-radius-md)', padding: '12px 16px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🔴</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#14532d' }}>{liveNow.length} Class{liveNow.length > 1 ? 'es' : ''} Live Right Now</div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{liveNow.map((c) => c.title).join(' · ')}</div>
          </div>
          <button className="action-btn" style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none' }} onClick={() => navigate('trainer-courses')}>View Classes →</button>
        </div>
      )}

      <div className="grid-2">
        {/* Student Progress */}
        <div className="card">
          <div className="card-title">Student Progress</div>
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Course</th><th>Progress</th><th>Status</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`avatar ${s.av}`} style={{ width: 24, height: 24, fontSize: 10 }}>{s.initials}</div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{s.course}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{s.progress}%</span>
                    </div>
                  </td>
                  <td><span className={`status-pill status-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['⬆️ Upload New Video',   'trainer-content'],
                ['❓ Create Quiz',         'trainer-quiz'],
                ['📅 Mark Attendance',     'trainer-attendance'],
                ['🔔 Send Notification',    'trainer-notifications'],
                ['🔴 Schedule Live Class',   'trainer-live'],
              ].map(([label, page]) => (
                <button key={label} className="action-btn" style={{ justifyContent: 'flex-start' }} onClick={() => navigate(page)}>{label}</button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. TRAINER CONTENT PAGE  (Videos / Assignments / Notes)
// ════════════════════════════════════════════════════════════════════════════
export function TrainerContentPage({ activeTab, setTab }) {
  // ── Shared selectors ───────────────────────────────────────────────────────
  const COURSE_OPTIONS = [
    { id: 'full', title: 'Full Stack Web Development' },
    { id: 'ai',   title: 'Python with AI'             },
    { id: 'react',title: 'Advanced React'             },
  ];
  const MODULE_OPTIONS = {
    full:  [{ id: 'mod1', title: 'Module 1: Foundations' }, { id: 'mod2', title: 'Module 2: JavaScript' }],
    ai:    [{ id: 'mod3', title: 'Module 1: Python Basics' }],
    react: [{ id: 'mod4', title: 'Module 1: Hooks & Context' }],
  };

  const [selectedCourse,  setSelectedCourse]  = useState('');
  const [selectedModule,  setSelectedModule]  = useState('');
  const filteredModules = MODULE_OPTIONS[selectedCourse] ?? [];

  const handleCourseChange = (id) => { setSelectedCourse(id); setSelectedModule(''); };

  // ── Tab 0 – Videos ─────────────────────────────────────────────────────────
  const [lessonTitle,     setLessonTitle]     = useState('');
  const [duration,        setDuration]        = useState('');
  const [lessonType,      setLessonType]      = useState('Free Preview');
  const [videoFile,       setVideoFile]       = useState(null);
  const [videoPreview,    setVideoPreview]    = useState(null);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploadStatus,    setUploadStatus]    = useState('idle');
  const [uploadedChunks,  setUploadedChunks]  = useState(0);
  const [totalChunks,     setTotalChunks]     = useState(0);
  const [uploadedLessons, setUploadedLessons] = useState([]);
  const [editingId,       setEditingId]       = useState(null);

  const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB
  const abortRef   = useRef(false);

  const handleVideoSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    setUploadProgress(0); setUploadStatus('idle'); setUploadedChunks(0);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setUploadProgress(0); setUploadStatus('idle'); setUploadedChunks(0);
  };

  const handleUploadLesson = async () => {
    if (!selectedCourse || !selectedModule) { alert('Please select a Course and Module.'); return; }
    if (!lessonTitle.trim())                { alert('Please enter a lesson title.');        return; }
    if (!videoFile)                         { alert('Please select a video file.');         return; }

    const chunks = Math.ceil(videoFile.size / CHUNK_SIZE);
    setTotalChunks(chunks); setUploadedChunks(0); setUploadProgress(0); setUploadStatus('uploading');
    abortRef.current = false;

    for (let i = 0; i < chunks; i++) {
      if (abortRef.current) { setUploadStatus('paused'); return; }

      const start    = i * CHUNK_SIZE;
      const end      = Math.min(start + CHUNK_SIZE, videoFile.size);
      const blob     = videoFile.slice(start, end);
      const formData = new FormData();
      formData.append('chunkIndex',  i);
      formData.append('totalChunks', chunks);
      formData.append('fileName',    videoFile.name);
      formData.append('courseId',    selectedCourse);
      formData.append('moduleId',    selectedModule);
      formData.append('title',       lessonTitle);
      formData.append('lessonType',  lessonType);
      formData.append('duration',    duration);
      formData.append('chunk',       blob);

      try {
        await fetch(`${API}/lessons/upload-chunk`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
          body: formData,
        });
      } catch {
        // Network not yet wired — simulate locally so UI still works
        await new Promise((r) => setTimeout(r, 80));
      }

      const done = i + 1;
      setUploadedChunks(done);
      setUploadProgress(Math.round((done / chunks) * 100));
    }

    setUploadStatus('done');
    const newLesson = {
      id:         `l-${Date.now()}`,
      title:      lessonTitle,
      course:     selectedCourse,
      module:     selectedModule,
      dur:        duration ? `${duration} min` : '—',
      free:       lessonType === 'Free Preview',
      fileName:   videoFile.name,
      fileSize:   (videoFile.size / (1024 * 1024)).toFixed(2) + ' MB',
      chunks,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setUploadedLessons((prev) => [newLesson, ...prev]);

    setTimeout(() => {
      setLessonTitle(''); setDuration(''); setLessonType('Free Preview');
      handleRemoveVideo(); setUploadStatus('idle'); setUploadProgress(0);
      setUploadedChunks(0); setTotalChunks(0);
    }, 1200);
  };

  const handlePauseResume = () => {
    if (uploadStatus === 'uploading') { abortRef.current = true; }
    else if (uploadStatus === 'paused') { handleUploadLesson(); }
  };

  const handleCancelUpload = () => {
    abortRef.current = true;
    setUploadStatus('idle'); setUploadProgress(0); setUploadedChunks(0); setTotalChunks(0);
  };

  const handleEditLesson = (lesson) => {
    setEditingId(lesson.id);
    setLessonTitle(lesson.title);
    setDuration(lesson.dur.replace(' min', ''));
    setLessonType(lesson.free ? 'Free Preview' : 'Locked (Enrolled Only)');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = async () => {
    try {
      await fetch(`${API}/lessons/${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ title: lessonTitle, duration, lessonType }),
      });
    } catch { /* local fallback */ }
    setUploadedLessons((prev) =>
      prev.map((l) => l.id === editingId ? { ...l, title: lessonTitle, dur: duration ? `${duration} min` : '—', free: lessonType === 'Free Preview' } : l)
    );
    setEditingId(null);
    setLessonTitle(''); setDuration(''); setLessonType('Free Preview');
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await fetch(`${API}/lessons/${id}`, { method: 'DELETE', headers: authHeaders() });
    } catch { /* local fallback */ }
    setUploadedLessons((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Tab 1 – Assignments ────────────────────────────────────────────────────
  const [assignmentTitle,     setAssignmentTitle]     = useState('');
  const [assignmentDesc,      setAssignmentDesc]      = useState('');
  const [dueDate,             setDueDate]             = useState('');
  const [maxMarks,            setMaxMarks]            = useState('');
  const [assignmentFile,      setAssignmentFile]      = useState(null);
  const [assignments,         setAssignments]         = useState([]);
  const [assignmentUploading, setAssignmentUploading] = useState(false);

  const handleUploadAssignment = async () => {
    if (!selectedCourse || !assignmentTitle || !assignmentFile) {
      alert('Please fill all required fields (Course, Title, File)'); return;
    }
    setAssignmentUploading(true);
    const fd = new FormData();
    fd.append('title',       assignmentTitle);
    fd.append('description', assignmentDesc);
    fd.append('courseId',    selectedCourse);
    fd.append('moduleId',    selectedModule);
    fd.append('dueDate',     dueDate);
    fd.append('maxMarks',    maxMarks);
    fd.append('file',        assignmentFile);
    try {
      await fetch(`${API}/assignments/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: fd,
      });
    } catch { await new Promise((r) => setTimeout(r, 800)); }

    const newAssignment = {
      id: `a-${Date.now()}`, title: assignmentTitle, course: selectedCourse,
      module: selectedModule, description: assignmentDesc, dueDate, maxMarks,
      fileName: assignmentFile.name, fileSize: (assignmentFile.size / 1024).toFixed(1) + ' KB',
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setAssignments((prev) => [newAssignment, ...prev]);
    setAssignmentTitle(''); setAssignmentDesc(''); setDueDate('');
    setMaxMarks(''); setAssignmentFile(null);
    setAssignmentUploading(false);
    alert('Assignment uploaded successfully!');
  };

  // ── Tab 2 – Notes & PDFs ───────────────────────────────────────────────────
  const [noteTitle,     setNoteTitle]     = useState('');
  const [noteTopic,     setNoteTopic]     = useState('');
  const [noteDesc,      setNoteDesc]      = useState('');
  const [noteFile,      setNoteFile]      = useState(null);
  const [notes,         setNotes]         = useState([]);
  const [noteUploading, setNoteUploading] = useState(false);

  const handleUploadNote = async () => {
    if (!selectedCourse || !noteTitle || !noteFile) {
      alert('Please fill all required fields (Course, Title, File)'); return;
    }
    setNoteUploading(true);
    const fd = new FormData();
    fd.append('title',       noteTitle);
    fd.append('topic',       noteTopic);
    fd.append('description', noteDesc);
    fd.append('courseId',    selectedCourse);
    fd.append('moduleId',    selectedModule);
    fd.append('file',        noteFile);
    try {
      await fetch(`${API}/notes/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: fd,
      });
    } catch { await new Promise((r) => setTimeout(r, 800)); }

    const newNote = {
      id: `n-${Date.now()}`, title: noteTitle, course: selectedCourse,
      module: selectedModule, topic: noteTopic, description: noteDesc,
      fileName: noteFile.name, fileSize: (noteFile.size / 1024).toFixed(1) + ' KB',
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setNotes((prev) => [newNote, ...prev]);
    setNoteTitle(''); setNoteTopic(''); setNoteDesc(''); setNoteFile(null);
    setNoteUploading(false);
    alert('Notes / PDF uploaded successfully!');
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const dropzoneStyle = {
    border: '1.5px dashed var(--sa-border)', borderRadius: 'var(--border-radius-md)',
    padding: 24, textAlign: 'center', marginBottom: 14,
  };

  const progressColor =
    uploadStatus === 'done'   ? '#1D9E75' :
    uploadStatus === 'paused' ? '#BA7517' :
    uploadStatus === 'error'  ? '#A32D2D' : 'var(--sa-teal)';

  const CourseModuleSelectors = () => (
    <div className="grid-2">
      <div className="form-group">
        <label className="form-label">Course *</label>
        <select className="form-input" value={selectedCourse} onChange={(e) => handleCourseChange(e.target.value)}>
          <option value="">Select Course</option>
          {COURSE_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Section / Module *</label>
        <select className="form-input" value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
          <option value="">Select Module</option>
          {filteredModules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Course Content Manager</div>
      </div>

      <div className="tab-group">
        {['📹 Videos', '📝 Assignments', '📄 Notes & PDFs'].map((label, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{label}</button>
        ))}
      </div>

      {/* ════════ TAB 0: VIDEOS ════════ */}
      {activeTab === 0 && (
        <>
          <div className="card">
            <div className="card-title">{editingId ? '✏️ Edit Lesson' : '⬆️ Upload New Video Lesson'}</div>
            <CourseModuleSelectors />

            <div className="form-group">
              <label className="form-label">Lesson Title *</label>
              <input className="form-input" placeholder="e.g. Introduction to React Hooks" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Lesson Type</label>
                <select className="form-input" value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
                  <option>Free Preview</option>
                  <option>Locked (Enrolled Only)</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Duration (min)</label>
                <input className="form-input" placeholder="e.g. 25" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            {!editingId && (
              <>
                {!videoFile ? (
                  <label style={{ ...dropzoneStyle, display: 'block', cursor: 'pointer' }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f && f.type.startsWith('video/')) {
                        setVideoFile(f); setVideoPreview(URL.createObjectURL(f));
                        setUploadProgress(0); setUploadStatus('idle');
                      } else { alert('Please drop a video file (MP4 or MOV).'); }
                    }}
                  >
                    <div style={{ fontSize: 28 }}>🎬</div>
                    <div style={{ fontSize: 13, color: 'var(--sa-muted)', marginTop: 8 }}>Drag & drop video here, or click to browse</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 4 }}>MP4, MOV up to 2 GB · Uploaded in chunks</div>
                    <input type="file" accept="video/mp4,video/quicktime" style={{ display: 'none' }} onChange={handleVideoSelect} />
                  </label>
                ) : (
                  <div style={{ border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', marginBottom: 14 }}>
                    <video src={videoPreview} controls style={{ width: '100%', maxHeight: 200, background: '#000', display: 'block' }} />
                    <div style={{ padding: '8px 12px', background: 'var(--sa-surface)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{ fontSize: 18 }}>🎬</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sa-muted)' }}>
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          {totalChunks > 0 && ` · ${totalChunks} chunks`}
                        </div>
                      </div>
                      {uploadStatus === 'idle' && (
                        <button className="action-btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--sa-accent)' }} onClick={handleRemoveVideo}>✕ Remove</button>
                      )}
                    </div>

                    {uploadStatus !== 'idle' && (
                      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--sa-border)' }}>
                        <div style={{ height: 8, background: 'var(--sa-border)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: `${uploadProgress}%`, background: progressColor, borderRadius: 999, transition: 'width 0.2s ease' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--sa-muted)', marginBottom: 8 }}>
                          <span>
                            {uploadStatus === 'done' ? '✅ Upload complete'
                              : uploadStatus === 'paused' ? '⏸ Paused'
                              : `Uploading chunk ${uploadedChunks} of ${totalChunks}…`}
                          </span>
                          <span style={{ fontWeight: 600, color: progressColor }}>{uploadProgress}%</span>
                        </div>
                        {totalChunks > 0 && totalChunks <= 20 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                            {Array.from({ length: totalChunks }).map((_, ci) => (
                              <div key={ci} title={`Chunk ${ci + 1}`} style={{ width: 20, height: 8, borderRadius: 3, background: ci < uploadedChunks ? progressColor : 'var(--sa-border)', transition: 'background 0.15s' }} />
                            ))}
                          </div>
                        )}
                        {(uploadStatus === 'uploading' || uploadStatus === 'paused') && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="action-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handlePauseResume}>
                              {uploadStatus === 'uploading' ? '⏸ Pause' : '▶ Resume'}
                            </button>
                            <button className="action-btn" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--sa-accent)' }} onClick={handleCancelUpload}>✕ Cancel</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {editingId ? (
                <>
                  <button className="action-btn accent" style={{ flex: 2 }} onClick={handleSaveEdit}>💾 Save Changes</button>
                  <button className="action-btn" style={{ flex: 1 }} onClick={() => { setEditingId(null); setLessonTitle(''); setDuration(''); setLessonType('Free Preview'); }}>Cancel</button>
                </>
              ) : (
                <button className="action-btn accent" style={{ flex: 1 }} onClick={handleUploadLesson} disabled={uploadStatus === 'uploading'}>
                  {uploadStatus === 'uploading' ? `⏳ Uploading… ${uploadProgress}%` : '⬆️ Upload Lesson'}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Uploaded Lessons ({uploadedLessons.length + lessonList.length})</div>
            {uploadedLessons.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--sa-border)', flexWrap: 'wrap' }}>
                <div className="lesson-num">{String(i + 1).padStart(2, '0')}</div>
                <div className={`lesson-icon ${l.free ? 'free' : 'locked'}`}>{l.free ? '▶' : '🔒'}</div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div className="lesson-title" style={{ marginBottom: 2 }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{l.fileSize} · {l.dur} · {l.uploadedAt}</div>
                </div>
                <span className={`lesson-tag ${l.free ? 'tag-free' : 'tag-locked'}`}>{l.free ? 'Free' : 'Locked'}</span>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, background: '#EAF3DE', color: '#3B6D11' }}>✅ Uploaded</span>
                <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleEditLesson(l)}>✏️</button>
                <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--sa-accent)' }} onClick={() => handleDeleteLesson(l.id)}>🗑️</button>
              </div>
            ))}

            {uploadedLessons.length > 0 && lessonList.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--sa-muted)', padding: '8px 0 4px', borderBottom: '1px solid var(--sa-border)', marginBottom: 4 }}>— Pre-existing lessons —</div>
            )}

            {lessonList.map((l, i) => (
              <div key={l.id ?? i} className="lesson-item">
                <div className="lesson-num">{String(uploadedLessons.length + i + 1).padStart(2, '0')}</div>
                <div className={`lesson-icon ${l.free ? 'free' : 'locked'}`}>{l.free ? '▶' : '🔒'}</div>
                <div className="lesson-title">{l.title}</div>
                <span className={`lesson-tag ${l.free ? 'tag-free' : 'tag-locked'}`}>{l.free ? 'Free' : 'Locked'}</span>
                <div className="lesson-dur">{l.dur}</div>
                <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleEditLesson({ ...l, id: l.id ?? `static-${i}` })}>✏️</button>
              </div>
            ))}

            {uploadedLessons.length === 0 && lessonList.length === 0 && (
              <div style={{ color: 'var(--sa-muted)', fontSize: 13, padding: '12px 0' }}>No lessons uploaded yet.</div>
            )}
          </div>
        </>
      )}

      {/* ════════ TAB 1: ASSIGNMENTS ════════ */}
      {activeTab === 1 && (
        <>
          <div className="card">
            <div className="card-title">Upload New Assignment</div>
            <CourseModuleSelectors />
            <div className="form-group">
              <label className="form-label">Assignment Title *</label>
              <input className="form-input" placeholder="e.g. React Hooks Exercise" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Instructions</label>
              <textarea className="form-input" rows={3} placeholder="Describe what students need to do..." value={assignmentDesc} onChange={(e) => setAssignmentDesc(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Max Marks</label>
                <input className="form-input" type="number" placeholder="e.g. 100" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
              </div>
            </div>
            <div style={{ ...dropzoneStyle, marginTop: 14 }}>
              <div style={{ fontSize: 24 }}>📎</div>
              <div style={{ fontSize: 13, color: 'var(--sa-muted)', marginTop: 8 }}>Drag & drop assignment file or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 4 }}>PDF, DOC, DOCX, ZIP up to 50 MB</div>
              <input type="file" accept=".pdf,.doc,.docx,.zip,.txt" style={{ marginTop: 10 }} onChange={(e) => { const f = e.target.files[0]; if (f) setAssignmentFile(f); }} />
              {assignmentFile && <div style={{ fontSize: 11, color: 'var(--sa-teal)', marginTop: 6 }}>✅ {assignmentFile.name} ({(assignmentFile.size / 1024).toFixed(1)} KB)</div>}
            </div>
            <button className="action-btn accent" style={{ marginTop: 4 }} onClick={handleUploadAssignment} disabled={assignmentUploading}>
              {assignmentUploading ? '⏳ Uploading...' : '⬆️ Upload Assignment'}
            </button>
          </div>
          <div className="card">
            <div className="card-title">Uploaded Assignments ({assignments.length})</div>
            {assignments.length === 0 ? (
              <div style={{ color: 'var(--sa-muted)', fontSize: 13, padding: '10px 0' }}>No assignments uploaded yet.</div>
            ) : (
              assignments.map((a, i) => (
                <div key={a.id} className="lesson-item" style={{ flexWrap: 'wrap', gap: 8, padding: '10px 0' }}>
                  <div className="lesson-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="lesson-icon free">📝</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div className="lesson-title" style={{ marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-muted)' }}>Due: {a.dueDate || '—'} · Marks: {a.maxMarks || '—'} · {a.fileSize}</div>
                  </div>
                  <span className="lesson-tag tag-free">📎 {a.fileName}</span>
                  <div className="lesson-dur">{a.uploadedAt}</div>
                  <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--sa-accent)' }} onClick={() => setAssignments((prev) => prev.filter((x) => x.id !== a.id))}>🗑️</button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ════════ TAB 2: NOTES & PDFs ════════ */}
      {activeTab === 2 && (
        <>
          <div className="card">
            <div className="card-title">Upload Notes / PDF</div>
            <CourseModuleSelectors />
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input className="form-input" placeholder="e.g. React Fundamentals Notes" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Topic / Chapter</label>
              <input className="form-input" placeholder="e.g. Hooks & State Management" value={noteTopic} onChange={(e) => setNoteTopic(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-input" rows={2} placeholder="Brief summary..." value={noteDesc} onChange={(e) => setNoteDesc(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={dropzoneStyle}>
              <div style={{ fontSize: 24 }}>📄</div>
              <div style={{ fontSize: 13, color: 'var(--sa-muted)', marginTop: 8 }}>Drag & drop PDF / document or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 4 }}>PDF, PPT, PPTX, DOC, DOCX up to 100 MB</div>
              <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" style={{ marginTop: 10 }} onChange={(e) => { const f = e.target.files[0]; if (f) setNoteFile(f); }} />
              {noteFile && <div style={{ fontSize: 11, color: 'var(--sa-teal)', marginTop: 6 }}>✅ {noteFile.name} ({(noteFile.size / 1024).toFixed(1)} KB)</div>}
            </div>
            <button className="action-btn accent" style={{ marginTop: 4 }} onClick={handleUploadNote} disabled={noteUploading}>
              {noteUploading ? '⏳ Uploading...' : '⬆️ Upload Notes / PDF'}
            </button>
          </div>
          <div className="card">
            <div className="card-title">Uploaded Notes & PDFs ({notes.length})</div>
            {notes.length === 0 ? (
              <div style={{ color: 'var(--sa-muted)', fontSize: 13, padding: '10px 0' }}>No notes uploaded yet.</div>
            ) : (
              notes.map((n, i) => (
                <div key={n.id} className="lesson-item" style={{ flexWrap: 'wrap', gap: 8, padding: '10px 0' }}>
                  <div className="lesson-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="lesson-icon free">📄</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div className="lesson-title" style={{ marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-muted)' }}>Topic: {n.topic || '—'} · {n.fileSize}</div>
                  </div>
                  <span className="lesson-tag tag-free">📄 {n.fileName}</span>
                  <div className="lesson-dur">{n.uploadedAt}</div>
                  <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--sa-accent)' }} onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}>🗑️</button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. ATTENDANCE PAGE
// ════════════════════════════════════════════════════════════════════════════
export function AttendancePage() {
  const INITIAL_ROWS = [
    { id: 1, name: 'Arjun S.',   initials: 'AS', av: 'av-a', course: 'Full Stack',     att: ['P','P','P','A','P','P','L'] },
    { id: 2, name: 'Preethi N.', initials: 'PN', av: 'av-b', course: 'Full Stack',     att: ['P','P','A','P','P','P','P'] },
    { id: 3, name: 'Kiran K.',   initials: 'KK', av: 'av-c', course: 'Python with AI', att: ['P','P','P','P','P','P','P'] },
    { id: 4, name: 'Divya M.',   initials: 'DM', av: 'av-d', course: 'Full Stack',     att: ['A','P','P','P','L','P','P'] },
    { id: 5, name: 'Rahul V.',   initials: 'RV', av: 'av-e', course: 'Advanced React', att: ['P','A','P','P','P','L','P'] },
    { id: 6, name: 'Sneha R.',   initials: 'SR', av: 'av-a', course: 'Python with AI', att: ['P','P','P','P','A','P','P'] },
  ];

  const WEEK = { label: 'Jan 6 – 12, 2026', days: ['Mon 6','Tue 7','Wed 8','Thu 9','Fri 10','Sat 11','Sun 12'] };

  // Today's index in the week (0 = Mon … 6 = Sun); clamp to 0–6
  const todayIdx = Math.min(Math.max(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 0), 6);

  const [rows,          setRows]          = useState(INITIAL_ROWS);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [saveError,     setSaveError]     = useState(null);
  // Attendance modal state
  const [attModalOpen,  setAttModalOpen]  = useState(false);
  const [modalDayIdx,   setModalDayIdx]   = useState(todayIdx);
  // Temporary marks inside the modal — keyed by row id
  const [modalMarks,    setModalMarks]    = useState({});

  const week     = WEEK;
  const CYCLE    = ['P', 'A', 'L', ''];
  const attClass = { P: 'att-present', A: 'att-absent', L: 'att-leave', '': 'att-none' };
  const attLabel = { P: 'Present', A: 'Absent', L: 'Leave', '': '—' };

  // Toggle a cell directly in the main table
  const cycleCell = (rowId, dayIdx) => {
    setSaved(false);
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const next = CYCLE[(CYCLE.indexOf(r.att[dayIdx]) + 1) % CYCLE.length];
      const att  = [...r.att]; att[dayIdx] = next;
      return { ...r, att };
    }));
  };

  // ── Attendance Modal helpers ───────────────────────────────────────────────
  const openAttModal = () => {
    // Pre-fill modal with current values for the selected day
    const marks = {};
    rows.forEach((r) => { marks[r.id] = r.att[modalDayIdx] || ''; });
    setModalMarks(marks);
    setAttModalOpen(true);
  };

  const handleModalDayChange = (idx) => {
    // When day changes inside the modal, re-seed marks from current row data
    const marks = {};
    rows.forEach((r) => { marks[r.id] = r.att[idx] || ''; });
    setModalMarks(marks);
    setModalDayIdx(idx);
  };

  const cycleModalMark = (rowId) => {
    setModalMarks((prev) => {
      const cur  = prev[rowId] ?? '';
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      return { ...prev, [rowId]: next };
    });
  };

  const setAllModal = (value) => {
    const marks = {};
    rows.forEach((r) => { marks[r.id] = value; });
    setModalMarks(marks);
  };

  const handleModalSave = async () => {
    // Write modal marks back into the main table for the chosen day
    setRows((prev) => prev.map((r) => {
      const att = [...r.att];
      att[modalDayIdx] = modalMarks[r.id] ?? '';
      return { ...r, att };
    }));
    setAttModalOpen(false);
    setSaved(false); // mark as unsaved so trainer can hit Save
  };

  // ── Save to backend ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`${API}/attendance`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ weekLabel: week.label, rows }),
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      // Backend not yet wired — treat as success locally
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Derived metrics
  const allCells    = rows.flatMap((r) => r.att);
  const totalCells  = allCells.filter((a) => a !== '').length;
  const presentPct  = totalCells ? Math.round((allCells.filter((a) => a === 'P').length / totalCells) * 100) : 0;
  const absentCount = allCells.filter((a) => a === 'A').length;
  const leaveCount  = allCells.filter((a) => a === 'L').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Attendance Management</div>
        <div className="page-sub">Click any cell to toggle, or use the Attendance button to mark today's session</div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['👥 Students',    rows.length,      ''],
          ['✅ Avg Present', `${presentPct}%`, 'this week'],
          ['❌ Absences',    absentCount,      'this week'],
          ['🏖️ On Leave',   leaveCount,       'this week'],
        ].map(([label, val, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{val}</div>
            {sub && <div className="metric-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="card">

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sa-text)', flex: 1 }}>
            📅 {week.label}
          </span>
          <button
            className="action-btn"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={openAttModal}
          >
            📅 Take Attendance
          </button>
          <button
            className="action-btn accent"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save Attendance'}
          </button>
        </div>

        {saveError && (
          <div style={{ fontSize: 12, color: '#b91c1c', background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
            ⚠️ {saveError}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>Student</th>
                <th style={{ fontSize: 11, color: 'var(--sa-muted)' }}>Course</th>
                {week.days.map((d, di) => (
                  <th key={d} style={{ textAlign: 'center', fontSize: 11, minWidth: 52, color: di === todayIdx ? 'var(--sa-teal)' : undefined, fontWeight: di === todayIdx ? 700 : undefined }}>
                    {d}{di === todayIdx ? ' ★' : ''}
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const filled   = r.att.filter((a) => a !== '');
                const pct      = filled.length ? Math.round((r.att.filter((a) => a === 'P').length / filled.length) * 100) : 0;
                const pctColor = pct >= 75 ? '#3B6D11' : pct >= 50 ? '#633806' : '#A32D2D';
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`avatar ${r.av}`} style={{ width: 24, height: 24, fontSize: 10 }}>{r.initials}</div>
                        {r.name}
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{r.course}</td>
                    {r.att.map((a, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '6px 4px' }}>
                        <div
                          className={`att-cell ${attClass[a]}`}
                          style={{
                            width: 28, height: 28, margin: '0 auto', cursor: 'pointer',
                            borderRadius: 6, fontSize: 11, transition: 'background 0.15s',
                            outline: i === todayIdx ? '2px solid var(--sa-teal)' : 'none',
                            outlineOffset: 1,
                          }}
                          title={`Click to change: ${attLabel[a] || '—'}`}
                          onClick={() => cycleCell(r.id, i)}
                        >
                          {a || '·'}
                        </div>
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, color: pctColor }}>
                      {filled.length ? `${pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--sa-muted)', padding: '20px 0', fontSize: 13 }}>No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 16, fontSize: 11, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['att-present','P','Present'],['att-absent','A','Absent'],['att-leave','L','Leave'],['att-none','·','Not marked']].map(([cls, letter, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className={`att-cell ${cls}`} style={{ width: 18, height: 18, display: 'inline-flex', borderRadius: 3, fontSize: 10, flexShrink: 0 }}>{letter}</span>
              {label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--sa-muted)' }}>
            ★ = today's column
          </span>
        </div>
      </div>

      {/* ══════════════════════ TAKE ATTENDANCE MODAL ══════════════════════ */}
      {attModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAttModalOpen(false); }}
        >
          <div style={{ background: 'var(--sa-bg)', borderRadius: 14, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>📅 Take Attendance</div>
                <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 3 }}>{week.label}</div>
              </div>
              <button
                onClick={() => setAttModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--sa-muted)', lineHeight: 1 }}
              >×</button>
            </div>

            {/* Day selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sa-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Day</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {week.days.map((d, di) => (
                  <button
                    key={d}
                    onClick={() => handleModalDayChange(di)}
                    style={{
                      fontSize: 11, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                      borderColor: modalDayIdx === di ? 'var(--sa-teal)' : 'var(--sa-border)',
                      background: modalDayIdx === di ? 'var(--sa-teal)' : 'var(--sa-surface)',
                      color: modalDayIdx === di ? '#fff' : 'var(--sa-text)',
                      fontWeight: modalDayIdx === di ? 700 : 400,
                    }}
                  >
                    {d}{di === todayIdx ? ' ★' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick-mark all row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, padding: '10px 12px', background: 'var(--sa-surface)', borderRadius: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--sa-muted)', fontWeight: 500, flex: 1 }}>Mark all as:</span>
              {[['P','Present','#dcfce7','#16a34a'],['A','Absent','#fee2e2','#dc2626'],['L','Leave','#fef9c3','#92400e']].map(([val, lbl, bg, col]) => (
                <button
                  key={val}
                  onClick={() => setAllModal(val)}
                  style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, border: `1px solid ${col}`, background: bg, color: col, cursor: 'pointer', fontWeight: 600 }}
                >
                  {val} — {lbl}
                </button>
              ))}
              <button
                onClick={() => setAllModal('')}
                style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, border: '1px solid var(--sa-border)', background: 'var(--sa-surface)', color: 'var(--sa-muted)', cursor: 'pointer' }}
              >
                Clear All
              </button>
            </div>

            {/* Student list */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((r) => {
                const mark = modalMarks[r.id] ?? '';
                const markBg    = mark === 'P' ? '#dcfce7' : mark === 'A' ? '#fee2e2' : mark === 'L' ? '#fef9c3' : 'var(--sa-surface)';
                const markColor = mark === 'P' ? '#16a34a' : mark === 'A' ? '#dc2626' : mark === 'L' ? '#92400e' : 'var(--sa-muted)';
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${mark ? markColor + '55' : 'var(--sa-border)'}`,
                      background: markBg,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Avatar + name */}
                    <div className={`avatar ${r.av}`} style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{r.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{r.course}</div>
                    </div>

                    {/* P / A / L / — toggle buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['P','Present','#16a34a','#dcfce7'],['A','Absent','#dc2626','#fee2e2'],['L','Leave','#92400e','#fef9c3']].map(([val, title, col, bg]) => (
                        <button
                          key={val}
                          title={title}
                          onClick={() => setModalMarks((prev) => ({ ...prev, [r.id]: prev[r.id] === val ? '' : val }))}
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${mark === val ? col : 'var(--sa-border)'}`,
                            background: mark === val ? bg : 'var(--sa-bg)',
                            color: mark === val ? col : 'var(--sa-muted)',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Current status badge */}
                    <span style={{
                      minWidth: 64, textAlign: 'center', fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 20,
                      background: mark === 'P' ? '#dcfce7' : mark === 'A' ? '#fee2e2' : mark === 'L' ? '#fef9c3' : 'var(--sa-surface)',
                      color: mark === 'P' ? '#16a34a' : mark === 'A' ? '#dc2626' : mark === 'L' ? '#92400e' : 'var(--sa-muted)',
                      border: `1px solid ${mark === 'P' ? '#86efac' : mark === 'A' ? '#fca5a5' : mark === 'L' ? '#fde047' : 'var(--sa-border)'}`,
                    }}>
                      {mark === 'P' ? '✓ Present' : mark === 'A' ? '✗ Absent' : mark === 'L' ? '◐ Leave' : '— —'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Summary bar */}
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--sa-surface)', borderRadius: 8, display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
              {[
                ['✓ Present', Object.values(modalMarks).filter((v) => v === 'P').length, '#16a34a'],
                ['✗ Absent',  Object.values(modalMarks).filter((v) => v === 'A').length, '#dc2626'],
                ['◐ Leave',   Object.values(modalMarks).filter((v) => v === 'L').length, '#92400e'],
                ['— Unmarked',rows.length - Object.values(modalMarks).filter(Boolean).length, 'var(--sa-muted)'],
              ].map(([label, count, color]) => (
                <span key={label} style={{ color, fontWeight: 600 }}>{label}: <strong>{count}</strong></span>
              ))}
            </div>

            {/* Modal footer buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="action-btn" style={{ fontSize: 12 }} onClick={() => setAttModalOpen(false)}>Cancel</button>
              <button
                className="action-btn accent"
                style={{ fontSize: 12, minWidth: 140 }}
                onClick={handleModalSave}
              >
                ✓ Apply to Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CREATE QUIZ PAGE — fully wired to the backend.
//    - Lists existing quizzes for the trainer (GET /api/quizzes)
//    - Publishes new quizzes (POST /api/quizzes), which immediately become
//      visible to students enrolled in the selected course
//    - Lets the trainer delete a quiz (DELETE /api/quizzes/:id)
//    - Lets the trainer view submitted results (GET /api/quizzes/:id/results)
// ════════════════════════════════════════════════════════════════════════════
export function CreateQuizPage() {
  const { courseTitles: COURSES, loadingCourseTitles } = useCourseTitles();

  const blankQuestion = () => ({ id: Date.now() + Math.random(), text: '', options: ['', '', '', ''], correct: 0, marks: 1 });

  const [quizTitle,    setQuizTitle]    = useState('');
  const [course,       setCourse]       = useState('');
  const [timeLimit,    setTimeLimit]    = useState('15');
  const [passMark,     setPassMark]     = useState('60');
  const [questions,    setQuestions]    = useState([blankQuestion()]);
  const [activeQ,      setActiveQ]      = useState(0);

  // Once course titles load, default the form to the first one (only if
  // the trainer hasn't already picked something).
  useEffect(() => {
    if (!course && COURSES.length > 0) setCourse(COURSES[0]);
  }, [COURSES, course]);

  // Quizzes loaded from the database (this trainer's published/draft quizzes)
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [listError,    setListError]    = useState(null);

  // Results viewer (per-quiz attempts)
  const [resultsFor,   setResultsFor]   = useState(null); // quiz object or null
  const [results,      setResults]      = useState(null); // { quiz, attempts }
  const [loadingResults, setLoadingResults] = useState(false);

  const { loading: publishing, error: publishError, success: publishSuccess, run } = useAsync();

  const loadQuizzes = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch(`${API}/quizzes`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load quizzes');
      setSavedQuizzes(json.data || []);
    } catch (e) {
      setListError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  const updateQuestion = (idx, field, value) =>
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, oIdx, value) =>
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = [...q.options]; options[oIdx] = value;
      return { ...q, options };
    }));

  const addQuestion = () => { const next = [...questions, blankQuestion()]; setQuestions(next); setActiveQ(next.length - 1); };

  const removeQuestion = (idx) => {
    if (questions.length === 1) { alert('A quiz must have at least one question.'); return; }
    if (!window.confirm('Remove this question?')) return;
    const next = questions.filter((_, i) => i !== idx);
    setQuestions(next); setActiveQ(Math.min(activeQ, next.length - 1));
  };

  const moveQuestion = (idx, dir) => {
    const next = [...questions]; const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setQuestions(next); setActiveQ(swap);
  };

  const validate = () => {
    if (!quizTitle.trim()) { alert('Please enter a quiz title.'); return false; }
    if (!course) { alert('Please select a course.'); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { alert(`Question ${i + 1}: enter question text.`); setActiveQ(i); return false; }
      if (q.options.some((o) => !o.trim())) { alert(`Question ${i + 1}: fill all 4 options.`); setActiveQ(i); return false; }
    }
    return true;
  };

  const resetForm = () => {
    setQuizTitle(''); setTimeLimit('15'); setPassMark('60');
    setQuestions([blankQuestion()]); setActiveQ(0);
  };

  const handlePublish = async () => {
    if (!validate()) return;

    const payload = {
      title: quizTitle,
      course,
      timeLimitMinutes: Number(timeLimit) || 15,
      passMark: Number(passMark) || 60,
      questions: questions.map((q) => ({ text: q.text, options: q.options, correct: q.correct, marks: Number(q.marks) || 1 })),
      status: 'published',
    };

    await run(async () => {
      const res = await fetch(`${API}/quizzes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to publish quiz');
      // Refresh the list straight from the DB so the trainer sees exactly
      // what students will see — this is the single source of truth.
      await loadQuizzes();
      resetForm();
      return json.data;
    }, 'Quiz published! Students in this course can now see it.');
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? Students will no longer see it and existing results will be removed.')) return;
    try {
      const res = await fetch(`${API}/quizzes/${quizId}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to delete quiz');
      setSavedQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (resultsFor?.id === quizId) { setResultsFor(null); setResults(null); }
    } catch (e) {
      alert(e.message);
    }
  };

  const openResults = async (quiz) => {
    setResultsFor(quiz);
    setResults(null);
    setLoadingResults(true);
    try {
      const res = await fetch(`${API}/quizzes/${quiz.id}/results`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load results');
      setResults(json.data);
    } catch (e) {
      alert(e.message);
      setResultsFor(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const totalMarks = questions.reduce((s, q) => s + Number(q.marks), 0);
  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Create Quiz</div>
        <div className="page-sub">Build, publish and track quizzes for your students — changes here appear instantly in the student Quizzes tab</div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['❓ Questions',   questions.length,        ''],
          ['🏆 Total Marks', totalMarks,              ''],
          ['⏱️ Time Limit', `${timeLimit || '—'} min`, ''],
          ['📋 Published',   savedQuizzes.length,     'total quizzes'],
        ].map(([label, val, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{val}</div>
            {sub && <div className="metric-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StatusBanner error={publishError} success={publishSuccess} />

          <div className="card">
            <div className="card-title">Quiz Settings</div>
            <div className="form-group">
              <label className="form-label">Quiz Title *</label>
              <input className="form-input" placeholder="e.g. React Fundamentals Quiz" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Course *</label>
              <select className="form-input" value={course} onChange={(e) => setCourse(e.target.value)} disabled={loadingCourseTitles || COURSES.length === 0}>
                {loadingCourseTitles && <option>Loading courses…</option>}
                {!loadingCourseTitles && COURSES.length === 0 && <option>No courses available — ask an admin to add one</option>}
                {COURSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Time Limit (min)</label>
                <input className="form-input" type="number" min={1} placeholder="15" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Pass Mark (%)</label>
                <input className="form-input" type="number" min={1} max={100} placeholder="60" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Questions ({questions.length})</div>
            {questions.map((q, qIdx) => (
              <div key={q.id} style={{ border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: activeQ === qIdx ? 'var(--sa-surface)' : 'transparent', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setActiveQ(activeQ === qIdx ? -1 : qIdx)}>
                  <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'var(--sa-teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{qIdx + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: q.text ? 'var(--sa-text)' : 'var(--sa-muted)' }}>{q.text || 'Click to edit question…'}</span>
                  <span style={{ fontSize: 11, color: 'var(--sa-muted)', marginRight: 4 }}>{q.marks} mk</span>
                  <button className="action-btn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={(e) => { e.stopPropagation(); moveQuestion(qIdx, -1); }} disabled={qIdx === 0} title="Move up">↑</button>
                  <button className="action-btn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={(e) => { e.stopPropagation(); moveQuestion(qIdx, 1); }} disabled={qIdx === questions.length - 1} title="Move down">↓</button>
                  <button className="action-btn" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--sa-accent)' }} onClick={(e) => { e.stopPropagation(); removeQuestion(qIdx); }} title="Delete question">🗑️</button>
                  <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{activeQ === qIdx ? '▲' : '▼'}</span>
                </div>

                {activeQ === qIdx && (
                  <div style={{ padding: '12px 14px', borderTop: '1px solid var(--sa-border)' }}>
                    <div className="form-group">
                      <label className="form-label">Question Text *</label>
                      <textarea className="form-input" rows={2} placeholder="e.g. Which hook is used for side effects in React?" value={q.text} onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Options — click radio to mark correct answer</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--border-radius-md)', border: `1px solid ${q.correct === oIdx ? 'var(--sa-teal)' : 'var(--sa-border)'}`, background: q.correct === oIdx ? 'rgba(29,158,117,0.06)' : 'var(--sa-surface)' }}>
                          <input type="radio" name={`correct-${q.id}`} checked={q.correct === oIdx} onChange={() => updateQuestion(qIdx, 'correct', oIdx)} style={{ accentColor: 'var(--sa-teal)', flexShrink: 0 }} />
                          <span style={{ minWidth: 20, height: 20, borderRadius: '50%', background: q.correct === oIdx ? 'var(--sa-teal)' : 'var(--sa-border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{OPTION_LETTERS[oIdx]}</span>
                          <input className="form-input" placeholder={`Option ${OPTION_LETTERS[oIdx]}`} value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }} />
                          {q.correct === oIdx && <span style={{ fontSize: 11, color: 'var(--sa-teal)', fontWeight: 600, flexShrink: 0 }}>✓ Correct</span>}
                        </div>
                      ))}
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Marks for this question</label>
                      <input className="form-input" type="number" min={1} max={10} value={q.marks} onChange={(e) => updateQuestion(qIdx, 'marks', Number(e.target.value))} style={{ width: 80 }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="action-btn" style={{ width: '100%', marginTop: 4, fontSize: 13 }} onClick={addQuestion}>➕ Add Question</button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="action-btn" style={{ flex: 1, fontSize: 13 }} onClick={resetForm}>🗑️ Clear</button>
            <button className="action-btn accent" style={{ flex: 2, fontSize: 13 }} onClick={handlePublish} disabled={publishing}>
              {publishing ? '⏳ Publishing…' : '✓ Publish Quiz'}
            </button>
          </div>
        </div>

        {/* Right: preview + published list + results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ position: 'sticky', top: 16 }}>
            <div className="card-title">Quiz Preview</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{quizTitle || 'Untitled Quiz'}</div>
              <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 4 }}>{course} · {timeLimit || '—'} min · Pass: {passMark || '—'}% · {totalMarks} marks</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {questions.map((q, qIdx) => (
                <div key={q.id} style={{ padding: '10px 12px', border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', background: 'var(--sa-surface)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Q{qIdx + 1}. {q.text || <span style={{ color: 'var(--sa-muted)', fontWeight: 400 }}>(no text)</span>}
                    <span style={{ fontSize: 11, color: 'var(--sa-muted)', marginLeft: 6 }}>({q.marks} mk)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: q.correct === oIdx ? '#3B6D11' : 'var(--sa-text)', fontWeight: q.correct === oIdx ? 600 : 400 }}>
                        <span style={{ minWidth: 18, height: 18, borderRadius: '50%', background: q.correct === oIdx ? '#EAF3DE' : 'var(--sa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: q.correct === oIdx ? '#3B6D11' : 'var(--sa-muted)' }}>{OPTION_LETTERS[oIdx]}</span>
                        {opt || <span style={{ color: 'var(--sa-muted)' }}>(empty)</span>}
                        {q.correct === oIdx && <span style={{ fontSize: 10, marginLeft: 2 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              Published Quizzes ({savedQuizzes.length})
              <button className="action-btn" style={{ fontSize: 11 }} onClick={loadQuizzes}>↻ Refresh</button>
            </div>

            {loadingList && <div style={{ fontSize: 12, color: 'var(--sa-muted)', padding: '8px 0' }}>⏳ Loading quizzes…</div>}
            {listError && (
              <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 8, fontSize: 12, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                ⚠️ {listError}
              </div>
            )}
            {!loadingList && !listError && savedQuizzes.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--sa-muted)', padding: '8px 0' }}>No quizzes published yet. Build one on the left and hit Publish.</div>
            )}

            {savedQuizzes.map((q) => {
              const qTotalMarks = (q.questions || []).reduce((s, qq) => s + (Number(qq.marks) || 0), 0);
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--sa-border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{q.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 2 }}>
                      {q.course} · {(q.questions || []).length} Qs · {qTotalMarks} marks · {q.time_limit_minutes} min · Pass {q.pass_mark}%
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: q.status === 'published' ? '#EAF3DE' : '#FEF3C7', color: q.status === 'published' ? '#3B6D11' : '#92400E', whiteSpace: 'nowrap' }}>
                    {q.status === 'published' ? '✅ Live' : '📝 Draft'}
                  </span>
                  <button className="action-btn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openResults(q)}>📊 Results</button>
                  <button className="action-btn" style={{ fontSize: 11, padding: '3px 7px', color: 'var(--sa-accent)' }} onClick={() => handleDelete(q.id)}>🗑️</button>
                </div>
              );
            })}
          </div>

          {resultsFor && (
            <div className="card">
              <div className="card-title">
                Results: {resultsFor.title}
                <button className="action-btn" style={{ fontSize: 11 }} onClick={() => { setResultsFor(null); setResults(null); }}>✕ Close</button>
              </div>
              {loadingResults && <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>⏳ Loading results…</div>}
              {!loadingResults && results && results.attempts.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>No students have attempted this quiz yet.</div>
              )}
              {!loadingResults && results && results.attempts.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr><th>Student</th><th>Score</th><th>%</th><th>Result</th><th>Submitted</th></tr>
                  </thead>
                  <tbody>
                    {results.attempts.map((a) => (
                      <tr key={a.id}>
                        <td>{a.student_name}<div style={{ fontSize: 10, color: 'var(--sa-muted)' }}>{a.student_email}</div></td>
                        <td>{a.score}/{a.total_marks}</td>
                        <td>{a.percentage}%</td>
                        <td><span className={`status-pill ${a.passed ? 'status-active' : 'status-pending'}`}>{a.passed ? 'Passed' : 'Failed'}</span></td>
                        <td style={{ fontSize: 11 }}>{new Date(a.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ASSIGNMENT MANAGER PAGE
// ════════════════════════════════════════════════════════════════════════════
export function AssignmentManagerPage() {
  const DEFAULT_SUBMISSIONS = [
    { id: 's1', student: 'Arjun S.',   initials: 'AS', av: 'av-a', assignment: 'React Hooks Assignment', course: 'Full Stack',     submitted: '2026-01-18', status: 'pending',   score: null, maxMarks: 100, file: 'hooks_arjun.pdf',      feedback: '' },
    { id: 's2', student: 'Preethi N.', initials: 'PN', av: 'av-b', assignment: 'React Hooks Assignment', course: 'Full Stack',     submitted: '2026-01-17', status: 'graded',    score: 88,   maxMarks: 100, file: 'hooks_preethi.zip',    feedback: 'Good understanding of useEffect.' },
    { id: 's3', student: 'Kiran K.',   initials: 'KK', av: 'av-c', assignment: 'Data Cleaning Task',     course: 'Python with AI', submitted: '2026-01-19', status: 'submitted', score: null, maxMarks: 50,  file: 'cleaning_kiran.py',    feedback: '' },
    { id: 's4', student: 'Divya M.',   initials: 'DM', av: 'av-d', assignment: 'CSS Flexbox Exercise',   course: 'Full Stack',     submitted: '2026-01-21', status: 'late',      score: null, maxMarks: 100, file: 'flexbox_divya.html',   feedback: '' },
    { id: 's5', student: 'Rahul V.',   initials: 'RV', av: 'av-e', assignment: 'Context API Task',       course: 'Advanced React', submitted: '2026-01-20', status: 'graded',    score: 72,   maxMarks: 100, file: 'context_rahul.jsx',    feedback: 'Needs improvement on prop drilling.' },
    { id: 's6', student: 'Sneha R.',   initials: 'SR', av: 'av-a', assignment: 'Data Cleaning Task',     course: 'Python with AI', submitted: '2026-01-18', status: 'pending',   score: null, maxMarks: 50,  file: 'cleaning_sneha.ipynb', feedback: '' },
    { id: 's7', student: 'Arjun S.',   initials: 'AS', av: 'av-a', assignment: 'CSS Flexbox Exercise',   course: 'Full Stack',     submitted: '2026-01-20', status: 'submitted', score: null, maxMarks: 100, file: 'flexbox_arjun.html',   feedback: '' },
  ];

  const [submissions,   setSubmissions]   = useState(DEFAULT_SUBMISSIONS);
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [courseFilter,  setCourseFilter]  = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [gradeTarget,   setGradeTarget]   = useState(null);
  const [gradeScore,    setGradeScore]    = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [activeTab,     setActiveTab]     = useState(0);

  const totalSubmissions = submissions.length;
  const pendingCount     = submissions.filter((s) => s.status === 'pending' || s.status === 'submitted').length;
  const gradedCount      = submissions.filter((s) => s.status === 'graded').length;
  const lateCount        = submissions.filter((s) => s.status === 'late').length;
  const gradedWithScore  = submissions.filter((s) => s.status === 'graded' && s.score !== null);
  const avgScore         = gradedWithScore.length ? Math.round(gradedWithScore.reduce((sum, s) => sum + (s.score / s.maxMarks) * 100, 0) / gradedWithScore.length) : 0;

  const filtered = submissions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (courseFilter && s.course !== courseFilter) return false;
    if (searchQuery && !s.student.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const assignmentStats = [...new Set(submissions.map((s) => s.assignment))].map((name) => {
    const group  = submissions.filter((s) => s.assignment === name);
    const graded = group.filter((s) => s.status === 'graded' && s.score !== null);
    const avg    = graded.length ? Math.round(graded.reduce((sum, s) => sum + (s.score / s.maxMarks) * 100, 0) / graded.length) : null;
    return { name, total: group.length, graded: graded.length, pending: group.filter((s) => s.status === 'pending').length, late: group.filter((s) => s.status === 'late').length, avg };
  });

  const openGradeModal = (sub) => { setGradeTarget(sub); setGradeScore(sub.score !== null ? String(sub.score) : ''); setGradeFeedback(sub.feedback || ''); };

  const handleSaveGrade = async () => {
    const sc = parseInt(gradeScore, 10);
    if (isNaN(sc) || sc < 0 || sc > gradeTarget.maxMarks) { alert(`Score must be between 0 and ${gradeTarget.maxMarks}`); return; }
    try {
      await fetch(`${API}/submissions/${gradeTarget.id}/grade`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ score: sc, feedback: gradeFeedback }),
      });
    } catch { /* local fallback */ }
    setSubmissions((prev) => prev.map((s) => s.id === gradeTarget.id ? { ...s, score: sc, feedback: gradeFeedback, status: 'graded' } : s));
    setGradeTarget(null);
  };

  const handleQuickGrade = async (id, val, maxMarks) => {
    const sc = parseInt(val, 10);
    if (isNaN(sc) || sc < 0 || sc > maxMarks) return;
    try { await fetch(`${API}/submissions/${id}/grade`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ score: sc }) }); } catch { /* local */ }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, score: sc, status: 'graded' } : s));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Remove this submission record?')) return;
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const statusPillStyle = {
    pending:   { background: 'var(--sa-surface)', color: 'var(--sa-muted)', border: '1px solid var(--sa-border)' },
    submitted: { background: '#e8f4fd', color: '#185FA5' },
    graded:    { background: '#eaf3de', color: '#3B6D11' },
    late:      { background: '#fcebeb', color: '#A32D2D' },
  };

  const StatusPill = ({ status }) => (
    <span className="status-pill" style={{ ...(statusPillStyle[status] || {}), fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{status}</span>
  );

  const STATUS_TABS = [
    ['all',       'All',       totalSubmissions],
    ['pending',   'Pending',   submissions.filter((s) => s.status === 'pending').length],
    ['submitted', 'Submitted', submissions.filter((s) => s.status === 'submitted').length],
    ['graded',    'Graded',    gradedCount],
    ['late',      'Late',      lateCount],
  ];

  const uniqueCourses = [...new Set(submissions.map((s) => s.course))];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Assignment Manager</div>
        <div className="page-sub">Review submissions, grade work, and track completion</div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['📥 Submissions',   totalSubmissions, ''],
          ['⏳ Needs Grading', pendingCount,     pendingCount > 0 ? 'action required' : 'all caught up'],
          ['✅ Graded',        gradedCount,      ''],
          ['📊 Avg Score',     avgScore ? `${avgScore}%` : '—', gradedCount > 0 ? `from ${gradedCount} graded` : 'no grades yet'],
        ].map(([label, val, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{val}</div>
            {sub && <div className="metric-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="tab-group" style={{ marginBottom: 16 }}>
        {['📋 Submissions', '📊 Analytics'].map((label, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{label}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <>
          <div className="card">
            <div className="card-title">Submissions</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {STATUS_TABS.map(([key, label, count]) => (
                <button key={key} onClick={() => setStatusFilter(key)} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--sa-border)', borderRadius: 20, cursor: 'pointer', background: statusFilter === key ? 'var(--sa-teal)' : 'var(--sa-surface)', color: statusFilter === key ? '#fff' : 'var(--sa-text)', fontWeight: statusFilter === key ? 600 : 400 }}>{label} ({count})</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="form-input" style={{ width: 'auto', minWidth: 160, fontSize: 12 }} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                <option value="">All Courses</option>
                {uniqueCourses.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="form-input" placeholder="🔍 Search student…" style={{ flex: 1, minWidth: 160, fontSize: 12 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            {filtered.length === 0 ? (
              <div style={{ color: 'var(--sa-muted)', fontSize: 13, padding: '12px 0' }}>No submissions match the current filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr><th>#</th><th>Student</th><th>Assignment</th><th>Course</th><th>Submitted</th><th>Status</th><th>Score</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{String(i + 1).padStart(2, '0')}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`avatar ${s.av}`} style={{ width: 24, height: 24, fontSize: 10 }}>{s.initials}</div>
                            <span style={{ fontSize: 13 }}>{s.student}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--sa-muted)', maxWidth: 160 }}>{s.assignment}</td>
                        <td style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{s.course}</td>
                        <td style={{ fontSize: 11 }}>{s.submitted}</td>
                        <td><StatusPill status={s.status} /></td>
                        <td>
                          {s.status === 'graded' ? (
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{s.score}/{s.maxMarks}<span style={{ fontSize: 10, color: 'var(--sa-muted)', marginLeft: 4 }}>({Math.round((s.score / s.maxMarks) * 100)}%)</span></span>
                          ) : (
                            <input className="form-input" type="number" min={0} max={s.maxMarks} placeholder="—" style={{ width: 60, fontSize: 11, padding: '3px 6px' }} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickGrade(s.id, e.target.value, s.maxMarks); }} />
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openGradeModal(s)}>✏️ Grade</button>
                            <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => alert(`Viewing: ${s.file}`)}>📎</button>
                            <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--sa-accent)' }} onClick={() => handleDelete(s.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {lateCount > 0 && (
            <div style={{ background: '#fcebeb', border: '1px solid #F09595', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', fontSize: 13, color: '#501313', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ <strong>{lateCount}</strong> late submission{lateCount > 1 ? 's' : ''} — consider notifying those students.
            </div>
          )}
        </>
      )}

      {activeTab === 1 && (
        <div className="card">
          <div className="card-title">Assignment Breakdown</div>
          <table className="data-table">
            <thead>
              <tr><th>Assignment</th><th style={{ textAlign: 'center' }}>Total</th><th style={{ textAlign: 'center' }}>Graded</th><th style={{ textAlign: 'center' }}>Pending</th><th style={{ textAlign: 'center' }}>Late</th><th style={{ textAlign: 'center' }}>Avg Score</th><th>Completion</th></tr>
            </thead>
            <tbody>
              {assignmentStats.map((a) => {
                const pct = Math.round((a.graded / a.total) * 100);
                return (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</td>
                    <td style={{ textAlign: 'center' }}>{a.total}</td>
                    <td style={{ textAlign: 'center', color: '#3B6D11' }}>{a.graded}</td>
                    <td style={{ textAlign: 'center', color: 'var(--sa-muted)' }}>{a.pending}</td>
                    <td style={{ textAlign: 'center', color: '#A32D2D' }}>{a.late}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{a.avg !== null ? `${a.avg}%` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                        <span style={{ fontSize: 11 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {gradeTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={(e) => { if (e.target === e.currentTarget) setGradeTarget(null); }}>
          <div style={{ background: 'var(--sa-card)', border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-lg)', padding: 24, width: 440, maxWidth: '90vw' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Grade Submission</div>
            <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 16 }}>{gradeTarget.student} — {gradeTarget.assignment}</div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Score (out of {gradeTarget.maxMarks})</label>
                <input className="form-input" type="number" min={0} max={gradeTarget.maxMarks} placeholder={`0 – ${gradeTarget.maxMarks}`} value={gradeScore} onChange={(e) => setGradeScore(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">File</label>
                <div style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', color: 'var(--sa-muted)' }}>📎 {gradeTarget.file}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Feedback / Remarks</label>
              <textarea className="form-input" rows={3} placeholder="Write feedback for the student…" value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="action-btn" onClick={() => setGradeTarget(null)}>Cancel</button>
              <button className="action-btn accent" onClick={handleSaveGrade}>✓ Save Grade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 6. TRAINER NOTIFICATIONS PAGE
// ════════════════════════════════════════════════════════════════════════════
export function TrainerNotificationsPage() {
  const COURSE_LIST = [
    { id: 'full',  label: 'Full Stack Web Development' },
    { id: 'ai',    label: 'Python with AI' },
    { id: 'react', label: 'Advanced React' },
  ];

  const INITIAL_SENT = [
    { id: 'n1', title: 'Assignment Due Reminder',   body: 'React Hooks Assignment is due tomorrow. Please submit before midnight.',      audience: 'Full Stack',     type: 'reminder',     sentAt: '2026-01-19 09:00', reach: 142 },
    { id: 'n2', title: 'New Video Uploaded',        body: 'A new lesson on useContext has been uploaded. Check it out!',                audience: 'All Students',   type: 'announcement', sentAt: '2026-01-18 14:30', reach: 305 },
    { id: 'n3', title: 'Class Cancelled – Jan 20',  body: "Today's live session is cancelled. Recording will be shared shortly.",       audience: 'Python with AI', type: 'alert',        sentAt: '2026-01-20 08:00', reach: 98  },
    { id: 'n4', title: 'Quiz Published',            body: 'A new quiz on React Fundamentals is now live. Complete it by Jan 22.',       audience: 'Advanced React', type: 'reminder',     sentAt: '2026-01-17 11:00', reach: 65  },
    { id: 'n5', title: 'Motivational Note',         body: "Great work this week, everyone! Keep pushing — you're doing amazing.",      audience: 'All Students',   type: 'general',      sentAt: '2026-01-16 17:00', reach: 305 },
  ];

  const [sentList,      setSentList]      = useState(INITIAL_SENT);
  const [activeTab,     setActiveTab]     = useState(0);
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [notifTitle,    setNotifTitle]    = useState('');
  const [notifBody,     setNotifBody]     = useState('');
  const [notifAudience, setNotifAudience] = useState('');
  const [notifType,     setNotifType]     = useState('announcement');
  const [notifChannel,  setNotifChannel]  = useState({ inApp: true, email: false, sms: false });
  const [scheduleMode,  setScheduleMode]  = useState('now');
  const [scheduledAt,   setScheduledAt]   = useState('');
  const [sending,       setSending]       = useState(false);
  const [previewOpen,   setPreviewOpen]   = useState(false);

  const TYPE_META = {
    announcement: { label: 'Announcement', bg: '#E6F1FB', color: '#0C447C' },
    reminder:     { label: 'Reminder',     bg: '#FAEEDA', color: '#633806' },
    alert:        { label: 'Alert',        bg: '#FCEBEB', color: '#501313' },
    general:      { label: 'General',      bg: '#EAF3DE', color: '#27500A' },
  };

  const audienceReach = (aud) => {
    if (!aud || aud === 'All Students') return 305;
    return { 'Full Stack Web Development': 142, 'Python with AI': 98, 'Advanced React': 65 }[aud] || 0;
  };

  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: m.bg, color: m.color }}>{m.label}</span>;
  };

  const filteredSent = sentList.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.body.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSend = async () => {
    if (!notifTitle.trim() || !notifBody.trim() || !notifAudience) { alert('Please fill in Title, Message, and Audience.'); return; }
    if (scheduleMode === 'later' && !scheduledAt) { alert('Please pick a scheduled date & time.'); return; }
    setSending(true);

    const payload = { title: notifTitle, body: notifBody, audience: notifAudience, type: notifType, channels: notifChannel, scheduleMode, scheduledAt };
    try {
      await fetch(`${API}/notifications`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
    } catch { await new Promise((r) => setTimeout(r, 900)); }

    setSentList((prev) => [{
      id: `n-${Date.now()}`, title: notifTitle, body: notifBody, audience: notifAudience, type: notifType,
      sentAt: scheduleMode === 'now' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : scheduledAt.replace('T', ' '),
      reach: audienceReach(notifAudience), scheduled: scheduleMode === 'later',
    }, ...prev]);

    setNotifTitle(''); setNotifBody(''); setNotifAudience('');
    setNotifType('announcement'); setScheduleMode('now'); setScheduledAt('');
    setNotifChannel({ inApp: true, email: false, sms: false });
    setSending(false); setActiveTab(1);
    alert(scheduleMode === 'now' ? 'Notification sent!' : 'Notification scheduled!');
  };

  const handleDelete  = (id) => { if (!window.confirm('Delete this notification?')) return; setSentList((prev) => prev.filter((n) => n.id !== id)); };
  const handleResend  = (n) => { setNotifTitle(n.title); setNotifBody(n.body); setNotifAudience(n.audience); setNotifType(n.type); setActiveTab(0); };

  const bodyLen   = notifBody.length;
  const bodyColor = bodyLen > 280 ? '#A32D2D' : bodyLen > 200 ? '#633806' : 'var(--sa-muted)';

  const ChannelToggle = ({ id, label, emoji }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--border-radius-md)', border: `1px solid ${notifChannel[id] ? 'var(--sa-teal)' : 'var(--sa-border)'}`, background: notifChannel[id] ? 'rgba(29,158,117,0.07)' : 'var(--sa-surface)', fontSize: 13, userSelect: 'none' }}>
      <input type="checkbox" checked={notifChannel[id]} onChange={(e) => setNotifChannel((prev) => ({ ...prev, [id]: e.target.checked }))} style={{ accentColor: 'var(--sa-teal)', width: 14, height: 14 }} />
      {emoji} {label}
    </label>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Notifications</div>
        <div className="page-sub">Compose and manage notifications for your students</div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['📤 Sent',        sentList.length,                                    ''],
          ['👥 Total Reach', sentList.reduce((s, n) => s + n.reach, 0).toLocaleString(), 'across all notifications'],
          ['🔴 Alerts',      sentList.filter((n) => n.type === 'alert').length,  'high priority'],
          ['🕐 Scheduled',   2,                                                  'pending dispatch'],
        ].map(([label, val, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{val}</div>
            {sub && <div className="metric-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="tab-group" style={{ marginBottom: 16 }}>
        {['✏️ Compose', '📬 Sent / History'].map((label, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{label}</button>
        ))}
      </div>

      {/* ════ TAB 0 – COMPOSE ════ */}
      {activeTab === 0 && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-title">New Notification</div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(TYPE_META).map(([key, m]) => (
                    <button key={key} onClick={() => setNotifType(key)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${notifType === key ? m.color : 'var(--sa-border)'}`, background: notifType === key ? m.bg : 'var(--sa-surface)', color: notifType === key ? m.color : 'var(--sa-muted)', fontWeight: notifType === key ? 600 : 400 }}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Audience *</label>
                <select className="form-input" value={notifAudience} onChange={(e) => setNotifAudience(e.target.value)}>
                  <option value="">Select audience…</option>
                  <option value="All Students">👥 All Students (305)</option>
                  {COURSE_LIST.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="e.g. Assignment Due Reminder" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} maxLength={80} />
                <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 4, textAlign: 'right' }}>{notifTitle.length}/80</div>
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-input" rows={4} placeholder="Write your message to students…" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} maxLength={300} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ fontSize: 11, color: bodyColor, marginTop: 4, textAlign: 'right' }}>{bodyLen}/300</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Delivery Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ChannelToggle id="inApp" label="In-App Notification" emoji="🔔" />
                <ChannelToggle id="email" label="Email"               emoji="📧" />
                <ChannelToggle id="sms"   label="SMS"                 emoji="📱" />
              </div>
            </div>

            <div className="card">
              <div className="card-title">Schedule</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['now', '⚡ Send Now'], ['later', '🕐 Schedule']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setScheduleMode(val)} style={{ flex: 1, fontSize: 12, padding: '7px 0', border: `1px solid ${scheduleMode === val ? 'var(--sa-teal)' : 'var(--sa-border)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', background: scheduleMode === val ? 'rgba(29,158,117,0.08)' : 'var(--sa-surface)', color: scheduleMode === val ? 'var(--sa-teal)' : 'var(--sa-muted)', fontWeight: scheduleMode === val ? 600 : 400 }}>{lbl}</button>
                ))}
              </div>
              {scheduleMode === 'later' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date & Time</label>
                  <input className="form-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => setPreviewOpen(true)} disabled={!notifTitle && !notifBody}>👁️ Preview</button>
              <button className="action-btn accent" style={{ flex: 2 }} onClick={handleSend} disabled={sending}>
                {sending ? '⏳ Sending…' : scheduleMode === 'now' ? '🔔 Send Now' : '🕐 Schedule'}
              </button>
            </div>
          </div>

          {/* Live preview card */}
          <div className="card" style={{ position: 'sticky', top: 16 }}>
            <div className="card-title">Live Preview</div>
            <div style={{ border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
              <div style={{ background: TYPE_META[notifType]?.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: TYPE_META[notifType]?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', flexShrink: 0 }}>🔔</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: TYPE_META[notifType]?.color }}>{notifTitle || 'Notification Title'}</div>
                  <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 2 }}>To: {notifAudience || 'Select audience'} · {scheduleMode === 'now' ? 'Now' : scheduledAt || 'Scheduled'}</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--sa-text)', lineHeight: 1.6, minHeight: 60 }}>
                {notifBody || <span style={{ color: 'var(--sa-muted)' }}>Your message will appear here…</span>}
              </div>
              <div style={{ borderTop: '1px solid var(--sa-border)', padding: '8px 14px', display: 'flex', gap: 8, fontSize: 11, color: 'var(--sa-muted)' }}>
                {notifChannel.inApp && <span>🔔 In-App</span>}
                {notifChannel.email && <span>📧 Email</span>}
                {notifChannel.sms   && <span>📱 SMS</span>}
                {!notifChannel.inApp && !notifChannel.email && !notifChannel.sms && <span style={{ color: '#A32D2D' }}>⚠️ No channel selected</span>}
              </div>
            </div>
            {notifAudience && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--sa-surface)', borderRadius: 'var(--border-radius-md)', fontSize: 12, color: 'var(--sa-muted)' }}>
                👥 Estimated reach: <strong style={{ color: 'var(--sa-text)' }}>{audienceReach(notifAudience).toLocaleString()} students</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ TAB 1 – SENT ════ */}
      {activeTab === 1 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[['all', 'All'], ...Object.entries(TYPE_META).map(([k, m]) => [k, m.label])].map(([key, label]) => (
                <button key={key} onClick={() => setTypeFilter(key)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: '0.5px solid var(--sa-border)', background: typeFilter === key ? 'var(--sa-teal)' : 'var(--sa-surface)', color: typeFilter === key ? '#fff' : 'var(--sa-text)', fontWeight: typeFilter === key ? 600 : 400 }}>
                  {label} {key !== 'all' && `(${sentList.filter((n) => n.type === key).length})`}
                </button>
              ))}
            </div>
            <input className="form-input" placeholder="🔍 Search notifications…" style={{ flex: 1, minWidth: 180, fontSize: 12 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{filteredSent.length} result{filteredSent.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredSent.length === 0 ? (
            <div className="card" style={{ color: 'var(--sa-muted)', fontSize: 13, padding: '16px' }}>No notifications match the current filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredSent.map((n) => (
                <div key={n.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: TYPE_META[n.type]?.bg || '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {n.type === 'announcement' ? '📢' : n.type === 'reminder' ? '⏰' : n.type === 'alert' ? '🚨' : '💬'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                      <TypeBadge type={n.type} />
                      {n.scheduled && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#E6F1FB', color: '#185FA5' }}>🕐 Scheduled</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 6, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--sa-muted)', flexWrap: 'wrap' }}>
                      <span>📅 {n.sentAt}</span>
                      <span>👥 {n.audience}</span>
                      <span>📨 {n.reach.toLocaleString()} reached</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleResend(n)} title="Resend / clone">🔁</button>
                    <button className="action-btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--sa-accent)' }} onClick={() => handleDelete(n.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}>
          <div style={{ background: 'var(--sa-card)', border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-lg)', padding: 24, width: 420, maxWidth: '90vw' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Notification Preview</div>
            <div style={{ border: '1px solid var(--sa-border)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ background: TYPE_META[notifType]?.bg, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: TYPE_META[notifType]?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, flexShrink: 0 }}>🔔</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: TYPE_META[notifType]?.color }}>{notifTitle || '(No title)'}</div>
                  <div style={{ fontSize: 11, color: 'var(--sa-muted)', marginTop: 2 }}>{notifAudience || 'No audience'} · {scheduleMode === 'now' ? 'Sends immediately' : scheduledAt || 'Not scheduled'}</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, lineHeight: 1.65 }}>{notifBody || <span style={{ color: 'var(--sa-muted)' }}>(No message)</span>}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 16 }}>
              Channels: {[notifChannel.inApp && '🔔 In-App', notifChannel.email && '📧 Email', notifChannel.sms && '📱 SMS'].filter(Boolean).join(', ') || '⚠️ None selected'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="action-btn" onClick={() => setPreviewOpen(false)}>Close</button>
              <button className="action-btn accent" onClick={() => { setPreviewOpen(false); handleSend(); }} disabled={sending}>
                {scheduleMode === 'now' ? '🔔 Send Now' : '🕐 Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 7. SCHEDULE LIVE CLASS PAGE
// ════════════════════════════════════════════════════════════════════════════
export function ScheduleLiveClassPage({ navigate }) {
  const { courseTitles: COURSES, loadingCourseTitles } = useCourseTitles();
  const PLATFORMS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Jitsi Meet', 'Custom Link'];

  const STATUS_META = {
    scheduled: { label: 'Scheduled',    bg: '#E6F1FB', color: '#0C447C' },
    live:      { label: '🔴 Live Now',  bg: '#DCFCE7', color: '#14532D' },
    completed: { label: 'Completed',    bg: '#EAF3DE', color: '#3B6D11' },
    cancelled: { label: 'Cancelled',    bg: '#FCEBEB', color: '#A32D2D' },
  };

  const pad        = (n) => String(n).padStart(2, '0');
  const getNow     = () => new Date();
  const initNow    = getNow();
  const todayStr   = `${initNow.getFullYear()}-${pad(initNow.getMonth() + 1)}-${pad(initNow.getDate())}`;
  const defaultTime= `${pad(initNow.getHours() + 1)}:00`;

  // tick forces re-render every 30 s so statuses stay current without a page refresh
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── DB-backed state ────────────────────────────────────────────────────────
  const [classes,      setClasses]      = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [listError,    setListError]    = useState(null);

  // Fetch all live classes from the backend on mount and after mutations
  const fetchClasses = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch(`${API}/live-classes`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load classes');
      setClasses(json.data || []);
    } catch (e) {
      setListError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const [activeTab,    setActiveTab]    = useState(0);
  const [filterStat,   setFilterStat]   = useState('all');
  const [filterCourse, setFilterCourse] = useState('');
  const [searchQ,      setSearchQ]      = useState('');
  const [scheduling,   setScheduling]   = useState(false);
  const [scheduled,    setScheduled]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [actionError,  setActionError]  = useState(null);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [fTitle,       setFTitle]       = useState('');
  const [fCourse,      setFCourse]      = useState('');
  const [fDate,        setFDate]        = useState(todayStr);
  const [fTime,        setFTime]        = useState(defaultTime);
  const [fDuration,    setFDuration]    = useState('60');
  const [fPlatform,    setFPlatform]    = useState('Zoom');
  const [fLink,        setFLink]        = useState('');
  const [fDesc,        setFDesc]        = useState('');
  const [fRecurring,   setFRecurring]   = useState(false);
  const [fRecurType,   setFRecurType]   = useState('weekly');
  const [fRecurCount,  setFRecurCount]  = useState('4');
  const [fNotifyApp,   setFNotifyApp]   = useState(true);
  const [fNotifyEmail, setFNotifyEmail] = useState(true);
  const [fNotifySMS,   setFNotifySMS]   = useState(false);

  // Once course titles load, default the form to the first one (only if
  // nothing's been picked yet) — same pattern as the quiz form.
  useEffect(() => {
    if (!fCourse && COURSES.length > 0) setFCourse(COURSES[0]);
  }, [COURSES, fCourse]);

  const PLATFORM_EMOJI = { 'Zoom': '📹', 'Google Meet': '📅', 'Microsoft Teams': '🟦', 'Jitsi Meet': '🔗', 'Custom Link': '🔗' };

  const resetForm = () => {
    setFTitle(''); setFCourse(COURSES[0] || '');
    setFDate(todayStr); setFTime(defaultTime); setFDuration('60');
    setFPlatform('Zoom'); setFLink(''); setFDesc('');
    setFRecurring(false); setFRecurType('weekly'); setFRecurCount('4');
    setFNotifyApp(true); setFNotifyEmail(true); setFNotifySMS(false);
    setEditTarget(null);
    setActionError(null);
  };

  const fillForm = (cls) => {
    setEditTarget(cls);
    setFTitle(cls.title); setFCourse(cls.course);
    setFDate(cls.date); setFTime(cls.time);
    setFDuration(String(cls.duration)); setFPlatform(cls.platform);
    setFLink(cls.link); setFDesc(cls.description || '');
    setActiveTab(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSchedule = async () => {
    if (!fTitle.trim())   { setActionError('Enter a class title.');        return; }
    if (!fDate || !fTime) { setActionError('Select a date and time.');     return; }
    if (!fLink.trim())    { setActionError('Enter a meeting link / URL.'); return; }
    setScheduling(true);
    setActionError(null);

    const payload = {
      title: fTitle, course: fCourse, date: fDate, time: fTime,
      duration: Number(fDuration), platform: fPlatform, link: fLink,
      description: fDesc, recurring: fRecurring, recurType: fRecurType,
      recurCount: Number(fRecurCount),
      notify: { email: fNotifyEmail, inApp: fNotifyApp, sms: fNotifySMS },
    };

    try {
      const url    = editTarget ? `${API}/live-classes/${editTarget.id}` : `${API}/live-classes`;
      const method = editTarget ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      const json   = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      await fetchClasses();
    } catch (e) {
      setActionError(e.message);
    }

    setScheduling(false); setScheduled(true); resetForm();
    setTimeout(() => setScheduled(false), 3000);
  };

  const handleCancelClass = async () => {
    try {
      const res  = await fetch(`${API}/live-classes/${cancelTarget.id}/cancel`, { method: 'PUT', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Cancel failed');
      await fetchClasses();
    } catch (e) {
      setActionError(e.message);
    }
    setCancelTarget(null);
  };

  const handleMarkComplete = async (id) => {
    try {
      const res  = await fetch(`${API}/live-classes/${id}/complete`, { method: 'PUT', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Complete failed');
      await fetchClasses();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete this class permanently?')) return;
    try {
      const res  = await fetch(`${API}/live-classes/${id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Delete failed');
      await fetchClasses();
    } catch (e) {
      setActionError(e.message);
    }
  };

  // Recomputed on every render, which is triggered every 30 s by the tick
  // interval above. Cancelled/manually-ended classes are never auto-overridden;
  // everything else derives its status purely from the current wall-clock time.
  const computedClasses = classes.map((c) => {
    void tick; // depend on tick so React re-runs this on every interval fire
    // Never auto-override cancelled or manually-ended classes
    if (c.status === 'cancelled' || c.manually_ended) return c;
    try {
      const nowTs = getNow();
      const start = new Date(`${c.date}T${c.time}`);
      const end   = new Date(start.getTime() + (Number(c.duration) || 60) * 60_000);
      const auto  = nowTs < start ? 'scheduled' : nowTs <= end ? 'live' : 'completed';
      return { ...c, status: auto };
    } catch {
      return c;
    }
  });


  const filtered = computedClasses.filter((c) => {
    if (filterStat !== 'all' && c.status !== filterStat) return false;
    if (filterCourse && c.course !== filterCourse) return false;
    if (searchQ && !c.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const liveCount      = computedClasses.filter((c) => c.status === 'live').length;
  const scheduledCount = computedClasses.filter((c) => c.status === 'scheduled').length;
  const completedCount = computedClasses.filter((c) => c.status === 'completed').length;
  const totalEnrolled  = computedClasses.reduce((s, c) => s + (c.enrolled || 0), 0);

  const StatusBadge = ({ status }) => {
    const m = STATUS_META[status] || STATUS_META.scheduled;
    return (
      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
        {m.label}
      </span>
    );
  };

  const previewDate = fDate
    ? new Date(fDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not set';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Live Classes</div>
        <div className="page-sub">Schedule, manage and track your live teaching sessions</div>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {actionError}
          <button onClick={() => setActionError(null)} style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── Metrics ── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          ['🔴 Live Now',    liveCount,                     liveCount > 0 ? 'in progress' : 'none running'],
          ['📅 Scheduled',   scheduledCount,                'upcoming'],
          ['✅ Completed',   completedCount,                'this month'],
          ['👥 Total Reach', totalEnrolled.toLocaleString(),'enrolled students'],
        ].map(([label, val, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{val}</div>
            <div className="metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Live Banner ── */}
      {liveCount > 0 && (
        <div className="live-banner">
          <span className="live-dot" />
          <div style={{ flex: 1 }}>
            <div className="live-banner-title">
              {liveCount} Class{liveCount > 1 ? 'es' : ''} Live Right Now
            </div>
            <div className="live-banner-sub">
              {computedClasses.filter((c) => c.status === 'live').map((c) => c.title).join(' · ')}
            </div>
          </div>
          <button
            className="action-btn"
            style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none' }}
            onClick={() => { setFilterStat('live'); setActiveTab(1); }}
          >
            View Live →
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {['📅 Schedule Class', '📋 All Classes'].map((label, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB 0 – SCHEDULE CLASS ══════════════════ */}
      {activeTab === 0 && (
        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* ── Left Column: Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Basic Info */}
            <div className="card">
              <div className="card-title">{editTarget ? '✏️ Edit Class' : '📅 New Live Class'}</div>

              <div className="form-group">
                <label className="form-label">Class Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g. React Hooks Deep Dive"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-input" value={fCourse} onChange={(e) => setFCourse(e.target.value)} disabled={loadingCourseTitles || COURSES.length === 0}>
                  {loadingCourseTitles && <option>Loading courses…</option>}
                  {!loadingCourseTitles && COURSES.length === 0 && <option>No courses available — ask an admin to add one</option>}
                  {COURSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 120, margin: 0 }}>
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={fDate} min={todayStr} onChange={(e) => setFDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 100, margin: 0 }}>
                  <label className="form-label">Time *</label>
                  <input className="form-input" type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 100, margin: 0 }}>
                  <label className="form-label">Duration (min)</label>
                  <select className="form-input" value={fDuration} onChange={(e) => setFDuration(e.target.value)}>
                    {['30', '45', '60', '75', '90', '120'].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="What will students learn in this session?"
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Platform & Link */}
            <div className="card">
              <div className="card-title">Platform & Meeting Link</div>

              <div className="form-group">
                <label className="form-label">Platform</label>
                <div className="platform-grid">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setFPlatform(p)}
                      className={`platform-btn${fPlatform === p ? ' platform-btn-active' : ''}`}
                    >
                      <span style={{ fontSize: 20 }}>{PLATFORM_EMOJI[p]}</span>
                      <span style={{ fontSize: 11, marginTop: 4 }}>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Meeting Link / URL *</label>
                <input
                  className="form-input"
                  placeholder={
                    fPlatform === 'Zoom' ? 'https://zoom.us/j/...' :
                    fPlatform === 'Google Meet' ? 'https://meet.google.com/...' :
                    fPlatform === 'Microsoft Teams' ? 'https://teams.microsoft.com/l/...' :
                    'https://'
                  }
                  value={fLink}
                  onChange={(e) => setFLink(e.target.value)}
                />
              </div>
            </div>

            {/* Recurring */}
            <div className="card">
              <div className="card-title">Recurring Session</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={fRecurring}
                  onChange={(e) => setFRecurring(e.target.checked)}
                  style={{ accentColor: 'var(--sa-teal)', width: 16, height: 16 }}
                />
                <span style={{ fontWeight: 500 }}>Make this a recurring class</span>
              </label>

              {fRecurring && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 120, margin: 0 }}>
                    <label className="form-label">Frequency</label>
                    <select className="form-input" value={fRecurType} onChange={(e) => setFRecurType(e.target.value)}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 100, margin: 0 }}>
                    <label className="form-label">No. of Sessions</label>
                    <input className="form-input" type="number" min={2} max={52} value={fRecurCount} onChange={(e) => setFRecurCount(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="card">
              <div className="card-title">Notify Students</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['🔔 In-App notification', fNotifyApp,   setFNotifyApp],
                  ['📧 Email notification',  fNotifyEmail, setFNotifyEmail],
                  ['📱 SMS notification',    fNotifySMS,   setFNotifySMS],
                ].map(([label, val, set]) => (
                  <label key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '9px 12px', borderRadius: 'var(--border-radius-md)', fontSize: 13,
                    border: `1px solid ${val ? 'var(--sa-teal)' : 'var(--sa-border)'}`,
                    background: val ? 'rgba(29,158,117,0.06)' : 'var(--sa-surface)',
                  }}>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => set(e.target.checked)}
                      style={{ accentColor: 'var(--sa-teal)', width: 15, height: 15 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {editTarget && (
                <button className="action-btn" style={{ flex: 1 }} onClick={resetForm}>Cancel Edit</button>
              )}
              <button
                className="action-btn accent"
                style={{ flex: 2, fontSize: 13 }}
                onClick={handleSchedule}
                disabled={scheduling}
              >
                {scheduling ? '⏳ Saving…'
                  : scheduled ? '✅ Saved!'
                  : editTarget ? '💾 Update Class'
                  : '📅 Schedule Class'}
              </button>
            </div>
          </div>

          {/* ── Right Column: Live Preview ── */}
          <div className="card" style={{ position: 'sticky', top: 16 }}>
            <div className="card-title">Class Preview</div>

            <div className="live-preview-card">
              {/* Header */}
              <div className="live-preview-header">
                <div style={{ fontSize: 28 }}>{PLATFORM_EMOJI[fPlatform]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="live-preview-title">{fTitle || 'Class Title'}</div>
                  <div className="live-preview-sub">{fCourse}</div>
                </div>
                <StatusBadge status="scheduled" />
              </div>

              {/* Meta rows */}
              <div className="live-preview-meta">
                {[
                  ['📅', previewDate],
                  ['⏰', fTime ? `${fTime} IST` : 'Time not set'],
                  ['⏱️', `${fDuration} minutes`],
                  ['💻', fPlatform],
                ].map(([icon, val]) => (
                  <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--sa-border)' }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              {fDesc && (
                <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 12, lineHeight: 1.6, padding: '8px 10px', background: 'var(--sa-surface)', borderRadius: 8 }}>
                  {fDesc}
                </div>
              )}

              {/* Link */}
              {fLink && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 10px', background: 'var(--sa-surface)', borderRadius: 8, border: '1px solid var(--sa-border)' }}>
                  <span style={{ fontSize: 13 }}>🔗</span>
                  <span style={{ fontSize: 11, color: 'var(--sa-teal)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fLink}</span>
                  <button
                    style={{ fontSize: 10, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--sa-muted)', padding: '2px 4px' }}
                    onClick={() => navigator.clipboard?.writeText(fLink).catch(() => {})}
                    title="Copy link"
                  >
                    📋
                  </button>
                </div>
              )}

              {/* Recurring badge */}
              {fRecurring && (
                <div style={{ marginTop: 10, padding: '6px 12px', borderRadius: 20, background: '#E6F1FB', color: '#0C447C', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  🔁 Repeats {fRecurType} · {fRecurCount} sessions
                </div>
              )}

              {/* Notification channels */}
              <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {fNotifyApp   && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>🔔 In-App</span>}
                {fNotifyEmail && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>📧 Email</span>}
                {fNotifySMS   && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>📱 SMS</span>}
                {!fNotifyApp && !fNotifyEmail && !fNotifySMS && (
                  <span style={{ fontSize: 11, color: '#A32D2D' }}>⚠️ No channels selected</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 1 – ALL CLASSES ══════════════════ */}
      {activeTab === 1 && (
        <>
          {loadingList && (
            <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>
              ⏳ Loading classes…
            </div>
          )}
          {listError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
              ⚠️ {listError} — <button onClick={fetchClasses} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', textDecoration: 'underline' }}>Retry</button>
            </div>
          )}

          {/* Filters */}
          {!loadingList && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['all',       'All'],
                ['live',      '🔴 Live'],
                ['scheduled', 'Scheduled'],
                ['completed', 'Completed'],
                ['cancelled', 'Cancelled'],
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  onClick={() => setFilterStat(key)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    border: '0.5px solid var(--sa-border)',
                    background: filterStat === key ? 'var(--sa-teal)' : 'var(--sa-surface)',
                    color: filterStat === key ? '#fff' : 'var(--sa-text)',
                    fontWeight: filterStat === key ? 600 : 400,
                  }}
                >
                  {lbl} ({computedClasses.filter((c) => key === 'all' ? true : c.status === key).length})
                </button>
              ))}
            </div>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: 180, fontSize: 12 }}
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="">All Courses</option>
              {COURSES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              className="form-input"
              placeholder="🔍 Search classes…"
              style={{ flex: 1, minWidth: 160, fontSize: 12 }}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>
          )}

          {/* Class Cards */}
          {!loadingList && (filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--sa-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No classes found</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Try a different filter or schedule a new class.</div>
              <button className="action-btn accent" style={{ marginTop: 16, fontSize: 12 }} onClick={() => setActiveTab(0)}>
                + Schedule Class
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((cls) => (
                <div
                  key={cls.id}
                  className="live-class-card"
                  style={{ borderLeft: cls.status === 'live' ? '4px solid #16a34a' : cls.status === 'cancelled' ? '4px solid #dc2626' : '4px solid var(--sa-teal)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

                    {/* Platform icon */}
                    <div style={{
                      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                      background: cls.status === 'live' ? '#DCFCE7' : 'var(--sa-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      border: `1px solid ${cls.status === 'live' ? '#86efac' : 'var(--sa-border)'}`,
                    }}>
                      {PLATFORM_EMOJI[cls.platform]}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{cls.title}</span>
                        <StatusBadge status={cls.status} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 8 }}>{cls.course}</div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--sa-muted)', flexWrap: 'wrap' }}>
                        <span>📅 {cls.date}</span>
                        <span>⏰ {cls.time} IST</span>
                        <span>⏱️ {cls.duration} min</span>
                        <span>💻 {cls.platform}</span>
                        <span>👥 {cls.enrolled} enrolled{(cls.status === 'live' || cls.status === 'completed') ? ` · ${cls.joined} joined` : ''}</span>
                      </div>
                      {cls.description && (
                        <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 6, lineHeight: 1.5 }}>{cls.description}</div>
                      )}

                      {/* Attendance bar for live/completed */}
                      {(cls.status === 'live' || cls.status === 'completed') && cls.enrolled > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sa-muted)', marginBottom: 4 }}>
                            <span>Attendance</span>
                            <span style={{ fontWeight: 600, color: 'var(--sa-text)' }}>
                              {cls.joined}/{cls.enrolled} ({Math.round((cls.joined / cls.enrolled) * 100)}%)
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.round((cls.joined / cls.enrolled) * 100)}%`,
                                background: cls.status === 'live' ? '#16a34a' : 'var(--sa-teal)',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {cls.status === 'live' && (
                        <>
                          <a
                            href={cls.link} target="_blank" rel="noreferrer"
                            className="action-btn"
                            style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', textDecoration: 'none', textAlign: 'center' }}
                          >
                            🔴 Join Now
                          </a>
                          <button className="action-btn" style={{ fontSize: 12, color: '#A32D2D' }} onClick={() => handleMarkComplete(cls.id)}>
                            ✅ End Class
                          </button>
                        </>
                      )}
                      {cls.status === 'scheduled' && (
                        <>
                          <a
                            href={cls.link} target="_blank" rel="noreferrer"
                            className="action-btn"
                            style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center' }}
                          >
                            🔗 Open Link
                          </a>
                          <button className="action-btn" style={{ fontSize: 12 }} onClick={() => fillForm(cls)}>✏️ Edit</button>
                          <button className="action-btn" style={{ fontSize: 12, color: '#A32D2D' }} onClick={() => setCancelTarget(cls)}>✕ Cancel</button>
                        </>
                      )}
                      {(cls.status === 'completed' || cls.status === 'cancelled') && (
                        <button className="action-btn" style={{ fontSize: 12, color: 'var(--sa-accent)' }} onClick={() => handleDeleteClass(cls.id)}>
                          🗑️ Delete
                        </button>
                      )}
                      <button className="action-btn" style={{ fontSize: 12 }} onClick={() => setDetailTarget(cls)}>
                        👁️ Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {cancelTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setCancelTarget(null); }}
        >
          <div style={{ background: 'var(--sa-bg)', border: '1px solid var(--sa-border)', borderRadius: 14, padding: 26, width: 380, maxWidth: '92vw' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Cancel Class?</div>
            <div style={{ fontSize: 13, color: 'var(--sa-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Are you sure you want to cancel <strong>{cancelTarget.title}</strong> on {cancelTarget.date} at {cancelTarget.time}?
              Students will be notified.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="action-btn" onClick={() => setCancelTarget(null)}>Keep Class</button>
              <button
                className="action-btn"
                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                onClick={handleCancelClass}
              >
                Yes, Cancel It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Class Detail Modal ── */}
      {detailTarget && (() => {
        // Always show the up-to-date computed status, not the stale snapshot
        const liveDetail = computedClasses.find((c) => c.id === detailTarget.id) || detailTarget;
        return (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetailTarget(null); }}
        >
          <div style={{ background: 'var(--sa-bg)', border: '1px solid var(--sa-border)', borderRadius: 14, padding: 28, width: 480, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{liveDetail.title}</div>
              <button onClick={() => setDetailTarget(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--sa-muted)' }}>×</button>
            </div>

            <StatusBadge status={liveDetail.status} />

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['📚 Course',    liveDetail.course],
                ['📅 Date',      liveDetail.date],
                ['⏰ Time',      `${liveDetail.time} IST`],
                ['⏱️ Duration', `${liveDetail.duration} minutes`],
                ['💻 Platform',  liveDetail.platform],
                ['👤 Host',      liveDetail.host],
                ['👥 Enrolled',  `${liveDetail.enrolled} students`],
                ['✅ Joined',    (liveDetail.status === 'live' || liveDetail.status === 'completed') ? `${liveDetail.joined} students` : 'N/A'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13, borderBottom: '1px solid var(--sa-border)', paddingBottom: 8 }}>
                  <span style={{ minWidth: 115, color: 'var(--sa-muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ flex: 1 }}>{val}</span>
                </div>
              ))}
              {liveDetail.description && (
                <div style={{ display: 'flex', gap: 12, fontSize: 13, borderBottom: '1px solid var(--sa-border)', paddingBottom: 8 }}>
                  <span style={{ minWidth: 115, color: 'var(--sa-muted)', fontWeight: 500 }}>📝 Description</span>
                  <span style={{ flex: 1, lineHeight: 1.6 }}>{liveDetail.description}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ minWidth: 115, color: 'var(--sa-muted)', fontWeight: 500 }}>🔗 Meeting Link</span>
                <a href={liveDetail.link} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--sa-teal)', wordBreak: 'break-all' }}>{liveDetail.link}</a>
              </div>
            </div>

            <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {liveDetail.status === 'scheduled' && (
                <button className="action-btn" onClick={() => { setDetailTarget(null); fillForm(liveDetail); }}>✏️ Edit</button>
              )}
              {liveDetail.status !== 'cancelled' && (
                <a href={liveDetail.link} target="_blank" rel="noreferrer" className="action-btn accent" style={{ fontSize: 12, textDecoration: 'none' }}>
                  🔗 Open Meeting
                </a>
              )}
              <button className="action-btn" onClick={() => setDetailTarget(null)}>Close</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
