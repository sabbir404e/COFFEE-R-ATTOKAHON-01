'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

const STATUS_FLOW = { paid: 'preparing', preparing: 'ready', ready: 'served' };
const TERMINAL_STATUSES = new Set(['served', 'cancelled', 'failed', 'refunded']);
const STATUS_LABELS = { paid: 'New Order', preparing: 'Preparing', ready: 'Ready!', served: 'Served' };

function orderTimestamp(order) {
  const candidate = order.time ?? order.createdAt;
  const ts = typeof candidate === 'number' ? candidate : new Date(candidate).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export default function KitchenPage() {
  const { toggleTheme, orders: allOrders } = useApp();

  const [me, setMe] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [kFilter, setKFilter] = useState('active');
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(Date.now());

  const paidCountRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNow(Date.now());
      try {
        const saved = JSON.parse(localStorage.getItem('ca_kitchen_user'));
        if (saved && ['kitchen', 'admin'].includes(saved.role)) setMe(saved);
      } catch {}
    });
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      active = false;
      clearInterval(tick);
      audioCtxRef.current?.close?.().catch(() => {});
    };
  }, []);

  // ── Login via Supabase (same pattern as admin page) ──────────────────────
  const doLogin = async () => {
    const u = loginUser.trim();
    const p = loginPass;
    if (!u || !p) return;
    setLoginLoading(true);
    setLoginErr(false);

    const { data: found } = await supabase
      .from('users')
      .select('*')
      .eq('username', u)
      .eq('password', p)
      .in('role', ['kitchen', 'admin'])
      .single();

    setLoginLoading(false);

    if (!found) {
      setLoginErr(true);
      return;
    }
    setMe(found);
    localStorage.setItem('ca_kitchen_user', JSON.stringify(found));
  };

  const doLogout = () => {
    setMe(null);
    setLoginUser('');
    setLoginPass('');
    localStorage.removeItem('ca_kitchen_user');
  };

  // ── Advance order status ──────────────────────────────────────────────────
  const advOrder = async (id, currentStatus) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    const order = allOrders.find(o => String(o.id) === String(id));
    if (!order || order.status !== currentStatus) return;

    await supabase
      .from('orders')
      .update({ status: nextStatus, status_updated_at: new Date().toISOString() })
      .eq('id', id);

    if (nextStatus === 'served' && order.table) {
      await supabase.from('dining_tables').update({ status: 'cleaning' }).eq('id', order.table);
    }
  };

  // ── Chime ─────────────────────────────────────────────────────────────────
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    } catch {}
  };

  // Sound alert when new paid order arrives
  useEffect(() => {
    const paidCount = allOrders.filter(o => o.status === 'paid').length;
    if (hasLoadedRef.current && soundOn && paidCount > paidCountRef.current) playChime();
    paidCountRef.current = paidCount;
    hasLoadedRef.current = true;
  }, [allOrders, soundOn]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = { paid: 0, preparing: 0, ready: 0, served: 0 };
  allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  counts.active = counts.paid + counts.preparing + counts.ready;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const list = kFilter === 'active'
    ? allOrders.filter(o => !TERMINAL_STATUSES.has(o.status))
    : allOrders.filter(o => o.status === kFilter);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = o => {
    const ts = orderTimestamp(o);
    return ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  };

  const formatElapsed = o => {
    const ts = orderTimestamp(o);
    if (!ts) return '';
    const mins = Math.max(0, Math.floor((now - ts) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const isLate = o =>
    !TERMINAL_STATUSES.has(o.status) &&
    Boolean(orderTimestamp(o)) &&
    now - orderTimestamp(o) > 20 * 60000;

  const btnMap = {
    paid:      ['adv-new',  '▶ Start Preparing'],
    preparing: ['adv-prep', '✓ Mark as Ready'],
    ready:     ['adv-ready','✔ Mark as Served'],
  };

  const statusDotColor = { paid: '#5060B8', preparing: '#D4A017', ready: '#2A7248' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Login ── */
        #kitchenLogin {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 24px; position: relative;
        }
        .glow { position: fixed; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 40% at 50% 10%,
            rgba(200,148,56,0.09) 0%, transparent 70%); }
        .login-wrap { width: 100%; max-width: 340px; position: relative; z-index: 1; }
        .login-brand { text-align: center; margin-bottom: 28px; }
        .login-brand .wm { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 34px; }
        .login-brand .wm em { color: var(--gold); font-style: normal; }
        .login-brand .sub { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--muted); margin-top: 6px; }
        .login-card { background: var(--card); border: 1px solid var(--border);
          border-radius: 18px; padding: 26px; animation: slideUp 0.35s;
          box-shadow: var(--shadow); }
        .login-card h2 { font-family: var(--font-playfair),'Playfair Display',serif;
          font-size: 20px; margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 5px; }
        .inp { width: 100%; background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 9px; padding: 10px 13px; font-size: 14px; color: var(--text);
          outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .inp:focus { border-color: var(--gold); }
        .inp::placeholder { color: var(--muted); }
        .btn-login { width: 100%; padding: 12px; background: var(--gold); color: #fff;
          border: none; border-radius: 9px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: background 0.2s; margin-top: 4px; }
        .btn-login:hover { background: var(--gold-h); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-err { background: var(--d-bg); border: 1px solid var(--d-bd); border-radius: 9px;
          padding: 9px 12px; font-size: 13px; color: var(--d-tx); margin-bottom: 12px; }
        .login-hint { margin-top: 14px; padding: 12px; background: var(--bg2);
          border: 1px solid var(--border); border-radius: 9px; font-size: 12px;
          color: var(--muted); text-align: center; line-height: 1.7; }
        .login-hint b { color: var(--text-2); }
        .login-theme { position: absolute; top: 16px; right: 16px;
          display: flex; align-items: center; gap: 8px; }

        /* ── App Shell ── */
        #kitchenApp { min-height: 100vh; display: flex; flex-direction: column; }
        .k-main { max-width: 1300px; margin: 0 auto; padding: 24px 20px; width: 100%; }

        /* ── Page header ── */
        .pg-h { margin-bottom: 20px; display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .pg-h-left h1 { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 26px; }
        .pg-h-left p { font-size: 13px; color: var(--muted); margin-top: 3px; }

        /* ── Stats row ── */
        .k-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .k-stat { background: var(--card); border: 1px solid var(--border); border-radius: 12px;
          padding: 12px 18px; min-width: 90px; text-align: center; }
        .k-stat-val { font-family: var(--font-playfair),'Playfair Display',serif;
          font-size: 28px; line-height: 1; }
        .k-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
          color: var(--muted); margin-top: 4px; }

        /* ── Filter bar ── */
        .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .f-pill { padding: 7px 16px; border-radius: 20px; border: 1px solid var(--border);
          background: none; font-size: 12px; font-weight: 500; cursor: pointer;
          color: var(--muted); transition: all 0.18s; text-transform: uppercase;
          letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
        .f-pill.active { background: var(--gold); color: #fff; border-color: var(--gold); }
        .f-pill:hover:not(.active) { border-color: var(--border-h); color: var(--text); }
        .f-count { font-size: 10px; background: rgba(255,255,255,0.15); border-radius: 10px;
          padding: 1px 6px; }
        .f-pill:not(.active) .f-count { background: rgba(125,110,86,0.2); }

        /* ── Orders grid ── */
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .order-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px;
          padding: 16px; display: flex; flex-direction: column; position: relative;
          overflow: hidden; transition: var(--tt); box-shadow: var(--shadow); }
        .order-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .order-card.s-paid::before    { background: #5060B8; }
        .order-card.s-preparing::before { background: var(--warn); }
        .order-card.s-ready::before   { background: var(--ok); }
        .order-card.s-served { opacity: 0.45; }
        .order-card.is-late { border-color: rgba(192,64,64,0.5); animation: ringPulse 2s infinite; }

        .o-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .o-num { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 18px; font-weight: 700; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid; }
        .b-paid      { background: rgba(70,100,180,0.14); border-color: rgba(70,100,180,0.28); color: #90A8E0; }
        .b-preparing { background: var(--w-bg); border-color: var(--w-bd); color: var(--w-tx); }
        .b-ready     { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .b-served    { background: var(--x-bg); border-color: var(--x-bd); color: var(--x-tx); }

        .o-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
        .o-late { color: #E08080; font-size: 11px; font-weight: 600; margin-left: 4px; }
        .o-items { font-size: 13px; color: var(--text-2); line-height: 2; flex: 1; margin-bottom: 12px; }
        .o-item-row { display: flex; align-items: baseline; gap: 6px; }
        .o-item-qty { color: var(--gold); font-weight: 700; font-size: 14px; }
        .o-note { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px;
          padding: 7px 10px; font-size: 12px; color: var(--text-2); margin-bottom: 10px;
          font-style: italic; }
        .o-total { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
        .o-total span { color: var(--gold); font-weight: 600; font-size: 15px; }

        .adv-btn { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
        .adv-new   { background: rgba(70,100,180,0.10); border-color: rgba(70,100,180,0.28); color: #90A8E0; }
        .adv-new:hover   { background: #5060B8; color: #fff; border-color: #5060B8; }
        .adv-prep  { background: var(--w-bg); border-color: var(--w-bd); color: var(--w-tx); }
        .adv-prep:hover  { background: var(--warn); color: #fff; border-color: var(--warn); }
        .adv-ready { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .adv-ready:hover { background: var(--ok); color: #fff; border-color: var(--ok); }

        /* ── Topbar extras ── */
        .live-pill { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
        .live-dot  { width: 7px; height: 7px; border-radius: 50%; background: #C04040;
          animation: pulse 1.5s ease-in-out infinite; flex-shrink: 0; }
        .role-badge { background: var(--o-bg); border: 1px solid var(--o-bd); border-radius: 20px;
          padding: 3px 12px; font-size: 11px; color: var(--o-tx); text-transform: uppercase;
          letter-spacing: 1px; }
        .sound-btn { background: none; border: 1px solid var(--border); border-radius: 8px;
          padding: 5px 12px; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.18s; }
        .sound-btn.on { border-color: var(--gold); color: var(--gold); }
        .logout-btn { background: none; border: 1px solid var(--border); border-radius: 8px;
          padding: 5px 12px; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.18s; }
        .logout-btn:hover { border-color: var(--border-h); color: var(--text); }

        /* ── Empty state ── */
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 70px 20px; color: var(--muted); }
        .empty-state .e-icon { font-size: 52px; margin-bottom: 14px; }
        .empty-state p { font-size: 15px; }

        /* ── Animations ── */
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes slideUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:none;} }
        @keyframes ringPulse { 0%{box-shadow:0 0 0 0 rgba(192,64,64,0.4);}
          70%{box-shadow:0 0 0 8px rgba(192,64,64,0);}
          100%{box-shadow:0 0 0 0 rgba(192,64,64,0);} }

        @media(max-width:600px) {
          .k-main { padding: 14px; }
          .orders-grid { grid-template-columns: 1fr; }
          .role-badge { display: none; }
          .k-stats { gap: 7px; }
          .k-stat { padding: 10px 12px; min-width: 70px; }
        }
      `}</style>

      {/* ── LOGIN SCREEN ─────────────────────────────────────────────────── */}
      {!me ? (
        <div id="kitchenLogin">
          <div className="glow" />
          <div className="login-theme">
            <span className="theme-label">🌙</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
            <span className="theme-label">☀️</span>
          </div>
          <div className="login-wrap">
            <div className="login-brand">
              <div className="wm"><em>Coffee-r</em> Attokahon</div>
              <div className="sub">Kitchen Staff Portal</div>
            </div>
            <div className="login-card">
              <h2>Kitchen Login</h2>
              {loginErr && (
                <div className="login-err">
                  ✗ Incorrect credentials. Kitchen or Admin role required.
                </div>
              )}
              <div className="field">
                <label htmlFor="k-user">Username</label>
                <input
                  id="k-user"
                  className="inp"
                  type="text"
                  placeholder="username"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="k-pass">Password</label>
                <input
                  id="k-pass"
                  className="inp"
                  type="password"
                  placeholder="password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  autoComplete="current-password"
                />
              </div>
              <button className="btn-login" onClick={doLogin} disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign In →'}
              </button>
              <div className="login-hint">
                Use your <b>kitchen</b> or <b>admin</b> account credentials.<br />
                Accounts are managed from the Admin portal.
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* ── MAIN APP ──────────────────────────────────────────────────── */
        <div id="kitchenApp">
          {/* Topbar */}
          <div className="topbar">
            <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
              <em>Coffee-r</em> Attokahon
            </Link>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="live-pill">
                <div className="live-dot" />
                <span>{counts.active} active</span>
              </div>
              <div className="role-badge">Kitchen</div>
              <button
                className={`sound-btn${soundOn ? ' on' : ''}`}
                onClick={() => setSoundOn(s => !s)}
                title="Toggle new-order chime"
              >
                {soundOn ? '🔔 Sound ON' : '🔕 Sound'}
              </button>
              <span className="theme-label">🌙</span>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
              <span className="theme-label">☀️</span>
              <button className="logout-btn" onClick={doLogout}>Sign out</button>
            </div>
          </div>

          <div className="k-main">
            {/* Page header */}
            <div className="pg-h">
              <div className="pg-h-left">
                <h1>Kitchen Display</h1>
                <p>Real-time incoming orders — update status as you prepare each one.</p>
              </div>
            </div>

            {/* Stats */}
            <div className="k-stats">
              {[
                { label: 'Active',     val: counts.active,    color: '#C89438' },
                { label: 'New',        val: counts.paid,      color: '#90A8E0' },
                { label: 'Preparing',  val: counts.preparing, color: '#D4A017' },
                { label: 'Ready',      val: counts.ready,     color: '#2A7248' },
                { label: 'Served',     val: counts.served,    color: '#666'    },
              ].map(s => (
                <div className="k-stat" key={s.label}>
                  <div className="k-stat-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="k-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
              <button className={`f-pill${kFilter === 'active' ? ' active' : ''}`} onClick={() => setKFilter('active')}>
                <div className="live-dot" /> Active <span className="f-count">{counts.active}</span>
              </button>
              <button className={`f-pill${kFilter === 'paid' ? ' active' : ''}`} onClick={() => setKFilter('paid')}>
                💳 New <span className="f-count">{counts.paid}</span>
              </button>
              <button className={`f-pill${kFilter === 'preparing' ? ' active' : ''}`} onClick={() => setKFilter('preparing')}>
                🍳 Preparing <span className="f-count">{counts.preparing}</span>
              </button>
              <button className={`f-pill${kFilter === 'ready' ? ' active' : ''}`} onClick={() => setKFilter('ready')}>
                ✅ Ready <span className="f-count">{counts.ready}</span>
              </button>
              <button className={`f-pill${kFilter === 'served' ? ' active' : ''}`} onClick={() => setKFilter('served')}>
                Served <span className="f-count">{counts.served}</span>
              </button>
            </div>

            {/* Orders grid */}
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
                  const items = Array.isArray(o.items) ? o.items : [];
                  const late = isLate(o);

                  return (
                    <div key={key} className={`order-card s-${o.status}${late ? ' is-late' : ''}`}>
                      <div className="o-head">
                        <span className="o-num">#{key}</span>
                        <span className={`badge b-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
                      </div>

                      <div className="o-meta">
                        📍 {o.table ? `Table ${o.table}` : 'Walk-in'}
                        &nbsp;·&nbsp;
                        🕐 {formatTime(o)}
                        &nbsp;·&nbsp;
                        {formatElapsed(o)}
                        {late && <span className="o-late">⚠ Late</span>}
                      </div>

                      <div className="o-items">
                        {items.length > 0 ? items.map((item, idx) => (
                          <div key={idx} className="o-item-row">
                            <span className="o-item-qty">{item.qty}×</span>
                            <span>{item.emoji || '☕'} {item.name}</span>
                          </div>
                        )) : (
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Loading items…</div>
                        )}
                      </div>

                      {o.note && (
                        <div className="o-note">📝 {o.note}</div>
                      )}

                      <div className="o-total">
                        Total: <span>৳{o.total?.toLocaleString()}</span>
                      </div>

                      {btnLbl && (
                        <button
                          className={`adv-btn ${btnCls}`}
                          onClick={() => advOrder(key, o.status)}
                        >
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
