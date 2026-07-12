'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

export default function KitchenPage() {
  const { toggleTheme } = useApp();
  
  const [me, setMe] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  
  const [allOrders, setAllOrders] = useState([]);
  const [kFilter, setKFilter] = useState('active');
  const [soundOn, setSoundOn] = useState(false);
  const [prevNew, setPrevNew] = useState(0);
  const [mounted, setMounted] = useState(false);

  const pollTimerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => clearInterval(pollTimerRef.current);
  }, []);

  const loadOrders = () => {
    try {
      const orders = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      setAllOrders(orders);
    } catch {
      setAllOrders([]);
    }
  };

  const doLogin = () => {
    const u = loginUser.trim();
    const p = loginPass;
    let users = [{username:'chef',password:'chef123',role:'kitchen'},{username:'admin',password:'admin123',role:'admin'}];
    try {
      const lsUsers = JSON.parse(localStorage.getItem('ca_users'));
      if (lsUsers && lsUsers.length) users = lsUsers;
    } catch (e) {}
    
    const found = users.find(x => x.username === u && x.password === p);
    if (!found || !['kitchen','admin'].includes(found.role)) {
      setLoginErr(true);
      return;
    }
    setLoginErr(false);
    setMe(found);
    loadOrders();
    pollTimerRef.current = setInterval(loadOrders, 3000);
  };

  const doLogout = () => {
    setMe(null);
    clearInterval(pollTimerRef.current);
    setLoginUser('');
    setLoginPass('');
  };

  const advOrder = (id, nextStatus) => {
    try {
      const orders = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      const idx = orders.findIndex(o => String(o.id) === String(id));
      if (idx > -1) {
        orders[idx].status = nextStatus;
        localStorage.setItem('ca_paid_orders', JSON.stringify(orders));
      }
      loadOrders();
    } catch (e) {}
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        const t = ctx.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.3);
      });
    } catch {}
  };

  const counts = { paid: 0, preparing: 0, ready: 0, served: 0 };
  allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  counts.active = counts.paid + counts.preparing + counts.ready;

  useEffect(() => {
    if (soundOn && counts.paid > prevNew) {
      playChime();
    }
    setPrevNew(counts.paid);
  }, [counts.paid, soundOn, prevNew]);

  const list = kFilter === 'active' 
    ? allOrders.filter(o => o.status !== 'served') 
    : allOrders.filter(o => o.status === kFilter);

  const flow = { paid: 'preparing', preparing: 'ready', ready: 'served' };
  const btnMap = {
    paid: ['adv-new', '▶ Start Preparing'],
    preparing: ['adv-prep', '✓ Mark as Ready'],
    ready: ['adv-ready', '✔ Mark as Served'],
  };

  const formatTime = (o) => {
    const ts = o.createdAt || (o.time ? new Date(o.time).getTime() : Date.now());
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatElapsed = (o) => {
    const ts = o.createdAt || (o.time ? new Date(o.time).getTime() : Date.now());
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm ago';
  };

  const isLate = (o) => {
    if (o.status === 'served') return false;
    const ts = o.createdAt || (o.time ? new Date(o.time).getTime() : Date.now());
    return (Date.now() - ts) > 20 * 60000;
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        /* LOGIN */
        #loginScreen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;}
        .glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 40% at 50% 10%,rgba(200,148,56,0.09) 0%,transparent 70%);}
        [data-theme="light"] .glow{background:radial-gradient(ellipse 60% 40% at 50% 10%,rgba(160,108,40,0.07) 0%,transparent 70%);}
        .login-wrap{width:100%;max-width:340px;position:relative;z-index:1;}
        .login-brand{text-align:center;margin-bottom:28px;}
        .login-brand .wm{font-family:var(--font-playfair),'Playfair Display',serif;font-size:36px;}
        .login-brand .wm em{color:var(--gold);font-style:normal;}
        .login-brand .sub{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-top:6px;}
        .login-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:26px;animation:slideUp 0.35s;box-shadow:var(--shadow);transition:var(--tt);}
        .login-card h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:20px;margin-bottom:20px;}
        .field{margin-bottom:14px;}
        .field label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:5px;}
        .inp{width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:9px;padding:10px 13px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.2s;}
        .inp:focus{border-color:var(--gold);}
        .inp::placeholder{color:var(--muted);}
        .btn-login{width:100%;padding:12px;background:var(--gold);color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-top:4px;}
        .btn-login:hover{background:var(--gold-h);}
        .login-err{background:var(--d-bg);border:1px solid var(--d-bd);border-radius:9px;padding:9px 12px;font-size:13px;color:var(--d-tx);margin-bottom:12px;}
        .login-hint{margin-top:14px;padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:9px;font-size:12px;color:var(--muted);text-align:center;}
        .login-hint b{color:var(--text-2);}
        .login-theme{position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:8px;}

        /* MAIN APP */
        #appScreen{min-height:100vh;display:flex;flex-direction:column;}
        .main{max-width:1200px;margin:0 auto;padding:24px 20px;}
        .pg-h{margin-bottom:20px;}
        .pg-h h1{font-family:var(--font-playfair),'Playfair Display',serif;font-size:26px;}
        .pg-h p{font-size:13px;color:var(--muted);margin-top:3px;}

        /* FILTER BAR */
        .filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
        .f-pill{padding:6px 15px;border-radius:20px;border:1px solid var(--border);background:none;font-size:12px;font-weight:500;cursor:pointer;color:var(--muted);transition:all 0.18s;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:5px;}
        .f-pill.active{background:var(--gold);color:#fff;border-color:var(--gold);}
        .f-pill:hover:not(.active){border-color:var(--border-h);color:var(--text);}
        .f-count{font-size:10px;background:rgba(255,255,255,0.15);border-radius:10px;padding:1px 6px;}
        .f-pill:not(.active) .f-count{background:rgba(125,110,86,0.2);}

        /* ORDERS GRID */
        .orders-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;}
        .order-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:var(--tt);box-shadow:var(--shadow);}
        .order-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
        .order-card.s-paid::before{background:#5060B8;}
        .order-card.s-preparing::before{background:var(--warn);}
        .order-card.s-ready::before{background:var(--ok);}
        .order-card.s-served{opacity:0.45;}
        
        .o-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
        .o-num{font-family:var(--font-playfair),'Playfair Display',serif;font-size:17px;}
        .badge{display:inline-block;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;border:1px solid;}
        
        .b-paid     {background:rgba(70,100,180,0.14);border-color:rgba(70,100,180,0.28);color:#90A8E0;}
        .b-preparing{background:var(--w-bg);border-color:var(--w-bd);color:var(--w-tx);}
        .b-ready    {background:var(--o-bg);border-color:var(--o-bd);color:var(--o-tx);}
        .b-served   {background:var(--x-bg);border-color:var(--x-bd);color:var(--x-tx);}

        .o-meta{font-size:12px;color:var(--muted);margin-bottom:10px;}
        .o-items{font-size:13px;color:var(--text-2);line-height:2;flex:1;margin-bottom:12px;}
        .o-total{font-size:12px;color:var(--muted);margin-bottom:12px;}
        .o-total span{color:var(--gold);font-weight:600;}
        
        .adv-btn{width:100%;padding:9px;border-radius:10px;border:1px solid;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;}
        .adv-new  {background:var(--d-bg);border-color:var(--d-bd);color:var(--d-tx);}
        .adv-new:hover  {background:var(--danger);color:#fff;border-color:var(--danger);}
        .adv-prep {background:var(--w-bg);border-color:var(--w-bd);color:var(--w-tx);}
        .adv-prep:hover {background:var(--warn);color:#fff;border-color:var(--warn);}
        .adv-ready{background:var(--o-bg);border-color:var(--o-bd);color:var(--o-tx);}
        .adv-ready:hover{background:var(--ok);color:#fff;border-color:var(--ok);}
        
        .empty-state{grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);}
        .empty-state .e-icon{font-size:44px;margin-bottom:14px;}
        
        .live-pill{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);}
        .live-dot{width:7px;height:7px;border-radius:50%;background:var(--danger);animation:pulse 1.5s ease-in-out infinite;flex-shrink:0;}
        .role-badge{background:var(--o-bg);border:1px solid var(--o-bd);border-radius:20px;padding:3px 12px;font-size:11px;color:var(--o-tx);text-transform:uppercase;letter-spacing:1px;display:none;}
        @media(min-width:600px){.role-badge{display:inline-block;}}
        .sound-btn{background:none;border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:12px;color:var(--muted);cursor:pointer;transition:all 0.18s;}
        .sound-btn.on{border-color:var(--border-h);color:var(--gold);}
        .logout-btn{background:none;border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:12px;color:var(--muted);cursor:pointer;transition:all 0.18s;}
        .logout-btn:hover{border-color:var(--border-h);color:var(--text);}
        
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
        @keyframes slideUp{from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:none;}}
        @keyframes ring{0%{box-shadow:0 0 0 0 rgba(192,64,64,0.5);}70%{box-shadow:0 0 0 10px rgba(192,64,64,0);}100%{box-shadow:0 0 0 0 rgba(192,64,64,0);}}
        
        @media(max-width:600px){
          .main{padding:16px;}
          .topbar-right{gap:6px;}
          .orders-grid{grid-template-columns:1fr;}
        }
      `}</style>

      {!me ? (
        <div id="loginScreen">
          <div className="glow"></div>
          <div className="login-theme">
            <span className="theme-label">🌙</span>
            <button className="theme-toggle" onClick={toggleTheme}></button>
            <span className="theme-label">☀️</span>
          </div>
          <div className="login-wrap">
            <div className="login-brand">
              <div className="wm"><em>Coffee-r</em> Attokahon</div>
              <div className="sub">Kitchen Staff Portal</div>
            </div>
            <div className="login-card">
              <h2>Kitchen Login</h2>
              {loginErr && <div className="login-err">Incorrect username or password.</div>}
              <div className="field">
                <label>Username</label>
                <input className="inp" type="text" placeholder="username" value={loginUser} onChange={e => setLoginUser(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="inp" type="password" placeholder="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </div>
              <button className="btn-login" onClick={doLogin}>Sign In →</button>
              <div className="login-hint">Default: <b>chef</b> / <b>chef123</b></div>
            </div>
          </div>
        </div>
      ) : (
        <div id="appScreen">
          <div className="topbar">
            <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="live-pill">
                <div className="live-dot"></div>
                <span>{counts.active} active</span>
              </div>
              <div className="role-badge">Kitchen</div>
              <button className={`sound-btn ${soundOn ? 'on' : ''}`} onClick={() => setSoundOn(!soundOn)}>
                {soundOn ? '🔔 Sound ON' : '🔕 Sound'}
              </button>
              <span className="theme-label">🌙</span>
              <button className="theme-toggle" onClick={toggleTheme}></button>
              <span className="theme-label">☀️</span>
              <button className="logout-btn" onClick={doLogout}>Sign out</button>
            </div>
          </div>

          <div className="main">
            <div className="pg-h">
              <h1>Kitchen Display</h1>
              <p>Real-time incoming orders — update status as you prepare each one.</p>
            </div>
            
            <div className="filter-bar">
              <button className={`f-pill ${kFilter === 'active' ? 'active' : ''}`} onClick={() => setKFilter('active')}>
                <div className="live-dot"></div>Active <span className="f-count">{counts.active}</span>
              </button>
              <button className={`f-pill ${kFilter === 'paid' ? 'active' : ''}`} onClick={() => setKFilter('paid')}>
                💳 Paid <span className="f-count">{counts.paid}</span>
              </button>
              <button className={`f-pill ${kFilter === 'preparing' ? 'active' : ''}`} onClick={() => setKFilter('preparing')}>
                Preparing <span className="f-count">{counts.preparing}</span>
              </button>
              <button className={`f-pill ${kFilter === 'ready' ? 'active' : ''}`} onClick={() => setKFilter('ready')}>
                Ready <span className="f-count">{counts.ready}</span>
              </button>
              <button className={`f-pill ${kFilter === 'served' ? 'active' : ''}`} onClick={() => setKFilter('served')}>
                Served <span className="f-count">{counts.served}</span>
              </button>
            </div>

            <div className="orders-grid">
              {list.length === 0 ? (
                <div className="empty-state">
                  <div className="e-icon">{kFilter === 'served' ? '✅' : '🍽️'}</div>
                  <p>No {kFilter === 'active' ? 'active' : kFilter} orders right now.</p>
                </div>
              ) : (
                list.map(o => {
                  const key = String(o.id);
                  const [btnCls, btnLbl] = btnMap[o.status] || [];
                  const statusLabel = { paid: 'Paid ✓', preparing: 'Preparing', ready: 'Ready!', served: 'Served' }[o.status] || o.status;
                  
                  return (
                    <div key={key} className={`order-card s-${o.status}`}>
                      <div className="o-head">
                        <span className="o-num">Order #{key}</span>
                        <span className={`badge b-${o.status}`}>{statusLabel}</span>
                      </div>
                      
                      <div className="o-meta">
                        📍 {o.table ? 'Table ' + o.table : 'Walk-in'} &nbsp;·&nbsp; 🕐 {formatTime(o)} &nbsp;·&nbsp; {formatElapsed(o)}
                        {isLate(o) && <span style={{ color: 'var(--d-tx)', fontSize: '10px' }}> ⚠ Late</span>}
                      </div>
                      
                      {o.paymentMethod && (
                        <div className="o-meta" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          💳 {o.paymentMethod} · <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{o.paymentId || ''}</span>
                        </div>
                      )}
                      
                      <div className="o-items">
                        {o.items.map((i, idx) => (
                          <div key={idx}>
                            {i.emoji || '☕'} <strong>{i.name}</strong> × {i.qty}
                          </div>
                        ))}
                      </div>
                      
                      {o.note && (
                        <div className="o-meta" style={{ fontStyle: 'italic', marginBottom: '6px' }}>
                          📝 {o.note}
                        </div>
                      )}
                      
                      <div className="o-total">Total: <span>৳{o.total}</span></div>
                      
                      {btnLbl && (
                        <button className={`adv-btn ${btnCls}`} onClick={() => advOrder(key, flow[o.status])}>
                          {btnLbl}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
