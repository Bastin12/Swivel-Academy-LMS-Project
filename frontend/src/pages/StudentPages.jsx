import { courses, notifs } from '../data/data';
import { CourseCard, NotifItem } from '../components/UI';
import { thumbEmoji } from '../data/data';
import { useState, useEffect, useCallback } from 'react';

export function StudentDashboard({ userName, navigate }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Student Dashboard</div>
        <div className="page-sub">Welcome back, {userName}!</div>
      </div>

      <div className="grid-4">
        {[
          ['Enrolled Courses', '4', '↑ 1 this month', 'metric-up'],
          ['Completed', '1', 'of 4 courses', ''],
          ['Avg Progress', '58%', '↑ 12% this week', 'metric-up'],
          ['Certificates', '1', 'earned', ''],
        ].map(([label, value, sub, cls]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
            <div className={`metric-sub ${cls}`}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Continue Learning</div>
          {courses.filter((c) => c.progress > 0).slice(0, 2).map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <div className={`course-thumb ${c.thumb}`} style={{ width: 44, height: 44, borderRadius: 8, fontSize: 18, flexShrink: 0 }}>
                {thumbEmoji[c.thumb]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sa-text)', marginBottom: 4 }}>{c.title}</div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${c.progress}%` }} /></div>
                <div className="progress-label">{c.progress}% complete</div>
              </div>
              <button className="action-btn" style={{ fontSize: 11 }}>▶</button>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Recent Notifications</div>
          {notifs.slice(0, 3).map((n, i) => <NotifItem key={i} notif={n} />)}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Upcoming Assignments</div>
        <table className="data-table">
          <thead>
            <tr><th>Assignment</th><th>Course</th><th>Due Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>React Hooks Exercise</td><td>Full Stack Web Dev</td><td>Jan 15, 2026</td><td><span className="status-pill status-pending">Due Soon</span></td></tr>
            <tr><td>Data Visualization Lab</td><td>Data Science & ML</td><td>Jan 20, 2026</td><td><span className="status-pill status-active">Open</span></td></tr>
            <tr><td>Wireframe Design</td><td>UI/UX Design</td><td>Jan 25, 2026</td><td><span className="status-pill status-active">Open</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MyCoursesPage({ activeTab, setTab, onOpenCourse }) {
  return (
    <div>
      <div className="page-header"><div className="page-title">My Courses</div></div>
      <div className="tab-group">
        {['All Enrolled', 'In Progress', 'Completed'].map((label, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{label}</button>
        ))}
      </div>
      <div className="grid-3">
        {courses.filter((c) => c.progress > 0).map((c) => (
          <CourseCard key={c.id} course={c} showProgress onOpen={onOpenCourse} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// QUIZ PAGE (Student view) — fully wired to the backend.
// Flow:
//   1. List quizzes published for the student's enrolled courses
//      (GET /api/quizzes — server already filters by enrollment + published)
//   2. Student picks one → answer locally → Submit
//   3. POST /api/quizzes/:id/submit scores it server-side and returns the
//      attempt (score, percentage, passed)
//   4. If already attempted, show the stored result instead of the form
// ════════════════════════════════════════════════════════════════════════════
const QUIZ_API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const quizAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
});

function useStudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${QUIZ_API}/quizzes`, { headers: quizAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load quizzes');
      setQuizzes(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  return { quizzes, loading, error, refetch: fetchQuizzes };
}

export function QuizPage() {
  const { quizzes, loading, error, refetch } = useStudentQuizzes();

  const [activeQuiz, setActiveQuiz] = useState(null); // quiz object being attempted
  const [answers, setAnswers]       = useState({});   // { [questionIdx]: optionIdx }
  const [qIndex, setQIndex]         = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult]         = useState(null); // attempt returned by server after submit
  const [secondsLeft, setSecondsLeft] = useState(null);

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setQIndex(0);
    setResult(quiz.myAttempt || null);
    setSecondsLeft((Number(quiz.time_limit_minutes) || 15) * 60);
  };

  const backToList = () => {
    setActiveQuiz(null);
    setResult(null);
    setSubmitError(null);
    refetch();
  };

  const submitQuiz = useCallback(async () => {
    if (!activeQuiz || submitting || result) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const questionCount = (activeQuiz.questions || []).length;
      const answersArray = Array.from({ length: questionCount }, (_, i) => (i in answers ? answers[i] : null));
      const res = await fetch(`${QUIZ_API}/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        headers: quizAuthHeaders(),
        body: JSON.stringify({ answers: answersArray }),
      });
      const json = await res.json();

      if (res.status === 403) {
        // Almost always a stale/mismatched session — e.g. logged in as a
        // different role earlier and the old token never got replaced.
        throw new Error('Your session isn\u2019t recognized as a student account. Please log out and log back in as a student, then try again.');
      }
      if (!res.ok && res.status !== 409) throw new Error(json.message || 'Failed to submit quiz');
      setResult(json.data);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [activeQuiz, answers, submitting, result]);

  // Countdown timer — auto-submits when time runs out
  useEffect(() => {
    if (!activeQuiz || result || secondsLeft === null) return;
    if (secondsLeft <= 0) { submitQuiz(); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [activeQuiz, result, secondsLeft, submitQuiz]);

  const fmtTime = (s) => {
    if (s === null) return '—';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // ── List view ────────────────────────────────────────────────────────────
  if (!activeQuiz) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Quizzes</div>
          <div className="page-sub">Quizzes your trainers have published for your enrolled courses</div>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>⏳ Loading quizzes…</div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            ⚠️ {error} —{' '}
            <button onClick={refetch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--sa-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>❓</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No quizzes yet</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Your trainer hasn't published a quiz for your enrolled courses yet.</div>
          </div>
        )}

        {!loading && !error && quizzes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quizzes.map((q) => {
              const attempt = q.myAttempt;
              const totalMarks = (q.questions || []).reduce((s, qq) => s + (Number(qq.marks) || 0), 0);
              return (
                <div key={q.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0, fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: attempt ? (attempt.passed ? '#DCFCE7' : '#FEE2E2') : 'var(--sa-surface)',
                    border: '1px solid var(--sa-border)',
                  }}>
                    {attempt ? (attempt.passed ? '✅' : '❌') : '❓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 2 }}>{q.course}</div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--sa-muted)', flexWrap: 'wrap', marginTop: 6 }}>
                      <span>❓ {(q.questions || []).length} questions</span>
                      <span>🏆 {totalMarks} marks</span>
                      <span>⏱️ {q.time_limit_minutes} min</span>
                      <span>🎯 Pass {q.pass_mark}%</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {attempt ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: attempt.passed ? '#15803d' : '#b91c1c' }}>
                          {attempt.score}/{attempt.total_marks} ({attempt.percentage}%)
                        </div>
                        <button className="action-btn" style={{ fontSize: 12, marginTop: 4 }} onClick={() => startQuiz(q)}>View Result</button>
                      </div>
                    ) : (
                      <button className="action-btn accent" style={{ fontSize: 12 }} onClick={() => startQuiz(q)}>▶ Start Quiz</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Result view (already attempted, or just submitted) ────────────────
  if (result) {
    const questions = activeQuiz.questions || [];
    return (
      <div>
        <div className="page-header">
          <div className="page-title">{activeQuiz.title}</div>
          <div className="page-sub">{activeQuiz.course}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{result.passed ? '🎉' : '📋'}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{result.score} / {result.total_marks} marks</div>
          <div style={{ fontSize: 14, color: 'var(--sa-muted)', marginTop: 4 }}>{result.percentage}% · Pass mark {activeQuiz.pass_mark}%</div>
          <div style={{ marginTop: 10 }}>
            <span className={`status-pill ${result.passed ? 'status-active' : 'status-pending'}`}>
              {result.passed ? '✅ Passed' : '❌ Did not pass'}
            </span>
          </div>
        </div>

        {Array.isArray(result.answers) && questions.length > 0 && questions[0]?.correct !== undefined && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Review Answers</div>
            {questions.map((q, i) => {
              const given = result.answers[i];
              const isCorrect = given !== null && given !== undefined && Number(given) === Number(q.correct);
              return (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < questions.length - 1 ? '1px solid var(--sa-border)' : 'none' }}>
                  <div className="quiz-q" style={{ marginBottom: 8 }}>Q{i + 1}. {q.text}</div>
                  {q.options.map((opt, oIdx) => {
                    let cls = '';
                    if (oIdx === q.correct) cls = 'selected';
                    else if (oIdx === given) cls = 'wrong';
                    return (
                      <div key={oIdx} className={`quiz-option ${cls}`} style={{ cursor: 'default' }}>
                        <div className={`radio-dot ${oIdx === given ? 'filled' : ''}`} />
                        {opt}
                        {oIdx === q.correct && <span style={{ marginLeft: 8, fontSize: 11, color: '#3B6D11' }}>✓ Correct answer</span>}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: isCorrect ? '#3B6D11' : '#b91c1c', marginTop: 4 }}>
                    {isCorrect ? '✓ You got this right' : given === null || given === undefined ? '— Not answered' : '✗ Incorrect'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="action-btn" onClick={backToList}>← Back to Quizzes</button>
        </div>
      </div>
    );
  }

  // ── Taking view ─────────────────────────────────────────────────────────
  const questions = activeQuiz.questions || [];
  const question  = questions[qIndex];
  const progressPct = questions.length ? Math.round(((qIndex + 1) / questions.length) * 100) : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Quiz: {activeQuiz.title}</div>
        <div className="page-sub">Question {qIndex + 1} of {questions.length} · ⏱️ {fmtTime(secondsLeft)} remaining</div>
      </div>

      {submitError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {submitError}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="progress-bar" style={{ flex: 1, height: 6, marginRight: 12 }}>
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{qIndex + 1}/{questions.length}</span>
        </div>

        {question && (
          <>
            <div className="quiz-q">{question.text}</div>
            {question.options.map((opt, i) => {
              const selected = answers[qIndex] === i;
              return (
                <div key={i} className={`quiz-option ${selected ? 'selected' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [qIndex]: i }))}>
                  <div className={`radio-dot ${selected ? 'filled' : ''}`} />
                  {opt}
                </div>
              );
            })}
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <button className="action-btn" onClick={() => setQIndex((i) => Math.max(0, i - 1))} disabled={qIndex === 0}>← Previous</button>
          <span style={{ fontSize: 11, color: 'var(--sa-muted)' }}>{answeredCount}/{questions.length} answered</span>
          {qIndex < questions.length - 1 ? (
            <button className="action-btn accent" onClick={() => setQIndex((i) => Math.min(questions.length - 1, i + 1))}>
              Next →
            </button>
          ) : (
            <button className="action-btn accent" onClick={submitQuiz} disabled={submitting}>
              {submitting ? '⏳ Submitting…' : '✓ Submit Quiz'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="action-btn" style={{ fontSize: 12 }} onClick={backToList}>← Exit without submitting</button>
      </div>
    </div>
  );
}

export function CertificatesPage({ userName }) {
  return (
    <div>
      <div className="page-header"><div className="page-title">My Certificates</div></div>
      <div className="cert-card">
        <div className="cert-top">Certificate of Completion</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 4 }}>This certifies that</div>
        <div className="cert-name">{userName || 'Arjun Sharma'}</div>
        <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 4 }}>has successfully completed</div>
        <div className="cert-course">UI/UX Design Masterclass</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--sa-muted)' }}>Instructor: Ananya Krishnan</span>
        </div>
        <div className="cert-issued">Issued on: January 8, 2026</div>
        <div className="cert-id">CERT-SWVL-2026-78432</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="action-btn">⬇ Download PDF</button>
          <button className="action-btn">↗ Share</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title">Pending Certificates</div>
        {courses.filter((c) => c.progress > 0 && c.progress < 100).map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className={`course-thumb ${c.thumb}`} style={{ width: 36, height: 36, borderRadius: 6, fontSize: 16, flexShrink: 0 }}>
              {thumbEmoji[c.thumb]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sa-text)' }}>{c.title}</div>
              <div className="progress-bar" style={{ marginTop: 4 }}><div className="progress-fill" style={{ width: `${c.progress}%` }} /></div>
              <div className="progress-label">{c.progress}% — complete to earn certificate</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE CLASSES PAGE (Student view)
// Fetches live classes from the backend. The API automatically filters
// to only classes for courses this student is enrolled in.
// ════════════════════════════════════════════════════════════════════════════
const LIVE_STATUS_META = {
  scheduled: { label: 'Scheduled',   bg: '#E6F1FB', color: '#0C447C' },
  live:      { label: '🔴 Live Now', bg: '#DCFCE7', color: '#14532D' },
  completed: { label: 'Completed',   bg: '#EAF3DE', color: '#3B6D11' },
  cancelled: { label: 'Cancelled',   bg: '#FCEBEB', color: '#A32D2D' },
};

const LIVE_PLATFORM_EMOJI = { 'Zoom': '📹', 'Google Meet': '📅', 'Microsoft Teams': '🟦', 'Jitsi Meet': '🔗', 'Custom Link': '🔗' };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// Recompute status from wall-clock time so live/scheduled/completed stay accurate.
function computeLiveStatus(cls) {
  if (cls.status === 'cancelled' || cls.manually_ended) return cls;
  try {
    const now   = new Date();
    const start = new Date(`${cls.date}T${cls.time}`);
    const end   = new Date(start.getTime() + (Number(cls.duration) || 60) * 60_000);
    const auto  = now < start ? 'scheduled' : now <= end ? 'live' : 'completed';
    return { ...cls, status: auto };
  } catch {
    return cls;
  }
}

function useStudentLiveClasses() {
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') ?? '';
      const res   = await fetch(`${API_BASE}/live-classes`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load');
      setClasses(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    // Re-fetch every 30 s so status changes propagate without a page reload
    const poll = setInterval(fetch_, 30_000);
    return () => clearInterval(poll);
  }, [fetch_]);

  return { classes: classes.map(computeLiveStatus), loading, error, refetch: fetch_ };
}

export function StudentLiveClassesPage() {
  const { classes: myClasses, loading, error, refetch } = useStudentLiveClasses();

  const [filterStat, setFilterStat] = useState('all');

  const filtered = myClasses.filter((c) => filterStat === 'all' || c.status === filterStat);

  const liveCount      = myClasses.filter((c) => c.status === 'live').length;
  const scheduledCount = myClasses.filter((c) => c.status === 'scheduled').length;
  const completedCount = myClasses.filter((c) => c.status === 'completed').length;
  const uniqueCourses  = new Set(myClasses.map((c) => c.course)).size;

  const StatusBadge = ({ status }) => {
    const m = LIVE_STATUS_META[status] || LIVE_STATUS_META.scheduled;
    return (
      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
        {m.label}
      </span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Live Classes</div>
        <div className="page-sub">Sessions scheduled by your trainers for your enrolled courses</div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--sa-muted)' }}>⏳ Loading your live classes…</div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: '#fff0f0', border: '1px solid #fca5a5', color: '#b91c1c' }}>
          ⚠️ {error} —{' '}
          <button onClick={refetch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid-4" style={{ marginBottom: 20 }}>
            {[
              ['🔴 Live Now',  liveCount,      liveCount > 0 ? 'join now' : 'none running'],
              ['📅 Scheduled', scheduledCount, 'upcoming'],
              ['✅ Completed', completedCount, ''],
              ['📚 Courses',   uniqueCourses,  'enrolled'],
            ].map(([label, val, sub]) => (
              <div className="metric-card" key={label}>
                <div className="metric-label">{label}</div>
                <div className="metric-value">{val}</div>
                {sub && <div className="metric-sub">{sub}</div>}
              </div>
            ))}
          </div>

          {liveCount > 0 && (
            <div className="live-banner">
              <span className="live-dot" />
              <div style={{ flex: 1 }}>
                <div className="live-banner-title">
                  {liveCount} Class{liveCount > 1 ? 'es' : ''} Live Right Now
                </div>
                <div className="live-banner-sub">
                  {myClasses.filter((c) => c.status === 'live').map((c) => c.title).join(' · ')}
                </div>
              </div>
              <button className="action-btn" style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none' }} onClick={() => setFilterStat('live')}>
                View Live →
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
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
                {lbl} ({myClasses.filter((c) => key === 'all' ? true : c.status === key).length})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--sa-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No live classes found</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Your trainer hasn't scheduled any sessions matching this filter yet.</div>
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
                    <div style={{
                      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                      background: cls.status === 'live' ? '#DCFCE7' : 'var(--sa-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      border: `1px solid ${cls.status === 'live' ? '#86efac' : 'var(--sa-border)'}`,
                    }}>
                      {LIVE_PLATFORM_EMOJI[cls.platform] || '🔗'}
                    </div>

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
                        <span>👤 {cls.host}</span>
                      </div>
                      {cls.description && (
                        <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginTop: 6, lineHeight: 1.5 }}>{cls.description}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {cls.status === 'live' && (
                        <a
                          href={cls.link} target="_blank" rel="noreferrer"
                          className="action-btn"
                          style={{ fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', textDecoration: 'none', textAlign: 'center' }}
                        >
                          🔴 Join Now
                        </a>
                      )}
                      {cls.status === 'scheduled' && (
                        <a
                          href={cls.link} target="_blank" rel="noreferrer"
                          className="action-btn"
                          style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center' }}
                        >
                          🔗 Open Link
                        </a>
                      )}
                      {cls.status === 'completed' && (
                        <span style={{ fontSize: 11, color: 'var(--sa-muted)', textAlign: 'center' }}>Session ended</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div>
      <div className="page-header"><div className="page-title">Notifications</div></div>
      <div className="card">
        {notifs.map((n, i) => <NotifItem key={i} notif={n} />)}
      </div>
    </div>
  );
}