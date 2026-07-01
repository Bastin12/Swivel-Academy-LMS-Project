import { courses } from '../data/data';
import { CourseCard } from '../components/UI';

export function HomePage({ onOpenCourse, onShowLogin, onGoCourses }) {
  return (
    <div>
      <div className="page-header">
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sa-accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            India's Premier Tech Academy
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--sa-text)', lineHeight: 1.2, marginBottom: 8 }}>
            Learn. Build. <span style={{ color: 'var(--sa-accent)' }}>Excel.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sa-muted)', maxWidth: 380, margin: '0 auto 18px' }}>
            Master in-demand tech skills with expert-led video courses, live sessions, and hands-on projects.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="action-btn accent" onClick={onGoCourses}>📚 Explore Courses</button>
            <button className="action-btn" onClick={onShowLogin}>▶️ Watch Free Preview</button>
          </div>
        </div>
      </div>

    

      <div className="section-title">Popular Courses</div>
      <div className="grid-3">
        {courses.slice(0, 3).map((c) => (
          <CourseCard key={c.id} course={c} showProgress={false} onOpen={onOpenCourse} />
        ))}
      </div>

      <div className="card">
        <div className="card-title">Who is this for?</div>
        <div className="grid-3" style={{ marginBottom: 0 }}>
          {[
            { icon: '🎓', title: 'Students', sub: 'Build job-ready tech skills' },
            { icon: '💼', title: 'Professionals', sub: 'Upskill and advance careers' },
            { icon: '🏫', title: 'Freshers', sub: 'Land your first tech job' },
          ].map((item) => (
            <div key={item.title} style={{ textAlign: 'center', padding: 8 }}>
              <div style={{ fontSize: 24 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sa-text)', margin: '6px 0 3px' }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--sa-muted)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoursesPage({ activeFilter, setFilter, onOpenCourse }) {
  const filters = ['All', 'Web Dev', 'Data Science', 'Design', 'DevOps', 'Mobile', 'AI/ML', 'IT Support'];
  const filtered = activeFilter === 'All' ? courses : courses.filter((c) => c.category === activeFilter);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Explore Courses</div>
        <div className="page-sub">Learn from industry experts with hands-on projects</div>
      </div>
      <div className="search-bar">
        <span>🔍</span>
        <input placeholder="Search courses, skills, trainers..." readOnly />
      </div>
      <div className="filter-chips">
        {filters.map((f) => (
          <button key={f} className={`chip ${activeFilter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid-3">
        {filtered.map((c) => (
          <CourseCard key={c.id} course={c} showProgress={false} onOpen={onOpenCourse} />
        ))}
      </div>
    </div>
  );
}

export function TrainersPage() {
  const trainers = [
    { name: 'Pandeeswaran', role: 'Full Stack Lead', courses: 8, students: 2100, av: 'av-a', initials: 'P' },
    { name: 'Antony', role: 'Data Scientist', courses: 5, students: 1400, av: 'av-b', initials: 'A' },
    { name: 'Ajith', role: 'UI/UX Expert', courses: 6, students: 980, av: 'av-c', initials: 'AK' },
    { name: 'Sridhar', role: 'DevOps Architect', courses: 4, students: 620, av: 'av-d', initials: 'S' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Meet Our Trainers</div>
        <div className="page-sub">Industry experts with real-world experience</div>
      </div>
      <div className="grid-2">
        {trainers.map((t) => (
          <div key={t.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className={`avatar ${t.av}`} style={{ width: 48, height: 48, fontSize: 16 }}>{t.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sa-text)' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--sa-muted)', marginBottom: 6 }}>{t.role}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--sa-muted)' }}><b style={{ color: 'var(--sa-text)' }}>{t.courses}</b> courses</span>
                <span style={{ fontSize: 11, color: 'var(--sa-muted)' }}><b style={{ color: 'var(--sa-text)' }}>{t.students.toLocaleString()}</b> students</span>
              </div>
            </div>
            <button className="action-btn" style={{ fontSize: 11 }}>View Profile</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">About Swivel Academy</div>
      </div>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--sa-text)', lineHeight: 1.8, marginBottom: 14 }}>
          Swivel Academy is an advanced learning management platform built for the next generation of tech professionals in India. We offer structured video courses, live interactive sessions, and NET Process Training across the most in-demand domains.
        </div>
        <div className="grid-3" style={{ marginBottom: 0 }}>
          {[['Founded', '2022'], ['City', 'Chennai'], ['Placement Rate', '94%']].map(([label, value]) => (
            <div className="metric-card" key={label}>
              <div className="metric-label">{label}</div>
              <div className="metric-value">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
