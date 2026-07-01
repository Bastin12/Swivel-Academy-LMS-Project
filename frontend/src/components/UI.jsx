import { thumbEmoji } from '../data/data';

export function CourseCard({ course, showProgress, onOpen }) {
  return (
    <div className="course-card" onClick={() => onOpen(course)}>
      <div className={`course-thumb ${course.thumb}`}>{thumbEmoji[course.thumb]}</div>
      <div className="course-body">
        {course.tag && <span className="course-badge">{course.tag}</span>}
        <div className="course-title">{course.title}</div>
        <div className="course-trainer">{course.trainer}</div>
        {showProgress && course.progress > 0 && (
          <div className="course-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${course.progress}%` }} />
            </div>
            <div className="progress-label">{course.progress}% complete</div>
          </div>
        )}
        <div className="course-meta">
          <span className="course-price">{course.price}</span>
          <span className="stars">★ {course.rating}</span>
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, height = 3 }) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Avatar({ initials, av, size = 30, fontSize = 12 }) {
  return (
    <div className={`avatar ${av}`} style={{ width: size, height: size, fontSize }}>
      {initials}
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}

export function NotifItem({ notif }) {
  return (
    <div className="notif-item">
      <div className="notif-dot" style={{ background: notif.color, opacity: notif.unread ? 1 : 0.4 }} />
      <div className="notif-body">
        <div className="notif-title">{notif.title}</div>
        <div className="notif-sub">{notif.sub}</div>
      </div>
      <div className="notif-time">{notif.time}</div>
    </div>
  );
}
