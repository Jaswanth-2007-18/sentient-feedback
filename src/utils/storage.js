// ============================================================
// SENTIENT – LocalStorage Utilities
// ============================================================

const USERS_KEY   = 'sentient_users';
const SESSION_KEY = 'sentient_session';
const SHARED_KEY  = 'sentient_shared_feedbacks';

// ----- Demo seed accounts -----
const DEMO_USERS = [
  {
    id: 'demo-admin-001',
    fname: 'Alice',
    lname: 'Chen',
    username: 'admin',
    email: 'admin@sentient.io',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-user-001',
    fname: 'Bob',
    lname: 'Martinez',
    username: 'user',
    email: 'user@sentient.io',
    password: 'user1234',
    role: 'user',
    createdAt: new Date().toISOString(),
  },
];

export function seedDemoAccounts() {
  const existing = getUsers();
  let changed = false;
  DEMO_USERS.forEach(demo => {
    if (!existing.find(u => u.username === demo.username)) {
      existing.push(demo);
      changed = true;
    }
  });
  if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(existing));
}

// ----- Users -----
export function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

export function saveUser(user) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function updateUserPassword(username, newPassword) {
  const users = getUsers();
  const idx = users.findIndex(u => u.username === username || u.email === username);
  if (idx === -1) return false;
  users[idx].password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

// ----- Session -----
export function setSession(user) {
  const session = {
    id: user.id,
    fname: user.fname,
    lname: user.lname,
    username: user.username || user.fname,
    email: user.email,
    role: user.role,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ----- Shared feedbacks -----
export function getSharedFeedbacks() {
  try { return JSON.parse(localStorage.getItem(SHARED_KEY) || '[]'); }
  catch { return []; }
}

export function saveSharedFeedback(feedback) {
  const shared = getSharedFeedbacks();
  shared.unshift(feedback);
  localStorage.setItem(SHARED_KEY, JSON.stringify(shared));
}

export function updateFeedbackStatus(id, newStatus) {
  const shared = getSharedFeedbacks();
  const idx = shared.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    shared[idx].status = newStatus;
    localStorage.setItem(SHARED_KEY, JSON.stringify(shared));
  }
}

// ----- User-specific feedbacks -----
export function getUserFeedbacks(userId) {
  try {
    const key      = `sentient_feedbacks_${userId}`;
    const personal = JSON.parse(localStorage.getItem(key) || '[]');
    const shared   = getSharedFeedbacks();
    const myShared = shared.filter(f => String(f.userId) === String(userId));

    const sharedMap = {};
    myShared.forEach(f => { sharedMap[f.id] = f; });

    // Sync admin status updates to personal
    personal.forEach(f => {
      if (sharedMap[f.id]) f.status = sharedMap[f.id].status;
    });

    const personalIds = new Set(personal.map(f => f.id));
    const extra = myShared.filter(f => !personalIds.has(f.id));
    const all = [...personal, ...extra];

    if (extra.length > 0) localStorage.setItem(key, JSON.stringify(all));
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all;
  } catch { return []; }
}

export function saveUserFeedback(userId, feedback) {
  const key  = `sentient_feedbacks_${userId}`;
  const list = getUserFeedbacks(userId);
  list.unshift(feedback);
  localStorage.setItem(key, JSON.stringify(list));
}
