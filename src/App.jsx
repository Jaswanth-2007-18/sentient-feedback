import React, { useEffect, useState } from 'react';
import { getSession, seedDemoAccounts } from './utils/storage.js';
import AuthPage   from './pages/AuthPage.jsx';
import AdminApp   from './pages/AdminApp.jsx';
import UserApp    from './pages/UserApp.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedDemoAccounts();
    const s = getSession();
    setSession(s);
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!session) return <AuthPage onLogin={setSession} />;
  if (session.role === 'admin') return <AdminApp session={session} onLogout={() => setSession(null)} />;
  return <UserApp session={session} onLogout={() => setSession(null)} />;
}
