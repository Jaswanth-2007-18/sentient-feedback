import React, { useState, useEffect } from 'react';
import { clearSession, getUserFeedbacks, saveUserFeedback, saveSharedFeedback } from '../utils/storage.js';
import { AVATAR_COLORS } from '../utils/mockData.js';

function timeAgo(iso) {
  if (!iso) return 'Unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function Stars({ rating }) {
  return <>{Array.from({length:5},(_,i)=><span key={i} style={{color:i<rating?'#fbbf24':'#334155'}}>★</span>)}</>;
}

export default function UserApp({ session, onLogout }) {
  const [page, setPage]           = useState('home');
  const [feedbacks, setFeedbacks] = useState([]);
  const [sidebarOpen, setSidebar] = useState(false);
  const [toast, setToast]         = useState({ msg:'', type:'', vis:false });
  const [rating, setRating]       = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [searchQ, setSearchQ]     = useState('');
  const [statusFil, setStatusFil] = useState('');

  // Form
  const [fUsername, setFUsername] = useState(session.username || session.fname || '');
  const [fSubject, setFSubject]   = useState('');
  const [fMessage, setFMessage]   = useState('');
  const [fAnon, setFAnon]         = useState(false);

  const initials = ((session.fname||'U')[0]+(session.lname||'U')[0]).toUpperCase();
  const fullName = `${session.fname||''} ${session.lname||''}`.trim();

  function showToast(msg, type='info') {
    setToast({ msg, type, vis:true });
    setTimeout(() => setToast(t=>({...t,vis:false})), 3500);
  }

  function logout() { clearSession(); onLogout(); }

  function refresh() {
    const list = getUserFeedbacks(session.id);
    setFeedbacks(list);
  }

  useEffect(() => { refresh(); }, []);

  function showPage(name) { setPage(name); setSidebar(false); if (name==='home'||name==='my-feedbacks'||name==='profile') refresh(); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fSubject.trim()) { showToast('Please enter a product name.','error'); return; }
    if (!fMessage.trim()) { showToast('Please enter your feedback.','error'); return; }

    const displayName = fAnon ? 'Anonymous' : (fUsername.trim() || session.username || session.fname || 'Anonymous');
    const color = AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)];
    const fb = {
      id: `fb-${Date.now()}`,
      userId: session.id,
      name: displayName,
      username: session.username || session.fname,
      initials: displayName.slice(0,2).toUpperCase(),
      subject: fSubject.trim(),
      category: 'Other',
      rating,
      sentiment: rating===0?'Neutral':(rating>=4?'Positive':rating===3?'Neutral':'Negative'),
      status: 'New',
      message: fMessage.trim(),
      avatarColor: color,
      createdAt: new Date().toISOString(),
      daysAgo: 0,
    };
    saveUserFeedback(session.id, fb);
    saveSharedFeedback(fb);
    refresh();
    setFSubject(''); setFMessage(''); setFAnon(false); setRating(0); setFUsername(session.username||session.fname||'');
    showToast('✅ Feedback submitted! Thank you.','success');
    setTimeout(() => showPage('my-feedbacks'), 1800);
  }

  const stats = {
    total: feedbacks.length,
    resolved: feedbacks.filter(f=>f.status==='Resolved'||f.status==='Closed').length,
    pending:  feedbacks.filter(f=>f.status==='New'||f.status==='In Review').length,
    avg: feedbacks.length>0 ? (feedbacks.reduce((s,f)=>s+f.rating,0)/feedbacks.length).toFixed(1) : '—',
  };

  const myFiltered = feedbacks.filter(f => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || f.message.toLowerCase().includes(q) || (f.subject||'').toLowerCase().includes(q);
    const matchS = !statusFil || f.status === statusFil;
    return matchQ && matchS;
  });

  const NAV = [
    { id:'home',          label:'Home',            icon:'🏠' },
    { id:'submit-user',   label:'Submit Feedback', icon:'＋' },
    { id:'my-feedbacks',  label:'My Feedbacks',    icon:'💬', badge: feedbacks.length },
    { id:'profile',       label:'My Profile',      icon:'👤' },
  ];

  return (
    <div className="app-root">
      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <span className="logo-text">Sentient</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n=>(
            <a key={n.id} href="#" className={`nav-item${page===n.id?' active':''}`} onClick={e=>{e.preventDefault();showPage(n.id);}}>
              <span style={{fontSize:'1.1rem'}}>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge!==undefined && <span className="nav-badge">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar-mini">{initials}</div>
          <div className="user-info-mini"><span className="user-name-mini">{fullName}</span><span className="user-role-mini">Regular User</span></div>
          <button className="icon-btn" title="Logout" onClick={logout}>⬡</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={()=>setSidebar(v=>!v)}>☰</button>
            <div className="page-breadcrumb">
              <span className="breadcrumb-root">Sentient</span>
              <span style={{color:'var(--text-muted)',margin:'0 4px'}}>›</span>
              <span>{{home:'Home','submit-user':'Submit Feedback','my-feedbacks':'My Feedbacks','profile':'My Profile'}[page]||page}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-role-chip">👤 User</div>
            <div className="user-avatar" title={fullName}>{initials}</div>
            <button className="btn btn-secondary" onClick={logout} style={{fontSize:'.8rem',padding:'8px 14px'}}>Logout</button>
          </div>
        </header>

        {/* HOME */}
        {page === 'home' && (
          <div className="page active">
            <div className="page-header">
              <div><h1 className="page-title">Welcome back, {session.fname}! 👋</h1><p className="page-subtitle">Here's a summary of your activity on Sentient</p></div>
              <button className="btn btn-primary" onClick={()=>showPage('submit-user')}>＋ Submit Feedback</button>
            </div>
            <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
              {[
                {label:'My Feedbacks', value:stats.total, accent:'#a78bfa'},
                {label:'Resolved', value:stats.resolved, accent:'#34d399'},
                {label:'Pending', value:stats.pending, accent:'#60a5fa'},
                {label:'Avg Rating', value:stats.avg, accent:'#fbbf24'},
              ].map(k=>(
                <div key={k.label} className="kpi-card" style={{'--accent':k.accent}}>
                  <div className="kpi-info">
                    <span className="kpi-label">{k.label}</span>
                    <span className="kpi-value" style={{color:k.accent}}>{k.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="section-header"><h2>Recent Activity</h2><button className="btn btn-ghost" onClick={()=>showPage('my-feedbacks')}>View All →</button></div>
            {feedbacks.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💬</div><p>No feedbacks yet. <strong>Submit your first one!</strong></p></div>
            ) : (
              <div className="user-recent-list">
                {feedbacks.slice(0,3).map(f=>(
                  <div key={f.id} className="recent-fb-item">
                    <div className="rfb-left">
                      <div className="rfb-avatar" style={{background:f.avatarColor}}>{f.initials}</div>
                      <div><div className="rfb-subject"><strong>{f.subject||'Unknown Product'}</strong></div><div className="rfb-meta">{timeAgo(f.createdAt)}</div></div>
                    </div>
                    <div className="rfb-right">
                      <span className={`status-badge ${f.status}`}>{f.status}</span>
                      <div className="rfb-stars"><Stars rating={f.rating}/></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="platform-stats-banner">
              <div className="psb-icon">🌐</div>
              <div><strong>Platform Snapshot</strong><p>3,847 feedbacks · 76% positive · Avg 2.4h response time</p></div>
            </div>
          </div>
        )}

        {/* SUBMIT */}
        {page === 'submit-user' && (
          <div className="page active">
            <div className="page-header"><div><h1 className="page-title">Submit Feedback</h1><p className="page-subtitle">Share your experience — your voice shapes our product</p></div></div>
            <div className="submit-layout">
              <div className="submit-form-card">
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Username <span className="optional">(optional)</span></label>
                      <input className="form-input" type="text" placeholder="your_username" value={fUsername} onChange={e=>setFUsername(e.target.value)} disabled={fAnon} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input className="form-input" type="text" placeholder="Name of the product" value={fSubject} onChange={e=>setFSubject(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group" style={{marginBottom:16}}>
                    <label className="form-label">Overall Rating <span className="optional">(optional)</span></label>
                    <div className="star-input" id="userStarInput">
                      {[1,2,3,4,5].map(v=>(
                        <span key={v} className={`star${(hoverRating||rating)>=v?' active':''}`} data-val={v}
                          style={{cursor:'pointer',fontSize:'1.6rem',color:(hoverRating||rating)>=v?'#fbbf24':'#334155'}}
                          onClick={()=>setRating(v)}
                          onMouseEnter={()=>setHoverRating(v)}
                          onMouseLeave={()=>setHoverRating(0)}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{marginBottom:16}}>
                    <label className="form-label">Your Feedback *</label>
                    <textarea className="form-input" rows={5} placeholder="Describe your experience in detail…" value={fMessage} onChange={e=>setFMessage(e.target.value)} required style={{resize:'vertical'}} />
                  </div>
                  <div className="form-group checkbox-group" style={{marginBottom:20}}>
                    <label className="checkbox-label" style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                      <input type="checkbox" checked={fAnon} onChange={e=>setFAnon(e.target.checked)} />
                      Submit anonymously
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full">📤 Submit Feedback</button>
                </form>
              </div>
              <div className="submit-sidebar">
                <div className="tips-card">
                  <h3>✨ Tips for great feedback</h3>
                  <ul>
                    <li>Be specific about your experience</li>
                    <li>Mention the feature or area affected</li>
                    <li>Include steps to reproduce issues</li>
                    <li>Rate all aspects for best insights</li>
                  </ul>
                </div>
                <div className="stats-mini-card">
                  <h4>Community Stats</h4>
                  <div className="stats-mini-row"><span>Total reviews this month</span><strong>847</strong></div>
                  <div className="stats-mini-row"><span>Avg response time</span><strong>2.4h</strong></div>
                  <div className="stats-mini-row"><span>Resolved this month</span><strong>93%</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY FEEDBACKS */}
        {page === 'my-feedbacks' && (
          <div className="page active">
            <div className="page-header"><div><h1 className="page-title">My Feedbacks</h1><p className="page-subtitle">View and track all your submitted feedbacks</p></div></div>
            <div className="filter-bar">
              <div className="filter-search">🔍 <input type="text" placeholder="Search your feedbacks…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} /></div>
              <select className="filter-select" value={statusFil} onChange={e=>setStatusFil(e.target.value)}>
                <option value="">All Status</option>
                {['New','In Review','Resolved','Closed'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {myFiltered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🔍</div><p>{searchQ||statusFil?'No matching feedbacks found.':'You haven\'t submitted any feedbacks yet.'}</p></div>
            ) : (
              <div className="feedback-list">
                {myFiltered.map(f=>(
                  <div key={f.id} className="feedback-list-item user-fb-item">
                    <div className="fli-avatar" style={{background:f.avatarColor}}>{f.initials}</div>
                    <div className="fli-info">
                      <div className="fli-name">{f.subject||f.message.slice(0,50)} <span className={`status-badge ${f.status}`}>{f.status}</span></div>
                      <div className="fli-email">{timeAgo(f.createdAt)}</div>
                      <div className="fli-message">{f.message}</div>
                    </div>
                    <div className="fli-right">
                      <div className="fli-stars">{f.rating?<Stars rating={f.rating}/>:<span style={{color:'#64748b',fontSize:'0.8rem'}}>No rating</span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {page === 'profile' && (
          <div className="page active">
            <div className="page-header"><div><h1 className="page-title">My Profile</h1><p className="page-subtitle">View and manage your account information</p></div></div>
            <div className="profile-layout">
              <div className="profile-card">
                <div className="profile-avatar-section">
                  <div className="profile-avatar">{initials}</div>
                  <div>
                    <div className="profile-name">{fullName}</div>
                    <div className="profile-email">{session.email}</div>
                    <span className="profile-role-badge user-badge">👤 Regular User</span>
                  </div>
                </div>
                <div className="profile-info-grid">
                  {[['First Name',session.fname||'—'],['Last Name',session.lname||'—'],['Email',session.email||'—'],['Account Type','Regular User'],['Member Since',new Date(session.loginAt||Date.now()).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})],['Total Feedbacks',feedbacks.length]].map(([l,v])=>(
                    <div key={l} className="profile-info-item">
                      <span className="pii-label">{l}</span>
                      <span className="pii-value">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="profile-actions">
                  <button className="btn btn-secondary" onClick={()=>showToast('Profile editing coming soon!','info')}>✏️ Edit Profile</button>
                  <button className="btn btn-secondary" onClick={logout}>🚪 Sign Out</button>
                </div>
              </div>
              <div className="profile-sidebar">
                <div className="chart-card">
                  <div className="chart-header"><h3>My Feedback Breakdown</h3></div>
                  {feedbacks.length === 0 ? (
                    <p style={{color:'var(--text-muted)',fontSize:'.85rem',textAlign:'center',padding:16}}>No feedbacks submitted yet.</p>
                  ) : (
                    <div className="profile-stats-list">
                      {Object.entries(feedbacks.reduce((acc,f)=>{ const s=f.sentiment||'Unknown'; acc[s]=(acc[s]||0)+1; return acc; }, {})).map(([sent,count])=>(
                        <div key={sent} className="profile-stat-row">
                          <span className="tag">{sent}</span>
                          <span style={{color:'var(--text)',fontWeight:700}}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-header"><h3>Activity Tips</h3></div>
                  <div className="activity-tips">
                    {[['🏆','Submit feedbacks regularly to help improve the product'],['⭐','Always include a rating to make your feedback more impactful'],['💡','Use product names to help categorize your feedback better']].map(([icon,tip])=>(
                      <div key={tip} className="activity-tip"><span>{icon}</span><span>{tip}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast.vis && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
