export default function Navbar({ state, goPublic, showLogin, logout }) {
  const { role, userName, page } = state;

  const navLinks = [
    { key: 'home', label: 'Home' },
    { key: 'courses', label: 'Courses' },
    { key: 'trainers', label: 'Trainers' },
    { key: 'about', label: 'About' },
  ];

  const publicPages = ['home', 'courses', 'trainers', 'about'];

  return (
    <div className="nav">
      <div className="nav-logo" onClick={() => goPublic('home')} style={{ cursor: 'pointer' }}>
        🎓 Swivel<span>Academy</span>
      </div>

      <div className="nav-links">
        {navLinks.map((link) => (
          <button
            key={link.key}
            className={`nav-link-btn ${publicPages.includes(page) && page === link.key ? 'active' : ''}`}
            onClick={() => goPublic(link.key)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="nav-right">
        {!role ? (
          <>
            <button className="nav-btn" onClick={showLogin}>Login</button>
           
          </>
        ) : (
          <>
            <span className={`role-badge role-${role}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--sa-text)' }}>{userName}</span>
            <button className="nav-btn" onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}
