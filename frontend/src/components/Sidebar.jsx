const sidebarConfig = {
  student: [
    { icon: '📊', label: 'Dashboard', page: 'student-dashboard' },
    { icon: '🔴', label: 'Live Class',          page: 'student-live' },
    { icon: '📚', label: 'My Courses', page: 'student-mycourses' },
    { icon: '▶️', label: 'Continue Learning', page: 'courseDetail' },
    { icon: '✏️', label: 'Assignments', page: 'student-mycourses' },
    { icon: '❓', label: 'Quizzes', page: 'student-quiz' },
    { icon: '🏆', label: 'Certificates', page: 'student-certificates' },
    { icon: '🔔', label: 'Notifications', page: 'student-notifications' },
    { icon: '👤', label: 'Profile', page: 'student-dashboard' },
  ],
  trainer: [
    { icon: '📊', label: 'Dashboard', page: 'trainer-dashboard' },
    { icon: '📚', label: 'My Courses', page: 'trainer-content' },
    { icon: '⬆️', label: 'Upload Content', page: 'trainer-content' },
    { icon: '✏️', label: 'Assignments', page: 'trainer-content' },
    { icon: '❓', label: 'Create Quiz', page: 'trainer-quiz' },
    { icon: '📅', label: 'Attendance', page: 'trainer-attendance' },
    { icon: '🔴', label: 'Live Class',          page: 'trainer-live' },
    { icon: '📈', label: 'Student Progress', page: 'trainer-dashboard' },
    { icon: '🔔', label: 'Notifications', page: 'student-notifications' },
  ],
  admin: [
    { icon: '📊', label: 'Dashboard', page: 'admin-dashboard' },
    { icon: '👥', label: 'Users', page: 'admin-users' },
    { icon: '📚', label: 'Courses', page: 'admin-courses' },
    { icon: '👨‍🏫', label: 'Trainers', page: 'admin-trainers' },
    { icon: '📈', label: 'Analytics', page: 'admin-analytics' },
    { icon: '🔔', label: 'Notifications', page: 'student-notifications' },
    { icon: '⚙️', label: 'Settings', page: 'admin-settings' },
  ],
};

export default function Sidebar({ role, page, navigate }) {
  const items = sidebarConfig[role] || [];

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">{role} menu</div>
        {items.map((item) => (
          <button
            key={item.label}
            className={`sidebar-item ${page === item.page ? 'active' : ''}`}
            onClick={() => navigate(item.page)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}