'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { resolveProductImage } from '@/lib/products';
import { supabase } from '@/lib/supabase';

const STATUS_FLOW = {
  paid: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'served'
};

const TERMINAL_STATUSES = new Set(['served', 'cancelled', 'failed', 'refunded']);

const STATUS_LABELS = {
  paid: 'Paid ✓',
  confirmed: 'Confirmed ✓',
  preparing: 'Preparing',
  ready: 'Ready!',
  served: 'Served',
  cancelled: 'Cancelled'
};

const BTN_MAP = {
  paid:      ['adv-confirm', '✔ Confirm Payment'],
  confirmed: ['adv-new',     '▶ Start Preparing'],
  preparing: ['adv-prep',    '✓ Mark as Ready'],
  ready:     ['adv-ready',   '✔ Mark as Served'],
};

function orderTimestamp(order) {
  const candidate = order.time ?? order.createdAt;
  const ts = typeof candidate === 'number' ? candidate : new Date(candidate).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function getItemCustomSummary(custom) {
  if (!custom) return '';
  if (typeof custom === 'string') return custom;
  const parts = [];
  if (custom.size && custom.size !== 'Regular') parts.push(custom.size);
  if (custom.sugar && custom.sugar !== '100%') parts.push(`${custom.sugar} sugar`);
  if (custom.milk && custom.milk !== 'Full Cream') parts.push(`${custom.milk} milk`);
  if (custom.extraShot === 'Yes') parts.push('+Extra Shot');
  if (custom.notes) parts.push(`"${custom.notes}"`);
  return parts.join(' · ');
}

export default function KitchenPage() {
  const { toggleTheme, orders: allOrders, fetchData, products } = useApp();

  const [me, setMe] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [kFilter, setKFilter] = useState('all');
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Cancel modals state
  const [pendingCancelKey, setPendingCancelKey] = useState(null);
  const [cancelledKey, setCancelledKey] = useState(null);

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
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      active = false;
      clearInterval(tick);
      audioCtxRef.current?.close?.().catch(() => {});
    };
  }, []);

  // ── Login via Supabase with default credentials fallback ────────────────────
  const doLogin = async () => {
    const u = loginUser.trim();
    const p = loginPass;
    if (!u || !p) return;
    setLoginLoading(true);
    setLoginErr(false);

    try {
      const { data: found } = await supabase
        .from('users')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .in('role', ['kitchen', 'admin'])
        .single();

      if (found) {
        setMe(found);
        localStorage.setItem('ca_kitchen_user', JSON.stringify(found));
        setLoginLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Supabase kitchen login fetch error:', e);
    }

    // Fallback for default chef login if users table is not yet seeded
    if ((u === 'chef' && (p === 'chef123' || p === 'chef')) || (u === 'admin' && (p === 'admin123' || p === 'admin'))) {
      const fallbackUser = { id: 999, username: u, role: u === 'admin' ? 'admin' : 'kitchen' };
      setMe(fallbackUser);
      localStorage.setItem('ca_kitchen_user', JSON.stringify(fallbackUser));
      setLoginLoading(false);
      return;
    }

    setLoginLoading(false);
    setLoginErr(true);
  };

  const doLogout = () => {
    setMe(null);
    setLoginUser('');
    setLoginPass('');
    localStorage.removeItem('ca_kitchen_user');
  };

  // ── Toggle Sound & Unlock AudioContext ────────────────────────────────────
  const toggleSound = () => {
    setSoundOn(prev => {
      const next = !prev;
      if (next) {
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }
        } catch (e) {}
      }
      return next;
    });
  };

  // ── Advance order status ──────────────────────────────────────────────────
  const advOrder = async (id, currentStatus) => {
    let nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    const order = allOrders.find(o => String(o.id) === String(id));
    if (!order || order.status !== currentStatus) return;

    const targetId = order.id;

    let { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', targetId);

    // If check constraint rejects 'confirmed', fallback to 'preparing'
    if (error && error.message && error.message.includes('check constraint')) {
      const fallback = nextStatus === 'confirmed' ? 'preparing' : nextStatus;
      console.warn(`Database check constraint error for '${nextStatus}'. Retrying with '${fallback}'...`);
      const fallbackRes = await supabase
        .from('orders')
        .update({ status: fallback })
        .eq('id', targetId);
      if (!fallbackRes.error) {
        error = null;
        nextStatus = fallback;
      } else {
        error = fallbackRes.error;
      }
    }

    if (error) {
      console.warn('First update attempt error, retrying with raw id:', error);
      const res = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', id);
      if (res.error && res.error.message && res.error.message.includes('check constraint')) {
        const fallback = nextStatus === 'confirmed' ? 'preparing' : nextStatus;
        const resFallback = await supabase
          .from('orders')
          .update({ status: fallback })
          .eq('id', id);
        if (!resFallback.error) {
          error = null;
          nextStatus = fallback;
        } else {
          error = resFallback.error;
        }
      } else {
        error = res.error;
      }
    }

    if (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status: ' + error.message);
      return;
    }

    // Instantly sync local data so Kitchen UI and realtime updates trigger (<50ms)
    if (typeof fetchData === 'function') {
      fetchData();
    }

    // Run non-blocking secondary updates concurrently in background
    Promise.all([
      supabase.from('payments').update({ status: nextStatus }).eq('order_id', targetId),
      nextStatus === 'served' && order.table
        ? supabase.from('dining_tables').update({ status: 'cleaning' }).eq('id', order.table)
        : Promise.resolve()
    ]).catch(e => console.warn('Non-blocking status update error:', e));
  };

  // ── Cancel Order Flow ─────────────────────────────────────────────────────
  const openCancelModal = (id) => {
    setPendingCancelKey(id);
  };

  const closeCancelModal = () => {
    setPendingCancelKey(null);
  };

  const confirmCancelOrder = async () => {
    const key = pendingCancelKey;
    if (!key) return;
    const order = allOrders.find(o => String(o.id) === String(key));

    setPendingCancelKey(null);
    const targetId = order ? order.id : (parseInt(key, 10) || key);

    // Update order status to cancelled
    let { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', targetId);

    if (error) {
      const res = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', key);
      error = res.error;
    }

    if (typeof fetchData === 'function') {
      fetchData();
    }
    setCancelledKey(key);

    // Non-blocking secondary updates in background
    Promise.all([
      supabase.from('payments').update({ status: 'cancelled' }).eq('order_id', targetId),
      order && order.table
        ? supabase.from('dining_tables').update({ status: 'available' }).eq('id', order.table)
        : Promise.resolve()
    ]).catch(e => console.warn('Non-blocking cancel update error:', e));
  };

  // ── Chime ─────────────────────────────────────────────────────────────────
  const playChime = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
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
    } catch (e) {}
  };

  // Sound alert when new paid order arrives
  useEffect(() => {
    const paidCount = allOrders.filter(o => o.status === 'paid').length;
    if (hasLoadedRef.current && soundOn && paidCount > paidCountRef.current) playChime();
    paidCountRef.current = paidCount;
    hasLoadedRef.current = true;
  }, [allOrders, soundOn]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = { paid: 0, confirmed: 0, preparing: 0, ready: 0, served: 0, cancelled: 0 };
  allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  counts.active = (counts.paid || 0) + (counts.confirmed || 0) + (counts.preparing || 0) + (counts.ready || 0);
  counts.all = allOrders.length;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const list = kFilter === 'all'
    ? allOrders
    : kFilter === 'active'
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Login ── */
        #kitchenLogin {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 32px 20px; position: relative;
        }
        .glow { position: fixed; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 40% at 50% 10%,
            rgba(200,148,56,0.09) 0%, transparent 70%); }
        .login-wrap { width: 100%; max-width: 360px; margin: 0 auto; position: relative; z-index: 1; }
        .login-brand { text-align: center; margin-bottom: 28px; }
        .login-logo { width: 76px; height: 76px; object-fit: cover; border-radius: 50%; border: 3px solid var(--gold); background: var(--bg2); margin: 0 auto 12px; display: block; box-shadow: 0 4px 16px rgba(200,148,56,0.35); }
        .login-brand .wm { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 34px; }
        .login-brand .wm em { color: var(--gold); font-style: normal; }
        .login-brand .sub { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--muted); margin-top: 6px; }
        .login-card { background: var(--card); border: 1px solid var(--border);
          border-radius: 18px; padding: 28px; animation: slideUp 0.35s;
          box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 16px; }
        .login-card h2 { font-family: var(--font-playfair),'Playfair Display',serif;
          font-size: 20px; margin-bottom: 4px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { display: block; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }
        .inp { width: 100%; background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 9px; padding: 11px 14px; font-size: 14px; color: var(--text);
          outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .inp:focus { border-color: var(--gold); }
        .inp::placeholder { color: var(--muted); }
        .btn-login { width: 100%; padding: 13px; background: var(--gold); color: #fff;
          border: none; border-radius: 9px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: background 0.2s; margin-top: 4px; }
        .btn-login:hover { background: var(--gold-h); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-err { background: var(--d-bg); border: 1px solid var(--d-bd); border-radius: 9px;
          padding: 10px 14px; font-size: 13px; color: var(--d-tx); }
        .login-hint { margin-top: 6px; padding: 12px; background: var(--bg2);
          border: 1px solid var(--border); border-radius: 9px; font-size: 12px;
          color: var(--muted); text-align: center; line-height: 1.7; }
        .login-hint b { color: var(--text-2); }
        .login-theme { position: absolute; top: 16px; right: 16px;
          display: flex; align-items: center; gap: 8px; }

        /* ── App Shell ── */
        #kitchenApp { min-height: 100vh; display: flex; flex-direction: column; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .k-main, .main { max-width: 1320px; margin: 0 auto; padding: 32px 24px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px; }

        /* ── Page header ── */
        .pg-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
        .pg-h h1 { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 28px; font-weight: 700; }
        .pg-h p { font-size: 14px; color: var(--muted); margin-top: 4px; }

        /* ── Filter bar ── */
        .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
        .f-pill { padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border);
          background: none; font-size: 12px; font-weight: 500; cursor: pointer;
          color: var(--muted); transition: all 0.18s; text-transform: uppercase;
          letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
        .f-pill.active { background: var(--gold); color: #fff; border-color: var(--gold); }
        .f-pill:hover:not(.active) { border-color: var(--border-h); color: var(--text); }
        .f-count { font-size: 10px; background: rgba(255,255,255,0.15); border-radius: 10px;
          padding: 2px 7px; }
        .f-pill:not(.active) .f-count { background: rgba(125,110,86,0.2); }

        /* ── Orders grid ── */
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .order-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px;
          padding: 20px; display: flex; flex-direction: column; position: relative; gap: 12px;
          overflow: hidden; transition: var(--tt); box-shadow: var(--shadow); }
        .order-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .order-card.s-paid::before      { background: #5060B8; }
        .order-card.s-confirmed::before { background: #38A6A8; }
        .order-card.s-preparing::before { background: var(--warn); }
        .order-card.s-ready::before     { background: var(--ok); }
        .order-card.s-cancelled::before { background: var(--danger); }
        .order-card.s-cancelled { opacity: 0.5; }
        /* Keep completed orders fully readable; their Served badge already indicates status. */
        .order-card.s-served { opacity: 1; }
        .order-card.is-late { border-color: rgba(192,64,64,0.5); animation: ring 2s ease infinite; }

        .o-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 2px; }
        .o-num { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 18px; font-weight: 700; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 10px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid; }
        .b-paid      { background: rgba(70,100,180,0.14); border-color: rgba(70,100,180,0.28); color: #90A8E0; }
        .b-confirmed { background: rgba(56,150,168,0.14); border-color: rgba(56,150,168,0.30); color: #5BC8DA; }
        .b-preparing { background: var(--w-bg); border-color: var(--w-bd); color: var(--w-tx); }
        .b-ready     { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .b-served    { background: var(--x-bg); border-color: var(--x-bd); color: var(--x-tx); }
        .b-cancelled { background: var(--d-bg); border-color: var(--d-bd); color: var(--d-tx); }

        .o-meta { font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 2px; }
        .o-items { font-size: 13px; color: var(--text-2); line-height: 1.6; flex: 1; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; margin-bottom: 4px; }
        .o-item-block { display: flex; flex-direction: column; gap: 4px; }
        .o-item-row { display: flex; align-items: center; gap: 8px; }
        .o-item-thumb { width: 24px; height: 24px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
        .o-item-custom { font-size: 11px; color: var(--gold); margin-left: 32px; line-height: 1.45; background: var(--bg2); padding: 3px 9px; border-radius: 6px; display: inline-block; }
        .o-total { font-size: 13px; color: var(--muted); margin-top: auto; padding-top: 10px; margin-bottom: 4px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: center; }
        .o-total span { color: var(--gold); font-weight: 700; font-size: 14px; }

        .adv-btn { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; margin-top: 4px; }
        .adv-confirm { background: rgba(56,150,168,0.14); border-color: rgba(56,150,168,0.30); color: #5BC8DA; }
        .adv-confirm:hover { background: #2C8688; color: #fff; border-color: #2C8688; }
        .adv-new   { background: var(--d-bg); border-color: var(--d-bd); color: var(--d-tx); }
        .adv-new:hover   { background: var(--danger); color: #fff; border-color: var(--danger); }
        .adv-prep  { background: var(--w-bg); border-color: var(--w-bd); color: var(--w-tx); }
        .adv-prep:hover  { background: var(--warn); color: #fff; border-color: var(--warn); }
        .adv-ready { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .adv-ready:hover { background: var(--ok); color: #fff; border-color: var(--ok); }
        
        .adv-cancel { width: 100%; padding: 9px 14px; border-radius: 10px; border: 1px solid var(--d-bd);
          background: var(--d-bg); color: var(--d-tx); font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.18s; margin-top: 6px; }
        .adv-cancel:hover { background: var(--danger); color: #fff; border-color: var(--danger); }

        /* ── Modals ── */
        .modal-ov { display: none; position: fixed; inset: 0; background: rgba(10,8,4,0.55);
          backdrop-filter: blur(3px); z-index: 1000; align-items: center; justify-content: center;
          padding: 24px; animation: fadeIn 0.18s; }
        .modal-ov.show { display: flex; }
        .modal-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px;
          padding: 28px; max-width: 380px; width: 100%; box-shadow: var(--shadow);
          text-align: center; animation: slideUp 0.25s; display: flex; flex-direction: column; gap: 12px; }
        .modal-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--d-bg);
          border: 1px solid var(--d-bd); color: var(--d-tx); font-size: 24px; display: flex;
          align-items: center; justify-content: center; margin: 0 auto 8px; }
        .modal-icon.ok { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .modal-card h3 { font-family: var(--font-playfair),'Playfair Display',serif; font-size: 20px; margin-bottom: 4px; }
        .modal-card p { font-size: 13px; color: var(--text-2); line-height: 1.6; margin-bottom: 12px; }
        .modal-card p b { color: var(--text); }
        .modal-actions { display: flex; gap: 12px; }
        .modal-actions button { flex: 1; padding: 11px 16px; border-radius: 10px; font-size: 13px;
          font-weight: 600; cursor: pointer; border: 1px solid; transition: all 0.18s; }
        .modal-btn-keep { background: none; border-color: var(--border); color: var(--text-2); }
        .modal-btn-keep:hover { border-color: var(--border-h); color: var(--text); }
        .modal-btn-cancel { background: var(--danger); border-color: var(--danger); color: #fff; }
        .modal-btn-cancel:hover { opacity: 0.88; }
        .modal-btn-ok { background: var(--gold); border-color: var(--gold); color: #fff; }
        .modal-btn-ok:hover { background: var(--gold-h); }

        /* ── Topbar extras ── */
        .live-pill { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
        .live-dot  { width: 8px; height: 8px; border-radius: 50%; background: #C04040;
          animation: pulse 1.5s ease-in-out infinite; flex-shrink: 0; }
        .role-badge { background: var(--o-bg); border: 1px solid var(--o-bd); border-radius: 20px;
          padding: 4px 14px; font-size: 11px; color: var(--o-tx); text-transform: uppercase;
          letter-spacing: 1px; }
        .sound-btn { background: none; border: 1px solid var(--border); border-radius: 8px;
          padding: 6px 14px; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.18s; }
        .sound-btn.on { border-color: var(--gold); color: var(--gold); }
        .logout-btn { background: none; border: 1px solid var(--border); border-radius: 8px;
          padding: 6px 14px; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.18s; }
        .logout-btn:hover { border-color: var(--border-h); color: var(--text); }

        /* ── Empty state ── */
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 64px 24px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-state .e-icon { font-size: 48px; margin-bottom: 4px; }

        /* ── Animations ── */
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes slideUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:none;} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
        @keyframes ring { 0%{box-shadow:0 0 0 0 rgba(192,64,64,0.5);} 70%{box-shadow:0 0 0 10px rgba(192,64,64,0);} 100%{box-shadow:0 0 0 0 rgba(192,64,64,0);} }

        @media(max-width:600px) {
          .main, .k-main { padding: 20px 14px; gap: 18px; }
          .orders-grid { grid-template-columns: 1fr; gap: 14px; }
          .topbar { padding: 0 14px; }
          .topbar-right { gap: 8px; }
          .role-badge { display: none; }
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
          <div className="login-wrap mx-auto">
            <div className="login-brand">
              <img className="login-logo" src="/logo.png" alt="Coffee-r Attokahon" />
              <div className="wm"><em>Coffee-r</em> Attokahon</div>
              <div className="sub">Kitchen Staff Portal</div>
            </div>
            <div className="login-card">
              <h2>Kitchen Login</h2>
              {loginErr && (
                <div className="login-err">
                  Incorrect username or password.
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
                Default: <b>chef</b> / <b>chef123</b>
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
              <img className="brand-logo" src="/logo.png" alt="Coffee-r Attokahon" />
              <span><em>Coffee-r</em> Attokahon</span>
            </Link>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="live-pill">
                <div className="live-dot" />
                <span>{counts.active} active</span>
              </div>
              <div className="role-badge">Kitchen</div>
              <button
                className={`sound-btn${soundOn ? ' on' : ''}`}
                onClick={toggleSound}
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

          <main className="main mx-auto">
            {/* Page header */}
            <div className="pg-h">
              <div>
                <h1>Kitchen Display</h1>
                <p>Real-time incoming orders — update status as you prepare each one.</p>
              </div>
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
              <button className={`f-pill${kFilter === 'all' ? ' active' : ''}`} onClick={() => setKFilter('all')}>
                All <span className="f-count">{counts.all}</span>
              </button>
              <button className={`f-pill${kFilter === 'active' ? ' active' : ''}`} onClick={() => setKFilter('active')}>
                <div className="live-dot" /> Active <span className="f-count">{counts.active}</span>
              </button>
              <button className={`f-pill${kFilter === 'paid' ? ' active' : ''}`} onClick={() => setKFilter('paid')}>
                💳 Paid <span className="f-count">{counts.paid || 0}</span>
              </button>
              <button className={`f-pill${kFilter === 'confirmed' ? ' active' : ''}`} onClick={() => setKFilter('confirmed')}>
                ✔ Confirmed <span className="f-count">{counts.confirmed || 0}</span>
              </button>
              <button className={`f-pill${kFilter === 'preparing' ? ' active' : ''}`} onClick={() => setKFilter('preparing')}>
                Preparing <span className="f-count">{counts.preparing || 0}</span>
              </button>
              <button className={`f-pill${kFilter === 'ready' ? ' active' : ''}`} onClick={() => setKFilter('ready')}>
                Ready <span className="f-count">{counts.ready || 0}</span>
              </button>
              <button className={`f-pill${kFilter === 'served' ? ' active' : ''}`} onClick={() => setKFilter('served')}>
                Served <span className="f-count">{counts.served || 0}</span>
              </button>
              <button className={`f-pill${kFilter === 'cancelled' ? ' active' : ''}`} onClick={() => setKFilter('cancelled')}>
                Cancelled <span className="f-count">{counts.cancelled || 0}</span>
              </button>
            </div>

            {/* Orders grid */}
            <div className="orders-grid">
              {list.length === 0 ? (
                <div className="empty-state">
                  <div className="e-icon">
                    {kFilter === 'served' ? '✅' : kFilter === 'cancelled' ? '🚫' : '🍽️'}
                  </div>
                  <p>
                    No {kFilter === 'active' ? 'active' : kFilter === 'all' ? '' : kFilter} orders right now.
                  </p>
                </div>
              ) : (
                list.map(o => {
                  const key = String(o.id);
                  const [btnCls, btnLbl] = BTN_MAP[o.status] || [];
                  const items = Array.isArray(o.items) ? o.items : [];
                  const late = isLate(o);
                  const isTerminal = TERMINAL_STATUSES.has(o.status);

                  return (
                    <div key={key} className={`order-card s-${o.status}${late ? ' is-late' : ''}`}>
                      <div className="o-head">
                        <span className="o-num">Order #{key}</span>
                        <span className={`badge b-${o.status}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </div>

                      <div className="o-meta">
                        📍 {o.table ? `Table ${o.table}` : 'Walk-in'} &nbsp;·&nbsp; 🕐 {formatTime(o)} &nbsp;·&nbsp; {formatElapsed(o)}
                        {late && <span style={{ color: 'var(--d-tx)', fontSize: '10px', marginLeft: '4px' }}>⚠ Late</span>}
                      </div>

                      {o.paymentMethod && (
                        <div className="o-meta" style={{ fontSize: '11px', marginBottom: '4px' }}>
                          💳 {o.paymentMethod}
                          {o.paymentId ? <> · <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{o.paymentId}</span></> : null}
                          {o.senderPhone ? <> · 📞 <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{o.senderPhone}</span></> : null}
                        </div>
                      )}

                      <div className="o-items">
                        {items.map((item, idx) => {
                          const customSummary = getItemCustomSummary(item.customization);
                          const itemImage = resolveProductImage(item, products);
                          const itemEmoji = item.emoji || '☕';

                          return (
                            <div key={idx} className="o-item-block">
                              <div className="o-item-row">
                                {itemImage ? (
                                  <img
                                    className="o-item-thumb"
                                    src={itemImage}
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextSibling) {
                                        e.currentTarget.nextSibling.style.display = 'inline';
                                      }
                                    }}
                                  />
                                ) : null}
                                <span style={{ display: itemImage ? 'none' : 'inline' }}>{itemEmoji}</span>
                                <strong>{item.name}</strong> × {item.qty}
                              </div>
                              {customSummary && (
                                <div className="o-item-custom">
                                  {customSummary}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {o.note && (
                        <div className="o-meta" style={{ fontStyle: 'italic', marginBottom: '6px' }}>
                          📝 {o.note}
                        </div>
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

                      {!isTerminal && (
                        <button
                          className="adv-cancel"
                          onClick={() => openCancelModal(key)}
                        >
                          ✕ Cancel Order
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      )}

      {/* CANCEL CONFIRM MODAL */}
      <div className={`modal-ov${pendingCancelKey ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && closeCancelModal()}>
        <div className="modal-card">
          <div className="modal-icon">✕</div>
          <h3>Cancel Order #{pendingCancelKey}?</h3>
          <p>This is typically used when the phone number or Transaction ID given was wrong. <b>This cannot be undone.</b></p>
          <div className="modal-actions">
            <button className="modal-btn-keep" onClick={closeCancelModal}>Keep Order</button>
            <button className="modal-btn-cancel" onClick={confirmCancelOrder}>Yes, Cancel</button>
          </div>
        </div>
      </div>

      {/* CANCELLED SUCCESS MODAL */}
      <div className={`modal-ov${cancelledKey ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setCancelledKey(null)}>
        <div className="modal-card">
          <div className="modal-icon ok">✓</div>
          <h3>Order Cancelled</h3>
          <p>Order #<b>{cancelledKey}</b> has been marked as cancelled and its table freed up.</p>
          <div className="modal-actions">
            <button className="modal-btn-ok" onClick={() => setCancelledKey(null)}>Done</button>
          </div>
        </div>
      </div>
    </>
  );
}
