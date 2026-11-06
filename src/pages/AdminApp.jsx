import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clearSession, getSharedFeedbacks, saveSharedFeedback, updateFeedbackStatus } from '../utils/storage.js';
import { generateMockFeedbacks, computeStats, getTrendData, AVATAR_COLORS, CATEGORIES, SURVEYS } from '../utils/mockData.js';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

const PER_PAGE = 8;

function loadAllFeedbacks() {
  const mock   = generateMockFeedbacks();
  const mockIds = new Set(mock.map(f => f.id));
  const shared = getSharedFeedbacks().filter(f => !mockIds.has(f.id)).map(f => ({
    ...f,
    daysAgo: Math.max(0, Math.floor((Date.now() - new Date(f.createdAt || f.date || Date.now()).getTime()) / 86400000)),
    avatarColor: f.avatarColor || '#8b5cf6',
    initials: f.initials || (f.username || f.name || 'An').slice(0,2).toUpperCase(),
    name: f.name || f.username || 'Anonymous',
    username: f.username || f.name || 'Anonymous',
    tags: f.tags || [f.category || 'General'],
    status: f.status || 'New',
    sentiment: f.sentiment || (f.rating >= 4 ? 'Positive' : f.rating === 3 ? 'Neutral' : 'Negative'),
  }));
  return [...shared, ...mock];
}

const CHART_OPTS = {
  animation: { duration: 900 },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor:'#181c2e', borderColor:'rgba(255,255,255,.08)', borderWidth:1, titleColor:'#e2e8f0', bodyColor:'#94a3b8', padding:12, cornerRadius:10 },
  },
  scales: {
    x: { grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#64748b', font:{ size:11 } } },
    y: { grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#64748b', font:{ size:11 } } },
  },
};

function Stars({ rating }) {
  return <>{Array.from({length:5},(_,i) => <span key={i} style={{color:i<rating?'#fbbf24':'#334155'}}>★</span>)}</>;
}

export default function AdminApp({ session, onLogout }) {
  const [page, setPage]                 = useState('overview');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [fbPage, setFbPage]             = useState(1);
  const [search, setSearch]             = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy]             = useState('newest');
  const [trendRange, setTrendRange]     = useState('7d');
  const [detail, setDetail]             = useState(null);
  const [surveys, setSurveys]           = useState(SURVEYS);
  const [surveyModal, setSurveyModal]   = useState(false);
  const [newSurvey, setNewSurvey]       = useState({ title:'', desc:'', audience:'All Users', end:'' });
  const [toast, setToast]               = useState({ msg:'', type:'', vis:false });
  const [rating, setRating]             = useState(0);
  const [globalSearch, setGlobalSearch] = useState('');

  // Submit form refs
  const [fSubject, setFSubject]   = useState('');
  const [fCategory, setFCategory] = useState('Product');
  const [fMessage, setFMessage]   = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fAnon, setFAnon]         = useState(false);

  const initials = session ? (session.fname[0] + session.lname[0]).toUpperCase() : 'AD';
  const fullName = session ? `${session.fname} ${session.lname}` : 'Admin';

  function showToast(msg, type='info') {
    setToast({ msg, type, vis:true });
    setTimeout(() => setToast(t => ({...t, vis:false})), 3500);
  }

  function logout() { clearSession(); onLogout(); }

  const refreshFeedbacks = useCallback(() => {
    const all = loadAllFeedbacks();
    setAllFeedbacks(all);
    setFiltered(all);
    setFbPage(1);
  }, []);

  useEffect(() => { refreshFeedbacks(); }, [refreshFeedbacks]);

  useEffect(() => {
    let list = [...allFeedbacks];
    const q  = search.toLowerCase();
    if (q) list = list.filter(f =>
      (f.name||'').toLowerCase().includes(q) ||
      (f.message||'').toLowerCase().includes(q) ||
      (f.subject||'').toLowerCase().includes(q) ||
      (f.username||'').toLowerCase().includes(q)
    );
    if (ratingFilter) list = list.filter(f => f.rating === parseInt(ratingFilter));
    if (statusFilter) list = list.filter(f => f.status === statusFilter);
    if (sortBy === 'newest')  list.sort((a,b) => b.daysAgo - a.daysAgo);
    if (sortBy === 'oldest')  list.sort((a,b) => a.daysAgo - b.daysAgo);
    if (sortBy === 'highest') list.sort((a,b) => b.rating - a.rating);
    if (sortBy === 'lowest')  list.sort((a,b) => a.rating - b.rating);
    setFiltered(list);
    setFbPage(1);
  }, [search, ratingFilter, statusFilter, sortBy, allFeedbacks]);

  function handleGlobalSearch(e) {
    const q = e.target.value;
    setGlobalSearch(q);
    if (q.trim()) { setSearch(q.trim()); showPage('feedbacks'); }
  }

  function showPage(name) {
    setPage(name);
    setSidebarOpen(false);
  }

  function handleChangeStatus(id, newStatus) {
    updateFeedbackStatus(id, newStatus);
    setAllFeedbacks(prev => prev.map(f => String(f.id)===String(id) ? {...f, status:newStatus} : f));
    setDetail(null);
    showToast(`Marked as ${newStatus}`, 'success');
  }

  function handleSubmitFeedback(e) {
    e.preventDefault();
    const username = fAnon ? 'Anonymous' : (fUsername.trim() || session.username || 'Admin');
    const color    = AVATAR_COLORS[allFeedbacks.length % AVATAR_COLORS.length];
    const fb = {
      id: `fb-${Date.now()}`, name: username, initials: username.slice(0,2).toUpperCase(),
      username, subject: fSubject, category: fCategory, rating,
      sentiment: rating === 0 ? 'Unknown' : (rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative'),
      status: 'New', message: fMessage, date: new Date(), createdAt: new Date().toISOString(), daysAgo: 0, avatarColor: color,
    };
    saveSharedFeedback(fb);
    refreshFeedbacks();
    setFSubject(''); setFCategory('Product'); setFMessage(''); setFUsername(''); setFAnon(false); setRating(0);
    showToast('Feedback submitted!', 'success');
    setTimeout(() => showPage('overview'), 1800);
  }

  function createSurvey() {
    if (!newSurvey.title.trim()) { showToast('Please enter a survey title', 'error'); return; }
    setSurveys(prev => [{ id: prev.length+1, title: newSurvey.title, description: newSurvey.desc || 'No description.', status:'Draft', audience: newSurvey.audience, responses:0, target:200, endDate: newSurvey.end||'Not set' }, ...prev]);
    setSurveyModal(false);
    setNewSurvey({ title:'', desc:'', audience:'All Users', end:'' });
    showToast('Survey created!', 'success');
  }

  function exportCSV() {
    const headers = ['ID','Name','Category','Rating','Status','Sentiment','Message'];
    const rows = allFeedbacks.map(f => [f.id, f.name, f.category, f.rating, f.status, f.sentiment, `"${(f.message||'').replace(/"/g,'""')}"`]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = 'sentient_feedbacks.csv'; a.click();
    showToast('CSV exported!', 'success');
  }

  const stats = computeStats(allFeedbacks);
  const { labels: trendLabels, data: trendData } = getTrendData(trendRange, stats.dayMap);

  const trendChartData = {
    labels: trendLabels,
    datasets: [
      { label:'Feedbacks', data: trendData, borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,.2)', fill:true, tension:.45, pointBackgroundColor:'#8b5cf6', pointRadius:4, pointHoverRadius:7 },
      { label:'Resolved', data: trendData.map(d=>Math.round(d*.75)), borderColor:'#34d399', backgroundColor:'transparent', fill:false, tension:.45, borderDash:[5,5], pointRadius:3, pointHoverRadius:6, pointBackgroundColor:'#34d399' },
    ],
  };

  const sentChartData = {
    labels: ['Positive','Neutral','Negative'],
    datasets: [{ data:[stats.sentMap.Positive,stats.sentMap.Neutral,stats.sentMap.Negative], backgroundColor:['#34d399','#fbbf24','#f87171'], borderWidth:0, hoverOffset:8 }],
  };

  const ratingDist = stats.ratingDist;
  const rTotal = ratingDist.reduce((a,b)=>a+b,0)||1;
  const ratingChartData = {
    labels: ['1★','2★','3★','4★','5★'],
    datasets: [{ data: ratingDist.map(c=>Math.round((c/rTotal)*100)), backgroundColor:['#f87171','#fb923c','#fbbf24','#60a5fa','#34d399'], borderRadius:6, borderSkipped:false }],
  };

  const monthOrder = [];
  const now2 = new Date();
  for (let i=7;i>=0;i--) { const d=new Date(now2.getFullYear(),now2.getMonth()-i,1); monthOrder.push(d.toLocaleString('en-US',{month:'short',year:'2-digit'})); }
  const monthChartData = {
    labels: monthOrder.map(m=>m.split(' ')[0]),
    datasets:[{ label:'Feedbacks', data:monthOrder.map(m=>stats.monthMap[m]||0), backgroundColor:'rgba(139,92,246,.6)', borderRadius:6, hoverBackgroundColor:'#8b5cf6' }],
  };

  const topProds = Object.entries(stats.productMap).sort((a,b)=>b[1].count-a[1].count).slice(0,6);
  const sentStackData = {
    labels: topProds.map(([k])=>k),
    datasets:[
      { label:'Positive', data:topProds.map(([,v])=>v.positive), backgroundColor:'#34d399', borderRadius:4 },
      { label:'Neutral',  data:topProds.map(([,v])=>v.neutral),  backgroundColor:'#fbbf24', borderRadius:4 },
      { label:'Negative', data:topProds.map(([,v])=>v.negative), backgroundColor:'#f87171', borderRadius:4 },
    ],
  };

  const pageItems  = filtered.slice((fbPage-1)*PER_PAGE, fbPage*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const NAV = [
    { id:'overview',  label:'Overview',         icon:'⊞' },
    { id:'feedbacks', label:'Feedbacks',         icon:'💬', badge: allFeedbacks.length },
    { id:'analytics', label:'Analytics',         icon:'📈' },
    { id:'surveys',   label:'Surveys',           icon:'✅' },
    { id:'submit',    label:'Submit Feedback',   icon:'＋' },
  ];

  return (
    <div className="app-root">
      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen?' open':''}`} id="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <span className="logo-text">Sentient</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <a key={n.id} href="#" className={`nav-item${page===n.id?' active':''}`} onClick={e=>{ e.preventDefault(); showPage(n.id); }}>
              <span style={{fontSize:'1.1rem'}}>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge !== undefined && <span className="nav-badge">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar-mini">{initials}</div>
          <div className="user-info-mini">
            <span className="user-name-mini">{fullName}</span>
            <span className="user-role-mini">Administrator</span>
          </div>
          <button className="icon-btn" title="Logout" onClick={logout}>⬡</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(v=>!v)}>☰</button>
            <div className="page-breadcrumb">
              <span className="breadcrumb-root">Sentient</span>
              <span style={{color:'var(--text-muted)',margin:'0 4px'}}>›</span>
              <span>{page.charAt(0).toUpperCase()+page.slice(1)}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              🔍 <input type="text" placeholder="Search feedbacks..." value={globalSearch} onChange={handleGlobalSearch} />
            </div>
            <div className="admin-role-chip">🛡️ Admin</div>
            <div className="user-avatar" title={fullName}>{initials}</div>
          </div>
        </header>

        {/* ───────── OVERVIEW ───────── */}
        {page === 'overview' && (
          <div className="page active">
            <div className="page-header">
              <div><h1 className="page-title">Overview</h1><p className="page-subtitle">Platform feedback at a glance</p></div>
              <button className="btn btn-primary" onClick={() => showPage('submit')}>＋ Submit Feedback</button>
            </div>
            <div className="kpi-grid">
              {[
                { label:'Total Feedbacks', value:stats.total, delta:'+12% this month', accent:'#8b5cf6' },
                { label:'Avg Rating', value:stats.avgRating > 0 ? stats.avgRating.toFixed(1)+'★' : '—', delta:'Based on all feedback', accent:'#fbbf24' },
                { label:'Resolved', value:stats.resolved, delta:`${stats.total>0?Math.round(stats.resolved/stats.total*100):0}% resolution rate`, accent:'#34d399' },
                { label:'Positive', value:`${stats.total>0?Math.round(stats.sentMap.Positive/stats.total*100):0}%`, delta:`${stats.sentMap.Positive} positive feedbacks`, accent:'#22d3ee' },
              ].map(k => (
                <div className="kpi-card" key={k.label} style={{'--accent':k.accent}}>
                  <div className="kpi-info">
                    <span className="kpi-label">{k.label}</span>
                    <span className="kpi-value" style={{color:k.accent}}>{k.value}</span>
                    <span className="kpi-delta positive">{k.delta}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="charts-row">
              <div className="chart-card" style={{flex:2}}>
                <div className="chart-header">
                  <h3>Feedback Trend</h3>
                  <div className="chart-filters">
                    {['7d','30d','90d'].map(r => <button key={r} className={`chip${trendRange===r?' active':''}`} onClick={()=>setTrendRange(r)}>{r}</button>)}
                  </div>
                </div>
                <Line data={trendChartData} options={{...CHART_OPTS, plugins:{...CHART_OPTS.plugins, legend:{display:true,labels:{color:'#94a3b8',boxWidth:12,font:{size:11}}}}}} height={120} />
              </div>
              <div className="chart-card" style={{flex:1}}>
                <div className="chart-header"><h3>Sentiment Split</h3></div>
                <Doughnut data={sentChartData} options={{...CHART_OPTS, cutout:'72%', scales:undefined}} height={160} />
                <div className="legend" style={{marginTop:12}}>
                  {['Positive','Neutral','Negative'].map((l,i)=>(
                    <div key={l} className="legend-item"><span className="legend-dot" style={{background:['#34d399','#fbbf24','#f87171'][i]}}></span><span>{l} {stats.total>0?Math.round([stats.sentMap.Positive,stats.sentMap.Neutral,stats.sentMap.Negative][i]/stats.total*100):0}%</span></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-header"><h2>Recent Feedbacks</h2><button className="btn btn-ghost" onClick={()=>showPage('feedbacks')}>View All →</button></div>
            <div className="feedback-grid">
              {allFeedbacks.slice(0,6).map(f => (
                <div key={f.id} className="feedback-card" onClick={()=>setDetail(f)} style={{cursor:'pointer'}}>
                  <div className="fc-head">
                    <div className="fc-user">
                      <div className="fc-avatar" style={{background:f.avatarColor}}>{f.initials}</div>
                      <div><div className="fc-name">{f.name}</div><div className="fc-time">{f.daysAgo===0?'Today':f.daysAgo===1?'Yesterday':`${f.daysAgo}d ago`}</div></div>
                    </div>
                    <div className="fc-stars"><Stars rating={f.rating}/></div>
                  </div>
                  <p className="fc-message">{f.message}</p>
                  <div className="fc-footer">
                    <span className={`tag ${f.category}`}>{f.category}</span>
                    <span className={`status-badge ${f.status}`}>{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───────── FEEDBACKS ───────── */}
        {page === 'feedbacks' && (
          <div className="page active">
            <div className="page-header">
              <div><h1 className="page-title">Feedbacks</h1><p className="page-subtitle">{allFeedbacks.length} total feedbacks</p></div>
              <button className="btn btn-secondary" onClick={exportCSV}>⬇ Export CSV</button>
            </div>
            <div className="filter-bar">
              <div className="filter-search">🔍 <input type="text" placeholder="Search feedbacks…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
              <select className="filter-select" value={ratingFilter} onChange={e=>setRatingFilter(e.target.value)}>
                <option value="">All Ratings</option>
                {[5,4,3,2,1].map(r=><option key={r} value={r}>{r}★</option>)}
              </select>
              <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {['New','In Review','Resolved','Closed'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select className="filter-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
            <div className="feedback-list">
              {pageItems.length === 0 ? (
                <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
                  <div style={{fontSize:'3rem',marginBottom:12}}>🔍</div>
                  <p style={{fontWeight:600}}>No feedbacks found</p>
                  <p style={{fontSize:'.82rem',marginTop:4}}>Try adjusting your filters</p>
                </div>
              ) : pageItems.map(f => (
                <div key={f.id} className="feedback-list-item" onClick={()=>setDetail(f)} style={{cursor:'pointer'}}>
                  <div className="fli-avatar" style={{background:f.avatarColor||'#8b5cf6'}}>{f.initials}</div>
                  <div className="fli-info">
                    <div className="fli-name">
                      {f.username||f.name}
                      <span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontWeight:'normal',marginLeft:8}}>for <strong>{f.subject||f.category||'Unknown'}</strong></span>
                      <span className={`status-badge ${f.status}`}>{f.status}</span>
                    </div>
                    <div className="fli-message">{f.message}</div>
                  </div>
                  <div className="fli-right">
                    <div className="fli-stars"><Stars rating={f.rating}/></div>
                    <div className="fli-date">{f.daysAgo===0?'Today':f.daysAgo===1?'Yesterday':`${f.daysAgo}d ago`}</div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={()=>setFbPage(p=>Math.max(1,p-1))} disabled={fbPage===1}>←</button>
                {Array.from({length:totalPages},(_,i)=>i+1).filter(i=>i===1||i===totalPages||Math.abs(i-fbPage)<=1).map((i,idx,arr) => (
                  <React.Fragment key={i}>
                    {idx>0 && arr[idx-1]!==i-1 && <span style={{color:'var(--text-muted)',padding:'0 4px'}}>…</span>}
                    <button className={`page-btn${fbPage===i?' active':''}`} onClick={()=>setFbPage(i)}>{i}</button>
                  </React.Fragment>
                ))}
                <button className="page-btn" onClick={()=>setFbPage(p=>Math.min(totalPages,p+1))} disabled={fbPage===totalPages}>→</button>
              </div>
            )}
          </div>
        )}

        {/* ───────── ANALYTICS ───────── */}
        {page === 'analytics' && (
          <div className="page active">
            <div className="page-header"><div><h1 className="page-title">Analytics</h1><p className="page-subtitle">Data-driven insights from your feedback</p></div></div>
            <div className="charts-row">
              <div className="chart-card" style={{flex:1}}><div className="chart-header"><h3>Monthly Feedback Volume</h3></div><Bar data={monthChartData} options={CHART_OPTS} height={180}/></div>
              <div className="chart-card" style={{flex:1}}><div className="chart-header"><h3>Rating Distribution</h3></div><Bar data={ratingChartData} options={{...CHART_OPTS, scales:{...CHART_OPTS.scales, y:{...CHART_OPTS.scales.y, ticks:{...CHART_OPTS.scales.y.ticks, callback:v=>v+'%'}}}}} height={180}/></div>
            </div>
            <div className="charts-row">
              <div className="chart-card" style={{flex:1}}><div className="chart-header"><h3>Sentiment by Category</h3></div><Bar data={sentStackData} options={{...CHART_OPTS, indexAxis:'y', plugins:{...CHART_OPTS.plugins, legend:{display:true,labels:{color:'#94a3b8',boxWidth:10,font:{size:10}}}}, scales:{x:{...CHART_OPTS.scales.x, stacked:true}, y:{...CHART_OPTS.scales.y, stacked:true}}}} height={200}/></div>
              <div className="chart-card" style={{flex:1}}>
                <div className="chart-header"><h3>Summary Insights</h3></div>
                <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
                  {[
                    {v:stats.total, l:'Total Feedbacks', c:'#a78bfa', bg:'rgba(139,92,246,.12)', b:'rgba(139,92,246,.2)'},
                    {v:stats.avgRating>0?stats.avgRating.toFixed(1)+'★':'—', l:'Avg Rating', c:'#34d399', bg:'rgba(52,211,153,.1)', b:'rgba(52,211,153,.2)'},
                    {v:`${stats.total>0?Math.round(stats.sentMap.Positive/stats.total*100):0}%`, l:'Positive', c:'#fbbf24', bg:'rgba(251,191,36,.1)', b:'rgba(251,191,36,.2)'},
                    {v:`${stats.total>0?Math.round(stats.resolved/stats.total*100):0}%`, l:'Resolved', c:'#22d3ee', bg:'rgba(34,211,238,.1)', b:'rgba(34,211,238,.2)'},
                  ].map(k=>(
                    <div key={k.l} style={{flex:'1 1 100px',background:k.bg,border:`1px solid ${k.b}`,borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontSize:'1.4rem',fontWeight:700,color:k.c}}>{k.v}</div>
                      <div style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:2}}>{k.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:'.8rem',fontWeight:700,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10}}>🏆 Top Products</div>
                {Object.entries(stats.productMap).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([prod,v],i)=>{
                  const topCount = Object.entries(stats.productMap).sort((a,b)=>b[1].count-a[1].count)[0]?.[1]?.count || 1;
                  const colors=['#8b5cf6','#6366f1','#22d3ee','#34d399','#f472b6'];
                  return (
                    <div key={prod} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontSize:'.75rem',fontWeight:700,color:colors[i%5],width:18}}>#{i+1}</span>
                          <span style={{fontSize:'.82rem',fontWeight:600,color:'var(--text)'}}>{prod}</span>
                        </div>
                        <span style={{fontSize:'.72rem',color:'var(--text-muted)'}}>{v.count} reviews · {v.ratedCount>0?(v.ratingSum/v.ratedCount).toFixed(1):'-'}★</span>
                      </div>
                      <div style={{height:6,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.round(v.count/topCount*100)}%`,background:colors[i%5],borderRadius:99}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ───────── SURVEYS ───────── */}
        {page === 'surveys' && (
          <div className="page active">
            <div className="page-header">
              <div><h1 className="page-title">Surveys</h1><p className="page-subtitle">Manage and track your surveys</p></div>
              <button className="btn btn-primary" onClick={()=>setSurveyModal(true)}>＋ New Survey</button>
            </div>
            <div className="surveys-grid">
              {surveys.map(s=>{
                const pct = Math.min(Math.round((s.responses/s.target)*100),100);
                return (
                  <div key={s.id} className="survey-card">
                    <div className="survey-header"><div className="survey-title">{s.title}</div><span className={`survey-status ${s.status}`}>{s.status}</span></div>
                    <p className="survey-desc">{s.description}</p>
                    <div className="survey-meta">
                      <div className="survey-meta-row"><span>Audience</span><span>{s.audience}</span></div>
                      <div className="survey-meta-row"><span>Responses</span><span>{s.responses.toLocaleString()} / {s.target.toLocaleString()}</span></div>
                      <div className="survey-meta-row"><span>End Date</span><span>{s.endDate}</span></div>
                    </div>
                    <div className="survey-progress-track"><div className="survey-progress-fill" style={{width:`${pct}%`}}></div></div>
                    <div className="survey-actions">
                      <button className="survey-action-btn primary" onClick={()=>showToast('Opening survey editor…','info')}>View Results</button>
                      <button className="survey-action-btn secondary" onClick={()=>showToast('Survey duplicated!','success')}>Duplicate</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────── SUBMIT FEEDBACK ───────── */}
        {page === 'submit' && (
          <div className="page active">
            <div className="page-header"><div><h1 className="page-title">Submit Feedback</h1><p className="page-subtitle">Add a new feedback entry</p></div></div>
            <div className="chart-card" style={{maxWidth:640}}>
              <form onSubmit={handleSubmitFeedback}>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Username</label>
                  <input className="form-input" type="text" placeholder="Your username (optional)" value={fUsername} onChange={e=>setFUsername(e.target.value)} disabled={fAnon} />
                </div>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" type="text" placeholder="e.g. Mobile App" value={fSubject} onChange={e=>setFSubject(e.target.value)} required />
                </div>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={fCategory} onChange={e=>setFCategory(e.target.value)}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Rating</label>
                  <div className="star-input">
                    {[1,2,3,4,5].map(v=>(
                      <span key={v} className={`star${rating>=v?' active':''}`} data-val={v} onClick={()=>setRating(v)} style={{cursor:'pointer',fontSize:'1.5rem'}}>★</span>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Message *</label>
                  <textarea className="form-input" rows={5} placeholder="Detailed feedback…" value={fMessage} onChange={e=>setFMessage(e.target.value)} required style={{resize:'vertical'}} />
                </div>
                <div className="form-group" style={{marginBottom:20}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={fAnon} onChange={e=>setFAnon(e.target.checked)} /> Submit anonymously
                  </label>
                </div>
                <button type="submit" className="btn btn-primary">📤 Submit Feedback</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* DETAIL MODAL */}
      {detail && (
        <div className="modal-overlay open" onClick={e=>{ if(e.target===e.currentTarget) setDetail(null); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={()=>setDetail(null)}>✕</button>
            <div className="md-header">
              <div className="md-avatar" style={{background:detail.avatarColor}}>{detail.initials}</div>
              <div><div className="md-name">{detail.username||detail.name}</div><div className="md-email">@{detail.username||detail.name}</div></div>
            </div>
            <div className="md-stars"><Stars rating={detail.rating}/></div>
            <div className="md-message">"{detail.message}"</div>
            <div className="md-meta">
              {[['Product',detail.subject||'N/A'],['Status',<span className={`status-badge ${detail.status}`}>{detail.status}</span>],['Sentiment',detail.sentiment],['Rating',detail.rating?`${detail.rating}/5`:'N/A'],['Submitted',detail.daysAgo===0?'Today':detail.daysAgo===1?'Yesterday':`${detail.daysAgo}d ago`]].map(([l,v])=>(
                <div key={l} className="md-meta-item"><span className="md-meta-label">{l}</span><span className="md-meta-value">{v}</span></div>
              ))}
            </div>
            <div className="md-actions">
              <button className="btn btn-primary" onClick={()=>handleChangeStatus(detail.id,'Resolved')}>✓ Mark Resolved</button>
              <button className="btn btn-secondary" onClick={()=>handleChangeStatus(detail.id,'In Review')}>👁 Review</button>
              <button className="btn btn-secondary" onClick={()=>showToast('Reply coming soon!','info')}>↩ Reply</button>
            </div>
          </div>
        </div>
      )}

      {/* SURVEY MODAL */}
      {surveyModal && (
        <div className="modal-overlay open" onClick={e=>{ if(e.target===e.currentTarget) setSurveyModal(false); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={()=>setSurveyModal(false)}>✕</button>
            <h2 style={{marginBottom:20}}>Create New Survey</h2>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Title *</label>
              <input className="form-input" type="text" placeholder="Survey title" value={newSurvey.title} onChange={e=>setNewSurvey(s=>({...s,title:e.target.value}))} />
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="Survey description" value={newSurvey.desc} onChange={e=>setNewSurvey(s=>({...s,desc:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Audience</label>
              <select className="form-input" value={newSurvey.audience} onChange={e=>setNewSurvey(s=>({...s,audience:e.target.value}))}>
                {['All Users','New Users','Premium Users'].map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={newSurvey.end} onChange={e=>setNewSurvey(s=>({...s,end:e.target.value}))} />
            </div>
            <div style={{display:'flex',gap:12}}>
              <button className="btn btn-primary" onClick={createSurvey}>Create Survey</button>
              <button className="btn btn-secondary" onClick={()=>setSurveyModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.vis && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
