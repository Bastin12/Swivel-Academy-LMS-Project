import { useState, useEffect, useCallback } from 'react';
import { loginDefs } from '../data/data';

// ─── Hash-based URL sync ──────────────────────────────────────────────────────
// We encode the current page as a URL hash so that a browser refresh restores
// exactly the same content page without touching the Navbar or Sidebar at all.
// Format:  #/page-key          e.g.  #/student-dashboard
//
// Auth state (role + userName) is persisted in sessionStorage so it also
// survives a same-tab refresh (but is cleared when the browser tab closes,
// matching the existing JWT-in-localStorage pattern).
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_FROM_HASH = () => {
  const hash = window.location.hash; // e.g. "#/student-dashboard"
  if (!hash || hash === '#/' || hash === '#') return null;
  return hash.replace(/^#\//, '') || null;
};

const SET_HASH = (page) => {
  const next = page ? `#/${page}` : '#/';
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next);
  }
};

const SESSION_KEY = 'sa_auth'; // sessionStorage key for auth state

const loadAuth = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { role: null, userName: '' };
    return JSON.parse(raw);
  } catch {
    return { role: null, userName: '' };
  }
};

const saveAuth = (role, userName) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, userName }));
  } catch {}
};

const clearAuth = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
};

// ─── Default page per role ───────────────────────────────────────────────────
const DEFAULT_PAGE = {
  student: 'student-dashboard',
  trainer: 'trainer-dashboard',
  admin:   'admin-dashboard',
};

const PUBLIC_PAGES = new Set(['home', 'courses', 'trainers', 'about', 'courseDetail']);

// Pages each role is allowed to land on. Shared pages (like notifications)
// are listed under every role that can see them in their Sidebar.
// This mirrors components/Sidebar.jsx's sidebarConfig — if you add a page
// there, add it here too so role-based routing stays correct.
const ROLE_PAGES = {
  student: new Set(['student-dashboard', 'student-live', 'student-mycourses', 'student-quiz', 'student-certificates', 'student-notifications']),
  trainer: new Set(['trainer-dashboard', 'trainer-content', 'trainer-quiz', 'trainer-attendance', 'trainer-live', 'trainer-assignments', 'trainer-notifications', 'student-notifications']),
  admin:   new Set(['admin-dashboard', 'admin-users', 'admin-courses', 'admin-trainers', 'admin-analytics', 'admin-settings', 'student-notifications']),
};

// Is `page` something this role is actually allowed to view?
// Public pages are always fine (e.g. browsing courses while logged in).
// This is what stops a stale/leftover URL hash from a previous role's
// session (or a different role's browser tab) from landing the CURRENT
// user on a page their role can't use — which is what produces
// "Role 'X' is not authorized" errors deeper in the app (e.g. an admin
// token reaching the student-only quiz-submit endpoint).
function isPageAllowed(role, page) {
  if (PUBLIC_PAGES.has(page)) return true;
  if (!role) return false;
  return ROLE_PAGES[role]?.has(page) ?? false;
}

export function useAppState() {
  // Restore auth from sessionStorage on mount
  const savedAuth = loadAuth();

  // Determine initial page:
  //  1. If there's a valid hash in the URL AND the logged-in role is
  //     actually allowed to view it, use it
  //  2. Else if the user is logged in, use their default dashboard
  //  3. Else use 'home'
  const hashPage = PAGE_FROM_HASH();
  const initialPage = (hashPage && isPageAllowed(savedAuth.role, hashPage))
    ? hashPage
    : (savedAuth.role ? DEFAULT_PAGE[savedAuth.role] || 'home' : 'home');

  const [state, setState] = useState({
    role:           savedAuth.role,
    userName:       savedAuth.userName,
    page:           initialPage,
    activeTab:      0,
    showModal:      false,
    courseView:     null,
    activeFilter:   'All',
    loginModalOpen: false,
  });

  // Keep URL hash in sync whenever page changes
  useEffect(() => {
    SET_HASH(state.page);
  }, [state.page]);

  // Listen for browser back/forward navigation (popstate fires on hash change
  // when the user presses ← / → or manually edits the URL)
  useEffect(() => {
    const onPop = () => {
      const p = PAGE_FROM_HASH();
      if (p) {
        setState((s) => ({
          ...s,
          page: isPageAllowed(s.role, p) ? p : (DEFAULT_PAGE[s.role] || 'home'),
          activeTab: 0,
        }));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback(
    (patch) => setState((s) => ({ ...s, ...patch })),
    []
  );

  const navigate = useCallback(
    (page) => update({ page, activeTab: 0, showModal: false }),
    [update]
  );

  const goPublic = useCallback(
    (page) => update({ page, showModal: false }),
    [update]
  );

  // Accepts a user object from the DB: { id, name, email, role }
  // or a legacy string role for backwards compatibility
  const login = useCallback((userOrRole) => {
    let role, userName;

    if (typeof userOrRole === 'string') {
      role = userOrRole;
      const def = loginDefs[role];
      userName = def?.name || role;
    } else {
      role = userOrRole.role;
      userName = userOrRole.name;
    }

    saveAuth(role, userName);

    setState((s) => ({
      ...s,
      role,
      userName,
      page:           DEFAULT_PAGE[role] || 'home',
      showModal:      false,
      loginModalOpen: false,
    }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    clearAuth();
    update({ role: null, userName: '', page: 'home', loginModalOpen: false });
  }, [update]);

  const showLogin      = useCallback(() => update({ loginModalOpen: true }),  [update]);
  const closeLoginModal= useCallback(() => update({ loginModalOpen: false }), [update]);
  const openCourse     = useCallback((course) => update({ courseView: course, page: 'courseDetail' }), [update]);
  const setFilter      = useCallback((f) => update({ activeFilter: f }), [update]);
  const setTab         = useCallback((i) => update({ activeTab: i }), [update]);
  const setShowModal   = useCallback((v) => update({ showModal: v }), [update]);

  return {
    state,
    navigate,
    goPublic,
    login,
    logout,
    showLogin,
    closeLoginModal,
    openCourse,
    setFilter,
    setTab,
    setShowModal,
  };
}
