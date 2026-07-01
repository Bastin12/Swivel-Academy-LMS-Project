import { courses, lessonList } from '../data/data';

export default function CourseDetailPage({ courseView, role, onBack, onShowLogin, onShowLockedModal }) {
  const c = courseView || courses[0];

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 4, alignItems: 'center' }}>
        <button className="action-btn" onClick={onBack}>← Back</button>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sa-text)' }}>{c.title}</div>
      </div>
      <div className="divider" />

      <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
        <div>
          <div className="video-player">
            <div className="video-overlay">
              <div className="play-btn">▶</div>
              <div className="video-label">Lesson 3: Your First Project</div>
            </div>
          </div>

          <div className="section-title">Course Curriculum</div>
          <div>
            {lessonList.map((lesson, i) => (
              <div
                key={i}
                className="lesson-item"
                onClick={() => !lesson.free && !role && onShowLockedModal()}
              >
                <div className="lesson-num">{String(i + 1).padStart(2, '0')}</div>
                <div className={`lesson-icon ${lesson.done ? 'done' : lesson.free ? 'free' : 'locked'}`}>
                  {lesson.done ? '✓' : lesson.free ? '▶' : '🔒'}
                </div>
                <div className="lesson-title">{lesson.title}</div>
                <span className={`lesson-tag ${lesson.free ? 'tag-free' : 'tag-locked'}`}>
                  {lesson.free ? 'Free' : 'Locked'}
                </span>
                <div className="lesson-dur">{lesson.dur}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--sa-text)', marginBottom: 4 }}>{c.price}</div>
            <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 14 }}>One-time enrollment</div>
            <button
              className="action-btn accent"
              style={{ width: '100%', justifyContent: 'center', padding: 10, marginBottom: 8 }}
              onClick={role ? undefined : onShowLogin}
            >
              {role ? 'Continue Learning' : 'Enroll Now'}
            </button>
            <button className="action-btn" style={{ width: '100%', justifyContent: 'center', padding: 9 }}>
              Add to Wishlist
            </button>
            <div className="divider" />
            <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>
              {[
                ['Lessons', c.lessons],
                ['Free lessons', <span style={{ color: 'var(--sa-teal)' }}>{c.free}</span>],
                ['Trainer', c.trainer],
                ['Rating', <span style={{ color: 'var(--sa-gold)' }}>★ {c.rating} ({c.students.toLocaleString()} students)</span>],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{label}</span>
                  <span style={{ color: 'var(--sa-text)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
