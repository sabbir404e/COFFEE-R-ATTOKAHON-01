'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

export default function AdminPage() {
  // Context provides Supabase-backed state
  const { toggleTheme, products, tables, orders, payments, users, deleteTable, feedback } = useApp();

  const [me, setMe] = useState(null);
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // Modals state
  const [ovProduct, setOvProduct] = useState(false);
  const [ovAccount, setOvAccount] = useState(false);
  const [ovTable, setOvTable] = useState(false);
  const [ovConfirm, setOvConfirm] = useState(false);

  const [editPid, setEditPid] = useState(null);
  const [editAccIdx, setEditAccIdx] = useState(null);
  const [editTableId, setEditTableId] = useState(null);

  // Form Fields
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('Coffee');
  const [pPrice, setPPrice] = useState('');
  const [pEmoji, setPEmoji] = useState('☕');
  const [pImage, setPImage] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pAvail, setPAavail] = useState('1');

  const [aUser, setAUser] = useState('');
  const [aPass, setAPass] = useState('');
  const [aRole, setARole] = useState('admin');

  const [tName, setTName] = useState('');
  const [tNumber, setTNumber] = useState('');
  const [tSeats, setTSeats] = useState('4');
  const [tStatus, setTStatus] = useState('available');
  const [tNote, setTNote] = useState('');

  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [refunding, setRefunding] = useState(false);


  // On mount: restore admin session
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = localStorage.getItem('ca_admin_user');
      if (saved) {
        try { setMe(JSON.parse(saved)); } catch {}
      }
    });
    return () => { active = false; };
  }, []);

  const doLogin = async () => {
    if (!lUser.trim() || !lPass) return;
    setLoginLoading(true);
    setLoginErr(false);
    const { data: found } = await supabase
      .from('users')
      .select('*')
      .eq('username', lUser.trim())
      .eq('password', lPass)
      .eq('role', 'admin')
      .single();
    setLoginLoading(false);
    if (!found) {
      setLoginErr(true);
      return;
    }
    setLoginErr(false);
    setMe(found);
    localStorage.setItem('ca_admin_user', JSON.stringify(found));
  };

  const doLogout = () => {
    setMe(null);
    localStorage.removeItem('ca_admin_user');
    setLUser('');
    setLPass('');
  };

  const openProductModal = (id) => {
    setEditPid(id);
    if (id) {
      const p = products.find(x => x.id === id);
      if (p) {
        setPName(p.name);
        setPCat(p.cat);
        setPPrice(p.price);
        setPEmoji(p.emoji || '☕');
        setPImage(p.image || '');
        setPDesc(p.desc || '');
        setPAavail(p.avail !== false ? '1' : '0');
      }
    } else {
      setPName('');
      setPCat('Coffee');
      setPPrice('');
      setPEmoji('☕');
      setPImage('');
      setPDesc('');
      setPAavail('1');
    }
    setOvProduct(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPImage(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    if (!pName.trim() || !pPrice) {
      alert('Name and price are required.');
      return;
    }
    const data = {
      name: pName.trim(),
      category: pCat,
      price: parseInt(pPrice),
      emoji: pEmoji.trim() || '☕',
      image_url: pImage,
      description: pDesc.trim(),
      is_available: pAvail === '1'
    };
    if (editPid) {
      await supabase.from('products').update(data).eq('id', editPid);
    } else {
      await supabase.from('products').insert(data);
    }
    setOvProduct(false);
  };

  const toggleAvail = async (id) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    await supabase.from('products').update({ is_available: !(prod.avail !== false) }).eq('id', id);
  };

  const deleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id', id);
  };

  const openAccountModal = (idx) => {
    setEditAccIdx(idx);
    if (idx !== null) {
      const u = users[idx];
      setAUser(u.username);
      setAPass(u.password);
      setARole(u.role);
    } else {
      setAUser('');
      setAPass('');
      setARole('kitchen');
    }
    setOvAccount(true);
  };

  const saveAccount = async () => {
    if (!aUser.trim() || !aPass.trim()) {
      alert('Username and password are required.');
      return;
    }
    if (editAccIdx !== null) {
      const u = users[editAccIdx];
      await supabase.from('users').update({ username: aUser.trim(), password: aPass.trim(), role: aRole }).eq('id', u.id);
    } else {
      const exists = users.find(u => u.username === aUser.trim());
      if (exists) { alert('Username already exists.'); return; }
      await supabase.from('users').insert({ username: aUser.trim(), password: aPass.trim(), role: aRole });
    }
    setOvAccount(false);
  };

  const deleteAccount = async (idx) => {
    if (users[idx]?.username === 'admin') return;
    await supabase.from('users').delete().eq('id', users[idx].id);
  };

  const openTableModal = (id = null) => {
    setEditTableId(id);
    const table = id === null ? null : tables.find(item => item.id === id);
    if (table) {
      setTName(table.name);
      setTNumber(String(table.id));
      setTSeats(String(table.seats));
      setTStatus(table.status);
      setTNote(table.note || '');
    } else {
      const nextId = tables.length ? Math.max(...tables.map(tableItem => tableItem.id)) + 1 : 1;
      setTName(`Table ${nextId}`);
      setTNumber(String(nextId));
      setTSeats('4');
      setTStatus('available');
      setTNote('');
    }
    setOvTable(true);
  };

  const saveTable = async () => {
    const id = Number.parseInt(tNumber, 10);
    const seats = Math.max(1, Number.parseInt(tSeats, 10) || 4);
    if (!tName.trim() || !Number.isInteger(id) || id < 1 || id > 100) {
      alert('Enter a table name and a number from 1 to 100.');
      return;
    }
    if (tables.some(table => table.id === id && table.id !== editTableId)) {
      alert('A table with that number already exists.');
      return;
    }
    const tableData = { id, name: tName.trim(), seats, status: tStatus, note: tNote.trim() };
    if (editTableId === null) {
      await supabase.from('dining_tables').insert(tableData);
    } else {
      await supabase.from('dining_tables').update({ name: tName.trim(), seats, status: tStatus, note: tNote.trim() }).eq('id', editTableId);
    }
    setOvTable(false);
  };

  const cycleTableStatus = async (id) => {
    const statuses = ['available', 'occupied', 'reserved', 'cleaning'];
    const t = tables.find(table => table.id === id);
    if (!t) return;
    const next = statuses[(statuses.indexOf(t.status) + 1) % statuses.length];
    await supabase.from('dining_tables').update({ status: next }).eq('id', id);
  };

  const confirmAction = (msg, cb) => {
    setConfirmMsg(msg);
    setConfirmCallback(() => () => { cb(); setOvConfirm(false); });
    setOvConfirm(true);
  };

  if (!me) {
    return (
      <div className="login-screen">
        <div className="glow" />
        <div className="login-wrap">
          <div className="login-brand">
            <div className="wm"><em>Coffee-r</em> Attokahon</div>
            <div className="sub">Admin Portal</div>
          </div>
          <div className="login-card">
            <h2>Admin Login</h2>
            {loginErr && <div className="login-err">Incorrect credentials. Admin only.</div>}
            <div className="field">
              <label>Username</label>
              <input className="inp" type="text" value={lUser} onChange={e => setLUser(e.target.value)} placeholder="username" onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="inp" type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="password" onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <button className="btn-login" onClick={doLogin} disabled={loginLoading}>
              {loginLoading ? 'Signing in…' : 'Sign In →'}
            </button>
            <div className="login-hint">Default: <b>admin</b> / <b>admin123</b></div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Stats
  const activeOrders = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed').length;
  const servedOrders = orders.filter(o => o.status === 'served').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'failed').reduce((acc, curr) => acc + (curr.total || 0), 0);
  const todayStr = new Date().toDateString();
  const todayRev = orders.filter(o => new Date(o.time).toDateString() === todayStr && o.status !== 'cancelled' && o.status !== 'failed').reduce((acc, curr) => acc + (curr.total || 0), 0);
  const todayOrders = orders.filter(o => new Date(o.time).toDateString() === todayStr && o.status !== 'cancelled' && o.status !== 'failed').length;

  return (
    <>
      <style>{`
        .app-body { display: flex; min-height: 0; height: calc(100vh - 58px); }
        .sidebar { width: 205px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; transition: var(--transition-theme); }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.16s; border: none; background: none; width: 100%; text-align: left; }
        .nav-item:hover { background: rgba(200,148,56,0.07); color: var(--text); }
        .nav-item.active { background: rgba(200,148,56,0.12); color: var(--gold); }
        .nav-sep { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
        .content { flex: 1; padding: 24px; overflow-y: auto; }
        .role-badge { background: var(--pill-bg); border: 1px solid var(--border-h); border-radius: 20px; padding: 3px 12px; font-size: 11px; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; }
        .badge.b-refunded { background: var(--x-bg); border-color: var(--x-bd); color: var(--x-tx); }
        .logout-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.18s; }
        .logout-btn:hover { border-color: var(--border-h); color: var(--text); }
        
        .pg-title { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 26px; margin-bottom: 4px; }
        .pg-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 12px; margin-bottom: 26px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; transition: var(--transition-theme); }
        .stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 8px; }
        .stat-val { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 30px; line-height: 1; }
        .stat-val small { font-size: 15px; color: var(--gold); }
        
        .tbl-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: auto; transition: var(--transition-theme); }
        .tbl-wrap table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13px; }
        .tbl-wrap thead th { text-align: left; padding: 11px 16px; background: var(--bg2); color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; border-bottom: 1px solid var(--border); font-weight: 600; }
        .tbl-wrap tbody td { padding: 11px 16px; color: var(--text-2); border-bottom: 1px solid var(--border); }
        .tbl-wrap tbody tr:last-child td { border-bottom: none; }
        .tbl-wrap tbody tr:hover td { background: var(--hover-row); }
        
        .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .btn-add { padding: 9px 18px; background: var(--gold); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.18s; display: flex; align-items: center; gap: 6px; }
        .btn-add:hover { background: var(--gold-h); }
        .btn-edit { padding: 4px 10px; border-radius: 7px; border: 1px solid var(--border-h); background: none; font-size: 12px; color: var(--gold); cursor: pointer; transition: all 0.15s; }
        .btn-edit:hover { background: rgba(200,148,56,0.15); }
        .btn-del { padding: 4px 10px; border-radius: 7px; border: 1px solid var(--d-bd); background: none; font-size: 12px; color: var(--d-tx); cursor: pointer; transition: all 0.15s; }
        .btn-del:hover { background: var(--d-bg); }
        .avail-btn { padding: 3px 10px; border-radius: 10px; border: 1px solid; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
        .avail-on { background: var(--o-bg); border-color: var(--o-bd); color: var(--o-tx); }
        .avail-on:hover { background: rgba(42,114,72,0.3); }
        .avail-off { background: var(--d-bg); border-color: var(--d-bd); color: var(--d-tx); }
        .avail-off:hover { background: rgba(192,64,64,0.3); }
        
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 500; align-items: center; justify-content: center; padding: 20px; }
        .overlay.open { display: flex; animation: fadeIn 0.2s; }
        .modal { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 26px; width: 100%; max-width: 420px; max-height: 88vh; overflow-y: auto; box-shadow: var(--shadow); transition: var(--transition-theme); }
        .modal h3 { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 22px; margin-bottom: 18px; }
        .modal-btns { display: flex; gap: 10px; margin-top: 18px; }
        .btn-cancel { flex: 1; padding: 10px; background: none; border: 1px solid var(--border); border-radius: 9px; color: var(--muted); font-size: 13px; cursor: pointer; transition: all 0.18s; }
        .btn-cancel:hover { border-color: var(--border-h); color: var(--text); }
        .btn-save { flex: 2; padding: 10px; background: var(--gold); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.18s; }
        .btn-save:hover { background: var(--gold-h); }
        .confirm-box { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 26px; width: 100%; max-width: 310px; text-align: center; box-shadow: var(--shadow); }
        .confirm-box h3 { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 20px; margin-bottom: 10px; }
        .confirm-box p { font-size: 14px; color: var(--muted); margin-bottom: 22px; line-height: 1.6; }
        .btn-del-ok { flex: 1; padding: 10px; background: #C04040; color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-del-ok:hover { background: #D05050; }
        
        .empty-tbl { text-align: center; padding: 28px; color: var(--muted); font-size: 13px; }
        @media(max-width:768px){
          .app-body{height:auto;min-height:calc(100vh - 58px);flex-direction:column;}
          .sidebar{width:100%;flex-direction:row;gap:8px;overflow-x:auto;border-right:none;border-bottom:1px solid var(--border);padding:10px 12px;position:sticky;top:58px;z-index:20;}
          .nav-item{width:auto;white-space:nowrap;flex-shrink:0;padding:8px 12px;}
          .nav-sep{display:none;}
          .content{padding:16px;overflow-y:visible;}
          .topbar{padding:0 14px;gap:10px;}
          .topbar-right{gap:8px;}
          .role-badge,.theme-label{display:none;}
          .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
        }
        @media(max-width:480px){
          .brand{font-size:17px;}
          .logout-btn{padding:5px 9px;}
          .stats-grid{grid-template-columns:1fr;}
          .modal{padding:20px;}
        }
      `}</style>

      <div id="appScreen" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
          <div className="topbar-right">
            <div className="role-badge">Admin</div>
            <span className="theme-label">🌙</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme" />
            <span className="theme-label">☀️</span>
            <button className="logout-btn" onClick={doLogout}>Sign out</button>
          </div>
        </div>

        <div className="app-body">
          <nav className="sidebar">
            <button className={`nav-item${currentTab === 'dashboard' ? ' active' : ''}`} onClick={() => setCurrentTab('dashboard')}>📊 Dashboard</button>
            <button className={`nav-item${currentTab === 'products' ? ' active' : ''}`} onClick={() => setCurrentTab('products')}>🛍 Products</button>
            <button className={`nav-item${currentTab === 'orders' ? ' active' : ''}`} onClick={() => setCurrentTab('orders')}>📋 Orders</button>
            <button className={`nav-item${currentTab === 'payments' ? ' active' : ''}`} onClick={() => setCurrentTab('payments')}>💳 Payments</button>
            <button className={`nav-item${currentTab === 'tables' ? ' active' : ''}`} onClick={() => setCurrentTab('tables')}>🪑 Tables</button>
            <button className={`nav-item${currentTab === 'accounts' ? ' active' : ''}`} onClick={() => setCurrentTab('accounts')}>👥 Accounts</button>
            <button className={`nav-item${currentTab === 'reports' ? ' active' : ''}`} onClick={() => setCurrentTab('reports')}>📈 Reports</button>
            <button className={`nav-item${currentTab === 'feedback' ? ' active' : ''}`} onClick={() => setCurrentTab('feedback')}>⭐ Feedback</button>
            <hr className="nav-sep" />
            <button className="nav-item" onClick={() => window.open('/order', '_blank')}>🛒 Preview Menu</button>
            <button className="nav-item" onClick={() => window.open('/qr-print', '_blank')}>🖨 QR Code Printer</button>
          </nav>

          <div className="content">
            {currentTab === 'dashboard' && (
              <div>
                <div className="pg-title">Dashboard</div>
                <div className="pg-sub">Live overview of Coffee-r Attokahon operations.</div>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-lbl">Today&apos;s Orders</div><div className="stat-val">{todayOrders}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Today&apos;s Revenue</div><div className="stat-val">৳{todayRev.toLocaleString()}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Active Orders</div><div className="stat-val">{activeOrders}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Served Today</div><div className="stat-val">{servedOrders}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Total Revenue</div><div className="stat-val">৳{totalRevenue.toLocaleString()}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Menu Items</div><div className="stat-val">{products.length}</div></div>
                </div>

                <div className="pg-title" style={{ fontSize: '20px', marginBottom: '12px', marginTop: '8px' }}>Recent Paid Orders</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Table</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{o.id}</td>
                          <td>{o.table || '—'}</td>
                          <td>{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
                          <td style={{ fontWeight: 600 }}>৳{o.total}</td>
                          <td style={{ fontSize: '11px' }}>{o.paymentMethod || '—'}</td>
                          <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(o.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                      {orders.length === 0 && <tr><td colSpan="7" className="empty-tbl">No orders yet.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="pg-title" style={{ fontSize: '20px', marginBottom: '12px', marginTop: '24px' }}>Recent Payments</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>TXN ID</th><th>Invoice</th><th>Table</th><th>Method</th><th>Amount</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 6).map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txn_id || p.txnId || '—'}</td>
                          <td style={{ fontSize: '12px' }}>{p.invoice_num || p.invoiceNum || '—'}</td>
                          <td>{p.table_id || p.table || '—'}</td>
                          <td>{p.payment_method || p.method || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(p.created_at || p.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && <tr><td colSpan="6" className="empty-tbl">No payments yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'products' && (
              <div>
                <div className="toolbar">
                  <div>
                    <div className="pg-title">Products</div>
                    <div className="pg-sub">Add, edit or remove menu items. Changes appear instantly for customers.</div>
                  </div>
                  <button className="btn-add" onClick={() => openProductModal(null)}>+ Add Product</button>
                </div>

                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {p.image ? (
                                <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.emoji || '☕'}</div>
                              )}
                              <div>
                                <strong style={{ color: 'var(--text)' }}>{p.name}</strong>
                                <br />
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.desc}</span>
                              </div>
                            </div>
                          </td>
                          <td>{p.cat}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>৳{p.price}</td>
                          <td>
                            <button className={`avail-btn ${p.avail !== false ? 'avail-on' : 'avail-off'}`} onClick={() => toggleAvail(p.id)}>
                              {p.avail !== false ? '✓ Available' : '✗ Unavailable'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn-edit" onClick={() => openProductModal(p.id)}>Edit</button>
                              <button className="btn-del" onClick={() => confirmAction('Delete this product from the menu?', () => deleteProduct(p.id))}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'orders' && (
              <div>
                <div className="pg-title">Orders</div>
                <div className="pg-sub">Full history — {orders.length} total orders.</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Table</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{o.id}</td>
                          <td>{o.table || '—'}</td>
                          <td>{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
                          <td style={{ fontWeight: 600 }}>৳{o.total}</td>
                          <td style={{ fontSize: '11px' }}>{o.paymentMethod || '—'}</td>
                          <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(o.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'payments' && (
              <div>
                <div className="pg-title">Payments</div>
                <div className="pg-sub">All completed transactions.</div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="stat-card"><div className="stat-lbl">Total Payments</div><div className="stat-val">{payments.length}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Total Revenue</div><div className="stat-val">৳{totalRevenue.toLocaleString()}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Avg. Transaction</div><div className="stat-val">৳{payments.length ? Math.round(totalRevenue / payments.length) : 0}</div></div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>TXN ID</th><th>Invoice</th><th>Table</th><th>Method</th><th>Amount</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txn_id || p.txnId || '—'}</td>
                          <td style={{ fontSize: '12px' }}>{p.invoice_num || p.invoiceNum || '—'}</td>
                          <td>{p.table_id || p.table || '—'}</td>
                          <td>{p.payment_method || p.method || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                          <td>
                            <span className={`badge b-${p.status || 'paid'}`}>
                              {p.status || 'paid'}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(p.created_at || p.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'accounts' && (
              <div>
                <div className="toolbar">
                  <div>
                    <div className="pg-title">Accounts</div>
                    <div className="pg-sub">Manage staff login credentials and roles.</div>
                  </div>
                  <button className="btn-add" onClick={() => openAccountModal(null)}>+ Add Account</button>
                </div>

                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Username</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={i}>
                          <td><strong style={{ color: 'var(--text)' }}>{u.username}</strong></td>
                          <td><span className={`badge b-${u.role}`}>{u.role}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn-edit" onClick={() => openAccountModal(i)}>Edit</button>
                              {u.username !== 'admin' ? (
                                <button className="btn-del" onClick={() => confirmAction(`Delete account "${u.username}"?`, () => deleteAccount(i))}>Delete</button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Protected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'reports' && (() => {
              const from = reportFrom ? new Date(`${reportFrom}T00:00:00`) : null;
              const to = reportTo ? new Date(`${reportTo}T23:59:59`) : null;
              const reportOrders = orders.filter(order => {
                const time = new Date(order.time || order.createdAt);
                return !Number.isNaN(time.getTime()) && (!from || time >= from) && (!to || time <= to) && !['cancelled', 'failed', 'refunded'].includes(order.status);
              });
              const revenue = reportOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
              const byMethod = reportOrders.reduce((summary, order) => {
                const method = order.paymentMethod || 'Other';
                summary[method] = (summary[method] || 0) + (Number(order.total) || 0);
                return summary;
              }, {});
              return (
                <div>
                  <div className="pg-title">Reports</div>
                  <div className="pg-sub">Revenue and payment breakdown by date range.</div>
                  <div className="toolbar" style={{ justifyContent: 'flex-start', alignItems: 'end' }}>
                    <div className="field" style={{ margin: 0 }}><label htmlFor="reportFrom">From</label><input id="reportFrom" className="inp" type="date" value={reportFrom} onChange={event => setReportFrom(event.target.value)} /></div>
                    <div className="field" style={{ margin: 0 }}><label htmlFor="reportTo">To</label><input id="reportTo" className="inp" type="date" value={reportTo} onChange={event => setReportTo(event.target.value)} /></div>
                    <button className="btn-edit" onClick={() => { setReportFrom(''); setReportTo(''); }}>Clear range</button>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card"><div className="stat-lbl">Orders</div><div className="stat-val">{reportOrders.length}</div></div>
                    <div className="stat-card"><div className="stat-lbl">Revenue</div><div className="stat-val">৳{revenue.toLocaleString()}</div></div>
                    <div className="stat-card"><div className="stat-lbl">Avg. Order</div><div className="stat-val">৳{reportOrders.length ? Math.round(revenue / reportOrders.length) : 0}</div></div>
                  </div>
                  <div className="pg-title" style={{ fontSize: '18px', marginBottom: '12px' }}>Payment Method Breakdown</div>
                  <div className="tbl-wrap"><table><thead><tr><th>Method</th><th>Orders</th><th>Revenue</th><th>Share</th></tr></thead><tbody>{Object.entries(byMethod).length ? Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => <tr key={method}><td>{method}</td><td>{reportOrders.filter(order => (order.paymentMethod || 'Other') === method).length}</td><td style={{ color: 'var(--gold)', fontWeight: 600 }}>৳{amount.toLocaleString()}</td><td>{revenue ? Math.round((amount / revenue) * 100) : 0}%</td></tr>) : <tr><td colSpan="4" className="empty-tbl">No payment data.</td></tr>}</tbody></table></div>
                </div>
              );
            })()}

            {currentTab === 'feedback' && (
              <div>
                <div className="pg-title">Feedback</div>
                <div className="pg-sub">Customer star ratings and comments after service.</div>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-lbl">Total Reviews</div><div className="stat-val">{feedback.length}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Average Rating</div><div className="stat-val">{feedback.length ? (feedback.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / feedback.length).toFixed(1) : '0.0'} <small>/ 5</small></div></div>
                  <div className="stat-card"><div className="stat-lbl">5-Star Reviews</div><div className="stat-val">{feedback.filter(item => Number(item.rating) === 5).length}</div></div>
                </div>
                <div className="tbl-wrap"><table><thead><tr><th>Table</th><th>Order</th><th>Rating</th><th>Comment</th><th>Time</th></tr></thead><tbody>{feedback.length ? [...feedback].reverse().map((item, index) => <tr key={`${item.orderId || 'feedback'}-${index}`}><td>{item.table || '—'}</td><td style={{ color: 'var(--gold)' }}>{item.orderId || '—'}</td><td style={{ color: 'var(--gold)' }}>{'★'.repeat(Number(item.rating) || 0)}{'☆'.repeat(5 - (Number(item.rating) || 0))}</td><td>{item.comment || '—'}</td><td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(item.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td></tr>) : <tr><td colSpan="5" className="empty-tbl">No feedback submitted yet.</td></tr>}</tbody></table></div>
              </div>
            )}

            {currentTab === 'tables' && (() => {
              const activeByTable = {};
              orders.forEach(o => {
                if (o.table && o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed') {
                  if (!activeByTable[o.table]) activeByTable[o.table] = [];
                  activeByTable[o.table].push(o);
                }
              });
              return (
                <div>
                  <div className="toolbar">
                    <div>
                      <div className="pg-title">Tables</div>
                      <div className="pg-sub" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span>Manage dining tables · <strong style={{color:'var(--gold)'}}>{tables.length} total</strong></span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', animation: 'ftpulse 1.8s ease-in-out infinite' }} />
                          Live · instant updates
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '3px 12px', borderRadius: '20px', background: 'rgba(192,64,64,0.12)', border: '1px solid rgba(192,64,64,0.30)', fontSize: '11px', color: '#E08080', fontWeight: 600 }}>
                          🔴 {Object.keys(activeByTable).length} occupied
                        </span>
                        <span style={{ padding: '3px 12px', borderRadius: '20px', background: 'rgba(42,114,72,0.12)', border: '1px solid rgba(42,114,72,0.30)', fontSize: '11px', color: '#60C890', fontWeight: 600 }}>
                          🟢 {tables.filter(t => !activeByTable[t.id]).length} vacant
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-save"
                      style={{ minWidth: '118px', height: '40px', padding: '0 14px', marginBottom: 0, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => openTableModal(null)}
                      disabled={tables.length >= 100}
                      aria-label="Add Table"
                      title="Add Table"
                    >
                      + Add Table
                    </button>
                  </div>

                  {/* Live Table Status Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                    {tables.map(t => {
                      const active = activeByTable[t.id] || [];
                      const hasOrders = active.length > 0;
                      const latestStatus = hasOrders ? active[active.length - 1].status : null;
                      const statusColors = {
                        paid:      { bg: 'rgba(200,148,56,0.10)', border: 'rgba(200,148,56,0.35)', dot: 'var(--gold)' },
                        preparing: { bg: 'rgba(58,120,200,0.10)', border: 'rgba(58,120,200,0.35)', dot: '#6AABFF' },
                        ready:     { bg: 'rgba(42,114,72,0.12)',  border: 'rgba(42,114,72,0.35)',  dot: '#60C890' },
                      };
                      const sc = latestStatus ? (statusColors[latestStatus] || statusColors.paid) : null;
                      const tableLabel = t.name || `Table ${t.id}`;
                      return (
                        <div key={t.id} style={{
                          background: hasOrders ? sc.bg : 'var(--card)',
                          border: `1px solid ${hasOrders ? sc.border : 'var(--border)'}`,
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '16px', fontWeight: 700 }}>{tableLabel}</span>
                            {hasOrders && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot, display: 'inline-block', boxShadow: `0 0 6px ${sc.dot}` }} />}
                          </div>
                          <div style={{ fontSize: '11px', color: hasOrders ? 'var(--text-2)' : 'var(--muted)' }}>
                            {t.seats ? `${t.seats} seats · ` : ''}{hasOrders ? `${active.length} active order${active.length > 1 ? 's' : ''}` : 'Vacant'}
                          </div>
                          {hasOrders && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                              {active.map(o => (
                                <span key={o.id} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                                  #{o.id} {o.status}
                                </span>
                              ))}
                            </div>
                          )}
                          {!hasOrders && (
                            <div style={{ fontSize: '10px', color: 'var(--border-h)', marginTop: '2px' }}>—</div>
                          )}
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <a
                              href={`/order?table=${t.id}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '10px', color: 'var(--gold)', textDecoration: 'none', background: 'rgba(200,148,56,0.10)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(200,148,56,0.25)' }}
                            >
                              Open Menu →
                            </a>
                            <button
                              type="button"
                              onClick={() => confirmAction(
                                hasOrders ? `${tableLabel} has active orders. Delete it anyway?` : `Delete ${tableLabel}?`,
                                () => deleteTable(t.id)
                              )}
                              disabled={tables.length <= 1}
                              aria-label={`Delete ${tableLabel}`}
                              style={{ border: '1px solid rgba(192,64,64,0.35)', borderRadius: '6px', background: 'rgba(192,64,64,0.10)', color: 'var(--d-tx)', padding: '3px 7px', fontSize: '10px', cursor: tables.length <= 1 ? 'not-allowed' : 'pointer', opacity: tables.length <= 1 ? 0.5 : 1 }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Product Modal Overlay */}
      <div className={`overlay${ovProduct ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvProduct(false)}>
        <div className="modal">
          <h3>{editPid ? 'Edit Product' : 'Add Product'}</h3>
          <div className="field">
            <label>Product Name</label>
            <input className="inp" type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Caramel Latte" />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="inp" value={pCat} onChange={e => setPCat(e.target.value)}>
              <option>Coffee</option>
              <option>Specialty</option>
              <option>Food</option>
              <option>Dessert</option>
              <option>Drinks</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field">
              <label>Price (৳)</label>
              <input className="inp" type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="120" min="1" />
            </div>
            <div className="field">
              <label>Emoji (Fallback)</label>
              <input className="inp" type="text" value={pEmoji} onChange={e => setPEmoji(e.target.value)} placeholder="☕" maxLength="4" />
            </div>
          </div>
          <div className="field">
            <label>Product Image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {pImage ? (
                <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <img src={pImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setPImage('')} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: '12px' }}>&times;</button>
                </div>
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed var(--border-h)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--muted)', flexShrink: 0 }}>
                  {pEmoji || '☕'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '13px', width: '100%' }} />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.4 }}>Max 400x400. Images are automatically compressed to save space.</div>
              </div>
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="inp" value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Short description..." />
          </div>
          <div className="field">
            <label>Availability</label>
            <select className="inp" value={pAvail} onChange={e => setPAavail(e.target.value)}>
              <option value="1">Available</option>
              <option value="0">Unavailable</option>
            </select>
          </div>
          <div className="modal-btns">
            <button className="btn-cancel" onClick={() => setOvProduct(false)}>Cancel</button>
            <button className="btn-save" onClick={saveProduct}>Save Product</button>
          </div>
        </div>
      </div>

      {/* Table Modal Overlay */}
      <div className={`overlay${ovTable ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvTable(false)}>
        <div className="modal">
          <h3>{editTableId !== null ? 'Edit Table' : 'Add Table'}</h3>
          <div className="field">
            <label>Table Name</label>
            <input className="inp" type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="e.g. Table 1" />
          </div>
          <div className="field">
            <label>Table Number (ID)</label>
            <input className="inp" type="number" value={tNumber} onChange={e => setTNumber(e.target.value)} placeholder="1" disabled={editTableId !== null} />
          </div>
          <div className="field">
            <label>Seats</label>
            <input className="inp" type="number" value={tSeats} onChange={e => setTSeats(e.target.value)} placeholder="4" />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="inp" value={tStatus} onChange={e => setTStatus(e.target.value)}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>
          <div className="field">
            <label>Note</label>
            <input className="inp" type="text" value={tNote} onChange={e => setTNote(e.target.value)} placeholder="Optional note" />
          </div>
          <div className="modal-btns">
            <button className="btn-cancel" onClick={() => setOvTable(false)}>Cancel</button>
            <button className="btn-save" onClick={saveTable}>Save Table</button>
          </div>
        </div>
      </div>

      {/* Account Modal Overlay */}
      <div className={`overlay${ovAccount ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvAccount(false)}>
        <div className="modal">
          <h3>{editAccIdx !== null ? 'Edit Account' : 'Add Account'}</h3>
          <div className="field">
            <label>Username</label>
            <input className="inp" type="text" value={aUser} onChange={e => setAUser(e.target.value)} placeholder="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="inp" type="password" value={aPass} onChange={e => setAPass(e.target.value)} placeholder="password" />
          </div>
          <div className="field">
            <label>Role</label>
            <select className="inp" value={aRole} onChange={e => setARole(e.target.value)}>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
          <div className="modal-btns">
            <button className="btn-cancel" onClick={() => setOvAccount(false)}>Cancel</button>
            <button className="btn-save" onClick={saveAccount}>Save Account</button>
          </div>
        </div>
      </div>

      {/* Confirm Modal Overlay */}
      <div className={`overlay${ovConfirm ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvConfirm(false)}>
        <div className="confirm-box">
          <h3>Confirm Delete</h3>
          <p>{confirmMsg}</p>
          <div className="modal-btns">
            <button className="btn-cancel" onClick={() => setOvConfirm(false)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmCallback}>Delete</button>
          </div>
        </div>
      </div>
    </>
  );
}
