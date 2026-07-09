'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

export default function AdminPage() {
  const { toggleTheme, products, setProducts } = useApp();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState(null);
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals state
  const [ovProduct, setOvProduct] = useState(false);
  const [ovAccount, setOvAccount] = useState(false);
  const [ovConfirm, setOvConfirm] = useState(false);

  const [editPid, setEditPid] = useState(null);
  const [editAccIdx, setEditAccIdx] = useState(null);

  // Form Fields
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('Coffee');
  const [pPrice, setPPrice] = useState('');
  const [pEmoji, setPEmoji] = useState('☕');
  const [pDesc, setPDesc] = useState('');
  const [pAvail, setPAavail] = useState('1');

  const [aUser, setAUser] = useState('');
  const [aPass, setAPass] = useState('');
  const [aRole, setARole] = useState('admin');

  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);

  const defaultUsers = () => [
    {username:'admin',password:'admin123',role:'admin'}
  ];

  const loadAll = () => {
    try {
      const u = JSON.parse(localStorage.getItem('ca_users')) || defaultUsers();
      setUsers(u);
      const o = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      setOrders(o);
      const pay = JSON.parse(localStorage.getItem('ca_payments') || '[]');
      setPayments(pay);
    } catch {}
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ca_admin_user');
    if (saved) {
      try { setMe(JSON.parse(saved)); } catch {}
    }
    loadAll();
  }, []);

  const doLogin = () => {
    const validUsers = JSON.parse(localStorage.getItem('ca_users')) || defaultUsers();
    const found = validUsers.find(x => x.username === lUser.trim() && x.password === lPass);
    if (!found || found.role !== 'admin') {
      setLoginErr(true);
      return;
    }
    setLoginErr(false);
    setMe(found);
    localStorage.setItem('ca_admin_user', JSON.stringify(found));
    loadAll();
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
        setPDesc(p.desc || '');
        setPAavail(p.avail !== false ? '1' : '0');
      }
    } else {
      setPName('');
      setPCat('Coffee');
      setPPrice('');
      setPEmoji('☕');
      setPDesc('');
      setPAavail('1');
    }
    setOvProduct(true);
  };

  const saveProduct = () => {
    if (!pName.trim() || !pPrice) {
      alert('Name and price are required.');
      return;
    }
    const data = {
      name: pName.trim(),
      cat: pCat,
      price: parseInt(pPrice),
      emoji: pEmoji.trim() || '☕',
      desc: pDesc.trim(),
      avail: pAvail === '1'
    };
    let updated = [...products];
    if (editPid) {
      const idx = updated.findIndex(p => p.id === editPid);
      if (idx > -1) {
        updated[idx] = { ...updated[idx], ...data };
      }
    } else {
      const maxId = updated.reduce((m, p) => Math.max(m, parseInt(p.id || 0)), 0);
      updated.push({ id: String(maxId + 1), ...data });
    }
    setProducts(updated);
    setOvProduct(false);
  };

  const toggleAvail = (id) => {
    const updated = products.map(p => p.id === id ? { ...p, avail: !p.avail } : p);
    setProducts(updated);
  };

  const deleteProduct = (id) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
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
      setARole('admin');
    }
    setOvAccount(true);
  };

  const saveAccount = () => {
    if (!aUser.trim() || !aPass.trim()) {
      alert('Username and password are required.');
      return;
    }
    let updated = [...users];
    if (editAccIdx !== null) {
      updated[editAccIdx] = { username: aUser.trim(), password: aPass.trim(), role: aRole };
    } else {
      if (updated.find(u => u.username === aUser.trim())) {
        alert('Username already exists.');
        return;
      }
      updated.push({ username: aUser.trim(), password: aPass.trim(), role: aRole });
    }
    setUsers(updated);
    localStorage.setItem('ca_users', JSON.stringify(updated));
    setOvAccount(false);
  };

  const deleteAccount = (idx) => {
    if (users[idx]?.username === 'admin') return;
    let updated = [...users];
    updated.splice(idx, 1);
    setUsers(updated);
    localStorage.setItem('ca_users', JSON.stringify(updated));
  };

  const confirmAction = (msg, cb) => {
    setConfirmMsg(msg);
    setConfirmCallback(() => () => { cb(); setOvConfirm(false); });
    setOvConfirm(true);
  };

  if (!mounted) return null;

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
            <button className="btn-login" onClick={doLogin}>Sign In →</button>
            <div className="login-hint">Default: <b>admin</b> / <b>admin123</b></div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Stats
  const activeOrders = orders.filter(o => o.status !== 'served').length;
  const servedOrders = orders.filter(o => o.status === 'served').length;
  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const todayStr = new Date().toDateString();
  const todayRev = orders.filter(o => new Date(o.time).toDateString() === todayStr).reduce((acc, curr) => acc + (curr.total || 0), 0);
  const todayOrders = orders.filter(o => new Date(o.time).toDateString() === todayStr).length;

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
        
        .pg-title { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 26px; margin-bottom: 4px; }
        .pg-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 12px; margin-bottom: 26px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; transition: var(--transition-theme); }
        .stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 8px; }
        .stat-val { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 30px; line-height: 1; }
        .stat-val small { font-size: 15px; color: var(--gold); }
        
        .tbl-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: var(--transition-theme); }
        .tbl-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
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
        @media(max-width:768px){.sidebar{display:none;}.content{padding:16px;}.topbar{padding:0 14px;}}
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
            <button className={`nav-item${currentTab === 'accounts' ? ' active' : ''}`} onClick={() => setCurrentTab('accounts')}>👥 Accounts</button>
            <hr className="nav-sep" />
            <button className="nav-item" onClick={() => window.open('/welcome', '_blank')}>👁 Preview Welcome</button>
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
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txnId}</td>
                          <td style={{ fontSize: '12px' }}>{p.invoiceNum || '—'}</td>
                          <td>{p.table || '—'}</td>
                          <td>{p.method}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(p.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
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
                            <strong style={{ color: 'var(--text)' }}>{p.emoji || '☕'} {p.name}</strong>
                            <br />
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.desc}</span>
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
                      <tr><th>TXN ID</th><th>Invoice</th><th>Table</th><th>Method</th><th>Amount</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txnId}</td>
                          <td style={{ fontSize: '12px' }}>{p.invoiceNum || '—'}</td>
                          <td>{p.table || '—'}</td>
                          <td>{p.method}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(p.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
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
              <label>Emoji</label>
              <input className="inp" type="text" value={pEmoji} onChange={e => setPEmoji(e.target.value)} placeholder="☕" maxLength="4" />
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
