import React, { useState, useEffect } from 'react';
import { getUsers, saveUser, setSession, updateUserPassword } from '../utils/storage.js';

export default function AuthPage({ onLogin }) {
  const [tab, setTab]           = useState('login');
  const [toast, setToast]       = useState({ msg: '', type: '' });
  const [toastVis, setToastVis] = useState(false);

  // Login state
  const [loginUser, setLoginUser]     = useState('');
  const [loginPass, setLoginPass]     = useState('');
  const [loginErr, setLoginErr]       = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [rememberMe, setRememberMe]   = useState(false);

  // Signup state
  const [signupFname, setSignupFname]   = useState('');
  const [signupLname, setSignupLname]   = useState('');
  const [signupUser, setSignupUser]     = useState('');
  const [signupEmail, setSignupEmail]   = useState('');
  const [signupPass, setSignupPass]     = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupTerms, setSignupTerms]   = useState(false);
  const [signupErr, setSignupErr]       = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [pwdStrength, setPwdStrength]   = useState({ w:'0%', bg:'', label:'Enter a password', color:'' });

  // Forgot state
  const [forgotStep, setForgotStep]     = useState(1);
  const [forgotUser, setForgotUser]     = useState('');
  const [forgotNewPwd, setForgotNewPwd] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotErr, setForgotErr]       = useState('');

  function showToast(msg, type) {
    setToast({ msg, type });
    setToastVis(true);
    setTimeout(() => setToastVis(false), 3500);
  }

  function calcStrength(pwd) {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { w:'0%', bg:'', label:'Enter a password', color:'' },
      { w:'25%', bg:'#f87171', label:'Weak', color:'#f87171' },
      { w:'50%', bg:'#fbbf24', label:'Fair', color:'#fbbf24' },
      { w:'75%', bg:'#60a5fa', label:'Good', color:'#60a5fa' },
      { w:'88%', bg:'#34d399', label:'Strong', color:'#34d399' },
      { w:'100%', bg:'linear-gradient(90deg,#34d399,#22d3ee)', label:'Very Strong', color:'#34d399' },
    ];
    return levels[Math.min(score, 5)];
  }

  function handleLogin(e) {
    e.preventDefault();
    setLoginErr('');
    if (!loginUser.trim() || !loginPass) { setLoginErr('Please enter username and password.'); return; }
    setLoginLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const user  = users.find(u => (u.username === loginUser.trim() || u.email === loginUser.trim()) && u.password === loginPass);
      setLoginLoading(false);
      if (!user) { setLoginErr('❌ Invalid username or password.'); return; }
      const sess = setSession(user);
      showToast(`✅ Welcome back, ${user.fname}!`, 'success');
      setTimeout(() => onLogin(sess), 1200);
    }, 800);
  }

  function fillDemo(type) {
    const creds = { admin: ['admin','admin123'], user: ['user','user1234'] };
    setLoginUser(creds[type][0]);
    setLoginPass(creds[type][1]);
    showToast(`${type === 'admin' ? '🛡️ Admin' : '👤 User'} credentials filled!`, 'success');
  }

  function handleSignup(e) {
    e.preventDefault();
    setSignupErr('');
    let valid = true;
    if (!signupFname.trim()) { valid = false; }
    if (!signupLname.trim()) { valid = false; }
    if (!signupUser.trim())  { valid = false; }
    if (signupPass.length < 6) { valid = false; }
    if (signupPass !== signupConfirm) { valid = false; }
    if (!signupTerms) { valid = false; }
    if (!valid) { setSignupErr('Please fill all required fields correctly.'); return; }

    const users = getUsers();
    if (users.find(u => u.username === signupUser.trim())) {
      setSignupErr('⚠️ Username already taken.'); return;
    }
    setSignupLoading(true);
    setTimeout(() => {
      const newUser = {
        id: `user-${Date.now()}`,
        fname: signupFname.trim(),
        lname: signupLname.trim(),
        username: signupUser.trim(),
        email: signupEmail.trim() || `${signupUser.trim()}@sentient.local`,
        password: signupPass,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      saveUser(newUser);
      const sess = setSession(newUser);
      setSignupLoading(false);
      showToast(`🎉 Account created! Welcome, ${newUser.fname}!`, 'success');
      setTimeout(() => onLogin(sess), 1200);
    }, 900);
  }

  function handleForgotVerify() {
    setForgotErr('');
    const users = getUsers();
    const found = users.find(u => u.username === forgotUser.trim() || u.email === forgotUser.trim());
    if (!found) { setForgotErr('❌ Username not found.'); return; }
    setForgotStep(2);
  }

  function handlePasswordReset() {
    setForgotErr('');
    if (forgotNewPwd.length < 6) { setForgotErr('Password must be at least 6 characters.'); return; }
    if (forgotNewPwd !== forgotConfirm) { setForgotErr('Passwords do not match.'); return; }
    updateUserPassword(forgotUser.trim(), forgotNewPwd);
    showToast('✅ Password reset successfully!', 'success');
    setForgotStep(1);
    setForgotUser(''); setForgotNewPwd(''); setForgotConfirm('');
    setTimeout(() => setTab('login'), 1500);
  }

  return (
    <div className="auth-root">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="auth-wrapper">
        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="brand-name">Sentient</span>
          </div>
          <div className="left-hero">
            <h1>Your feedback<br/><span className="gradient-text">drives everything.</span></h1>
            <p>A premium platform to collect, analyze, and act on customer insights — turning feedback into measurable growth.</p>
          </div>
          <div className="feature-list">
            {[['📊','Real-time Analytics','Visualize sentiment, ratings, and trends'],
              ['🎯','Targeted Surveys','Reach the right audience at the right time'],
              ['⚡','Fast Resolution','Average response time under 2.4 hours']].map(([icon,title,desc]) => (
              <div className="feature-item" key={title}>
                <div className="feature-icon">{icon}</div>
                <div><strong>{title}</strong><span>{desc}</span></div>
              </div>
            ))}
          </div>
          <div className="left-stats">
            {[['3,847','Feedbacks'],['4.7★','Avg Rating'],['76%','Positive']].map(([num,label]) => (
              <React.Fragment key={label}>
                <div className="stat-item">
                  <span className="stat-num">{num}</span>
                  <span className="stat-label">{label}</span>
                </div>
                {label !== 'Positive' && <div className="stat-divider"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-tabs">
              {['login','signup','forgot'].map(t => (
                <button key={t} className={`auth-tab${tab===t?' active':''}`} onClick={() => { setTab(t); setLoginErr(''); setSignupErr(''); setForgotErr(''); setForgotStep(1); }}>
                  {t === 'login' ? 'Sign In' : t === 'signup' ? 'Create Account' : 'Forgot Password'}
                </button>
              ))}
            </div>

            {/* LOGIN */}
            {tab === 'login' && (
              <form className="auth-form active" onSubmit={handleLogin} noValidate>
                <div className="form-header"><h2>Welcome back 👋</h2><p>Sign in to your Sentient account</p></div>
                <div className="form-field">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <input type="text" placeholder="Your username" value={loginUser} onChange={e => setLoginUser(e.target.value)} required />
                  </div>
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input type={showLoginPwd ? 'text' : 'password'} placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
                    <button type="button" className="toggle-password" onClick={() => setShowLoginPwd(v => !v)}>👁</button>
                  </div>
                </div>
                <div className="form-row-flex">
                  <label className="remember-label">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                    <span className="custom-check"></span>
                    Remember me
                  </label>
                  <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setTab('forgot'); }}>Forgot Password?</a>
                </div>
                {loginErr && <div className="form-error visible">{loginErr}</div>}
                <button type="submit" className="btn-auth" disabled={loginLoading}>
                  {loginLoading ? <span className="btn-text">Signing in…</span> : <span className="btn-text">Sign In</span>}
                </button>
                <div className="demo-accounts">
                  <p>Quick demo access:</p>
                  <div className="demo-btns">
                    <button type="button" className="demo-btn admin-demo" onClick={() => fillDemo('admin')}>🛡️ Admin Demo</button>
                    <button type="button" className="demo-btn user-demo" onClick={() => fillDemo('user')}>👤 User Demo</button>
                  </div>
                </div>
              </form>
            )}

            {/* SIGNUP */}
            {tab === 'signup' && (
              <form className="auth-form active" onSubmit={handleSignup} noValidate>
                <div className="form-header"><h2>Join Sentient ✨</h2><p>Create your free account in seconds</p></div>
                <div className="form-row-2">
                  <div className="form-field"><label>First Name</label><div className="input-wrapper"><input type="text" placeholder="Jane" value={signupFname} onChange={e => setSignupFname(e.target.value)} required /></div></div>
                  <div className="form-field"><label>Last Name</label><div className="input-wrapper"><input type="text" placeholder="Smith" value={signupLname} onChange={e => setSignupLname(e.target.value)} required /></div></div>
                </div>
                <div className="form-field"><label>Username</label><div className="input-wrapper"><input type="text" placeholder="jane_smith" value={signupUser} onChange={e => setSignupUser(e.target.value)} required /></div></div>
                <div className="form-field"><label>Email <span className="optional">(optional)</span></label><div className="input-wrapper"><input type="email" placeholder="jane@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} /></div></div>
                <div className="account-type-info">
                  <span>👤</span>
                  <div><div style={{fontSize:'.82rem',fontWeight:600,color:'var(--text)'}}>Account Type: <span style={{color:'#a78bfa'}}>Regular User</span></div><div style={{fontSize:'.74rem',color:'var(--text-muted)'}}>All new registrations are created as Regular Users</div></div>
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input type={showSignupPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={signupPass} onChange={e => { setSignupPass(e.target.value); setPwdStrength(calcStrength(e.target.value)); }} required />
                    <button type="button" className="toggle-password" onClick={() => setShowSignupPwd(v => !v)}>👁</button>
                  </div>
                  <div className="pwd-strength">
                    <div className="strength-bar"><div className="strength-fill" style={{width:pwdStrength.w, background:pwdStrength.bg}}></div></div>
                    <span className="strength-label" style={{color:pwdStrength.color}}>{pwdStrength.label}</span>
                  </div>
                </div>
                <div className="form-field"><label>Confirm Password</label><div className="input-wrapper"><input type="password" placeholder="Repeat password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} required /></div></div>
                <div className="form-field">
                  <label className="remember-label">
                    <input type="checkbox" checked={signupTerms} onChange={e => setSignupTerms(e.target.checked)} required />
                    <span className="custom-check"></span>
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
                {signupErr && <div className="form-error visible">{signupErr}</div>}
                <button type="submit" className="btn-auth" disabled={signupLoading}>{signupLoading ? 'Creating…' : 'Create Account'}</button>
              </form>
            )}

            {/* FORGOT */}
            {tab === 'forgot' && (
              <div className="auth-form active">
                <div className="form-header"><h2>Reset Password 🔑</h2><p>Enter your username, then choose a new password</p></div>
                {forgotStep === 1 ? (
                  <>
                    <div className="form-field"><label>Username</label><div className="input-wrapper"><input type="text" placeholder="Your username" value={forgotUser} onChange={e => setForgotUser(e.target.value)} /></div></div>
                    {forgotErr && <div className="form-error visible">{forgotErr}</div>}
                    <button type="button" className="btn-auth" onClick={handleForgotVerify}>Verify Account</button>
                  </>
                ) : (
                  <>
                    <div style={{background:'rgba(52,211,153,.12)',border:'1px solid rgba(52,211,153,.3)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:'.83rem',color:'#34d399',fontWeight:600}}>✅ Account verified — set your new password below</div>
                    <div className="form-field"><label>New Password</label><div className="input-wrapper"><input type="password" placeholder="Min. 6 characters" value={forgotNewPwd} onChange={e => setForgotNewPwd(e.target.value)} /></div></div>
                    <div className="form-field"><label>Confirm New Password</label><div className="input-wrapper"><input type="password" placeholder="Repeat new password" value={forgotConfirm} onChange={e => setForgotConfirm(e.target.value)} /></div></div>
                    {forgotErr && <div className="form-error visible">{forgotErr}</div>}
                    <button type="button" className="btn-auth" onClick={handlePasswordReset}>Reset Password</button>
                  </>
                )}
                <div style={{marginTop:20,textAlign:'center'}}><a href="#" style={{color:'var(--purple)',fontSize:'0.875rem',textDecoration:'none'}} onClick={e => { e.preventDefault(); setTab('login'); }}>← Back to Sign In</a></div>
              </div>
            )}
          </div>
          <p className="auth-footer-note">Protected by industry-standard encryption · No spam, ever.</p>
        </div>
      </div>

      {toastVis && <div className={`auth-toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
