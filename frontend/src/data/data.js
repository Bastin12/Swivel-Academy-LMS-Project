export const courses = [
  { id: 1, title: 'Full Stack Web Development', trainer: 'Pandeeswaran', rating: 4.8, students: 1240, thumb: 'web', tag: 'Bestseller', progress: 72, lessons: 42, free: 6, category: 'Web Dev' },
  { id: 2, title: 'Data Science & Machine Learning', trainer: 'Antony', rating: 4.9, students: 890, thumb: 'data', tag: 'New', progress: 0, lessons: 56, free: 8, category: 'Data Science' },
  { id: 3, title: 'UI/UX Design Masterclass', trainer: 'Ajith', rating: 4.7, students: 675, thumb: 'design', tag: 'Hot', progress: 45, lessons: 38, free: 5, category: 'Design' },
  { id: 4, title: 'DevOps & Cloud Engineering', trainer: 'Sridhar', rating: 4.6, students: 420, thumb: 'devops', tag: '', progress: 0, lessons: 48, free: 4, category: 'DevOps' },
  { id: 5, title: 'React Native Mobile Dev', trainer: 'Yokesh', rating: 4.7, students: 310, thumb: 'mobile', tag: '', progress: 20, lessons: 36, free: 5, category: 'Mobile' },
  { id: 6, title: 'AI & Deep Learning', trainer: 'Hari', rating: 4.9, students: 520, thumb: 'ai', tag: 'Premium', progress: 0, lessons: 60, free: 6, category: 'AI/ML' },
  { id: 7, title: 'Digital Marketing with AI', trainer: 'Hari', rating: 4.9, students: 520, thumb: 'digital', tag: 'Premium', progress: 0, lessons: 60, free: 6, category: 'AI/ML' },
  { id: 8, title: 'Technical Support', trainer: 'Hari', rating: 4.9, students: 520, thumb: 'tech', tag: 'Premium', progress: 0, lessons: 60, free: 6, category: 'IT Support' },
];

export const lessonList = [
  { title: 'Introduction & Setup', dur: '12:30', free: true, done: true },
  { title: 'Core Concepts Overview', dur: '18:45', free: true, done: true },
  { title: 'Your First Project', dur: '22:10', free: true, done: false },
  { title: 'Advanced Techniques — Part 1', dur: '31:20', free: false, done: false },
  { title: 'Advanced Techniques — Part 2', dur: '28:55', free: false, done: false },
  { title: 'Real-World Application', dur: '35:40', free: false, done: false },
  { title: 'Testing & Debugging', dur: '20:15', free: false, done: false },
  { title: 'Deployment & Best Practices', dur: '25:30', free: false, done: false },
];

export const students = [
  { name: 'Bastin', email: 'arjun@email.com', course: 'Full Stack Web Dev', progress: 72, status: 'active', av: 'av-a', initials: 'B' },
  { name: 'Preethi Nair', email: 'preethi@email.com', course: 'Data Science & ML', progress: 45, status: 'active', av: 'av-b', initials: 'PN' },
  { name: 'Kiran Kumar', email: 'kiran@email.com', course: 'UI/UX Design', progress: 90, status: 'completed', av: 'av-c', initials: 'KK' },
  { name: 'Divya Menon', email: 'divya@email.com', course: 'Full Stack Web Dev', progress: 30, status: 'active', av: 'av-d', initials: 'DM' },
  { name: 'Rohit Verma', email: 'rohit@email.com', course: 'DevOps & Cloud', progress: 10, status: 'pending', av: 'av-a', initials: 'RV' },
];

export const notifs = [
  { title: 'Assignment deadline tomorrow', sub: 'React Hooks assignment due Jan 15', time: '2h ago', color: 'var(--sa-accent)', unread: true },
  { title: 'New lesson uploaded', sub: 'Module 4: State Management is now live', time: '5h ago', color: 'var(--sa-teal)', unread: true },
  { title: 'Quiz result available', sub: 'You scored 87% on CSS Flexbox quiz', time: '1d ago', color: 'var(--sa-gold)', unread: false },
  { title: 'Certificate ready', sub: 'UI Fundamentals certificate is ready', time: '2d ago', color: '#185fa5', unread: false },
];

export const thumbEmoji = { web: '💻', data: '📊', design: '🎨', devops: '☁️', mobile: '📱', ai: '🤖', digital: '📈', tech: '🛠️' };

export const loginDefs = {
  student: { name: 'Bastin', badge: 'role-student', label: 'Student' },
  trainer: { name: 'Pandeeswaran', badge: 'role-trainer', label: 'Trainer' },
  admin: { name: 'Admin User', badge: 'role-admin', label: 'Admin' },
};
