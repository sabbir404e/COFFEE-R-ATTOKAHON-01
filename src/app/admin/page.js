'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { resolveProductImage } from '@/lib/products';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import TableQrCard from '@/components/TableQrCard.jsx';

const CARD_W = 640;
const CARD_H = 900;

function esc(s) {
  return s != null ? String(s) : '';
}

function formatAdminDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`;
}

let logoImgCache = null;
function getLogoImg() {
  if (logoImgCache) return Promise.resolve(logoImgCache);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoImgCache = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

function roundRect(ctx, x, y, w, h, r) {
  let radius = r;
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
  ctx.closePath();
}

async function buildCardCanvas(tableId, tableName, qrCanvasElement) {
  await Promise.all([
    document.fonts.load('700 40px "Playfair Display"'),
    document.fonts.load('600 20px "Outfit"'),
    document.fonts.load('700 20px "Outfit"'),
    document.fonts.load('400 20px "Outfit"')
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const brandDark = '#261608';
  const brandGold = '#C49246';
  const brandSub = '#9E7642';
  const cream = '#ECE1CE';

  // Background
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Outer rounded border
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = brandGold;
  roundRect(ctx, 16, 16, CARD_W - 32, CARD_H - 32, 34);
  ctx.stroke();

  // Decorative corner brackets
  const cLen = 28, cInset = 36;
  ctx.lineWidth = 3;
  ctx.strokeStyle = brandGold;
  ctx.lineCap = 'square';
  const corners = [
    [[cInset, cInset + cLen], [cInset, cInset], [cInset + cLen, cInset]],
    [[CARD_W - cInset - cLen, cInset], [CARD_W - cInset, cInset], [CARD_W - cInset, cInset + cLen]],
    [[cInset, CARD_H - cInset - cLen], [cInset, CARD_H - cInset], [cInset + cLen, CARD_H - cInset]],
    [[CARD_W - cInset - cLen, CARD_H - cInset], [CARD_W - cInset, CARD_H - cInset], [CARD_W - cInset, CARD_H - cInset - cLen]]
  ];
  corners.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
  });

  // Logo (circular)
  const logo = await getLogoImg();
  const logoR = 56, logoCx = CARD_W / 2, logoCy = 115;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(logoCx - logoR, logoCy - logoR, logoR * 2, logoR * 2);
    ctx.drawImage(logo, logoCx - logoR, logoCy - logoR, logoR * 2, logoR * 2);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = brandGold;
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shop name
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = '700 38px "Playfair Display", serif';
  ctx.fillText('Coffee-r Attokahon', CARD_W / 2, 212);

  // Tagline
  ctx.font = '700 13px "Outfit", sans-serif';
  ctx.fillStyle = brandSub;
  ctx.letterSpacing = '3px';
  ctx.fillText('ARTISAN COFFEE & CUISINE', CARD_W / 2, 238);

  // Divider with diamond
  ctx.strokeStyle = 'rgba(196,146,70,0.40)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 - 90, 268);
  ctx.lineTo(CARD_W / 2 - 12, 268);
  ctx.stroke();
  ctx.fillStyle = brandGold;
  ctx.font = '700 12px serif';
  ctx.fillText('❖', CARD_W / 2, 272);
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 + 12, 268);
  ctx.lineTo(CARD_W / 2 + 90, 268);
  ctx.stroke();

  // Table Badge
  const badgeLabel = (tableName || ('Table ' + tableId)).toUpperCase();
  const badgeH = 46, badgeW = 210, badgeX = (CARD_W - badgeW) / 2, badgeTop = 296;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeTop, badgeX + badgeW, badgeTop + badgeH);
  badgeGrad.addColorStop(0, '#CF983C');
  badgeGrad.addColorStop(1, '#A36F25');
  ctx.save();
  ctx.shadowColor = 'rgba(140,90,20,0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeTop, badgeW, badgeH, 23);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = '700 20px "Playfair Display", serif';
  ctx.fillText(badgeLabel, CARD_W / 2, badgeTop + badgeH / 2 + 7);

  // White QR panel
  const qrBoxSize = 360, qrBoxX = (CARD_W - qrBoxSize) / 2, qrBoxY = 370;
  ctx.save();
  ctx.shadowColor = 'rgba(50,30,10,0.15)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(196,146,70,0.20)';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.stroke();

  // Draw QR code image
  const qrPad = 22;
  const qrDrawSize = qrBoxSize - qrPad * 2;
  if (qrCanvasElement) {
    ctx.drawImage(qrCanvasElement, qrBoxX + qrPad, qrBoxY + qrPad, qrDrawSize, qrDrawSize);
  }

  // Scan text
  const scanY = qrBoxY + qrBoxSize + 44;
  ctx.font = '700 13px "Outfit", sans-serif';
  ctx.fillStyle = brandSub;
  ctx.fillText('SCAN TO VIEW MENU & ORDER', CARD_W / 2, scanY);

  return canvas;
}


export default function AdminPage() {
  const { toggleTheme, products, tables, orders, payments, users, deleteTable, feedback, fetchData } = useApp();

  const [me, setMe] = useState(null);
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // Modals state
  const [ovProduct, setOvProduct] = useState(false);
  const [ovAccount, setOvAccount] = useState(false);
  const [ovTable, setOvTable] = useState(false);
  const [ovTableQR, setOvTableQR] = useState(false);
  const [ovConfirm, setOvConfirm] = useState(false);
  const [ovRestoreProducts, setOvRestoreProducts] = useState(false);

  const [editPid, setEditPid] = useState(null);
  const [editAccIdx, setEditAccIdx] = useState(null);
  const [editTableId, setEditTableId] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [qrSiteUrl, setQrSiteUrl] = useState('');
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [ovOrderDetails, setOvOrderDetails] = useState(false);

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
  const [confirmButtonLabel, setConfirmButtonLabel] = useState('Delete');
  const [restoringId, setRestoringId] = useState(null);
  const [deletedProducts, setDeletedProducts] = useState([]);

  // Orders tab filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Restore session & set initial URL
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('ca_admin_user');
        if (savedUser) {
          try { setMe(JSON.parse(savedUser)); } catch {}
        }
        const savedUrl = localStorage.getItem('ca_site_url');
        setQrSiteUrl(savedUrl || window.location.origin);
      }
    });
    return () => { active = false; };
  }, []);

  const doLogin = async () => {
    if (!lUser.trim() || !lPass) return;
    setLoginLoading(true);
    setLoginErr(false);
    try {
      const { data: found } = await supabase
        .from('users')
        .select('*')
        .eq('username', lUser.trim())
        .eq('password', lPass)
        .eq('role', 'admin')
        .single();
      if (found) {
        setLoginErr(false);
        setMe(found);
        localStorage.setItem('ca_admin_user', JSON.stringify(found));
        setLoginLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Supabase admin login error:', e);
    }

    // Fallback for default admin login
    if (lUser.trim() === 'admin' && (lPass === 'admin123' || lPass === 'admin')) {
      const fallbackUser = { id: 1, username: 'admin', role: 'admin' };
      setLoginErr(false);
      setMe(fallbackUser);
      localStorage.setItem('ca_admin_user', JSON.stringify(fallbackUser));
      setLoginLoading(false);
      return;
    }

    setLoginLoading(false);
    setLoginErr(true);
  };

  const doLogout = () => {
    setMe(null);
    localStorage.removeItem('ca_admin_user');
    setLUser('');
    setLPass('');
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setSidebarOpen(false);
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

  // Order actions
  const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'ready', 'served', 'cancelled'];

  const updateOrderStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    // When the order is served or cancelled, free the table back to 'available'
    if (newStatus === 'served' || newStatus === 'cancelled') {
      const order = orders.find(o => o.id === id);
      if (order && order.table) {
        await supabase.from('dining_tables').update({ status: 'available' }).eq('id', order.table);
      }
    }
  };

  const deleteOrder = async (id) => {
    await supabase.from('orders').delete().eq('id', id);
  };

  const toggleAvail = async (id) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    await supabase.from('products').update({ is_available: !(prod.avail !== false) }).eq('id', id);
  };

  const loadDeletedProducts = async () => {
    const { data, error } = await supabase.from('deleted_products').select('*').order('deleted_at', { ascending: false });
    if (error) throw error;
    setDeletedProducts(data || []);
  };

  const deleteProduct = async (id) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;

    const productData = {
      name: product.name,
      category: product.cat,
      price: product.price,
      emoji: product.emoji || '☕',
      image_url: product.image || null,
      description: product.desc || '',
      is_available: product.avail !== false,
    };

    try {
      const { data: archivedProduct, error: archiveError } = await supabase
        .from('deleted_products')
        .insert({ original_product_id: product.id, product_data: productData })
        .select('id')
        .single();
      if (archiveError) throw archiveError;

      const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
      if (deleteError) {
        await supabase.from('deleted_products').delete().eq('id', archivedProduct.id);
        throw deleteError;
      }

      await fetchData();
      await loadDeletedProducts();
    } catch (error) {
      console.error('Could not archive product:', error);
      alert(`Could not delete product safely: ${error.message || 'Run create_deleted_products_table.sql in Supabase first.'}`);
    }
  };

  const openRestoreProducts = async () => {
    setOvRestoreProducts(true);
    try {
      await loadDeletedProducts();
    } catch (error) {
      console.error('Could not load deleted products:', error);
      alert(`Could not load deleted products: ${error.message || 'Run create_deleted_products_table.sql in Supabase first.'}`);
    }
  };

  const restoreSingleProduct = async (archivedProduct) => {
    if (!archivedProduct || !archivedProduct.id) return;
    const raw = archivedProduct.product_data || {};
    const productName = raw.name || 'Product';
    setRestoringId(archivedProduct.id);

    try {
      const productPayload = {
        name: productName.trim(),
        category: raw.category || raw.cat || 'Coffee',
        price: Number(raw.price) || 0,
        emoji: raw.emoji || '☕',
        image_url: raw.image_url || raw.image || null,
        description: raw.description || raw.desc || '',
        is_available: raw.is_available !== undefined ? Boolean(raw.is_available) : (raw.avail !== false)
      };

      const { data: existingProducts, error: fetchError } = await supabase.from('products').select('name');
      if (fetchError) {
        console.warn('Could not verify existing products:', fetchError);
      } else if (existingProducts) {
        const exists = existingProducts.some(
          (item) => (item.name || '').trim().toLowerCase() === productPayload.name.toLowerCase()
        );
        if (exists) {
          await supabase.from('deleted_products').delete().eq('id', archivedProduct.id);
          await loadDeletedProducts();
          await fetchData();
          alert(`"${productPayload.name}" is already live in menu. Cleaned duplicate archive entry.`);
          return;
        }
      }

      const { error: insertError } = await supabase.from('products').insert(productPayload);
      if (insertError) throw insertError;

      const { error: removeArchiveError } = await supabase.from('deleted_products').delete().eq('id', archivedProduct.id);
      if (removeArchiveError) console.warn('Could not remove archive row:', removeArchiveError);

      await fetchData();
      await loadDeletedProducts();
      alert(`"${productPayload.name}" restored successfully.`);
    } catch (error) {
      console.error(`Could not restore product:`, error);
      alert(`Could not restore product: ${error.message || 'Please try again.'}`);
    } finally {
      setRestoringId(null);
    }
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
      setTStatus(table.status || 'available');
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
    let error;
    if (editTableId === null) {
      const res = await supabase.from('dining_tables').insert(tableData);
      error = res.error;
    } else {
      const res = await supabase.from('dining_tables').update({ name: tName.trim(), seats, status: tStatus, note: tNote.trim() }).eq('id', editTableId);
      error = res.error;
    }
    if (error) {
      alert(`Could not save table: ${error.message}`);
    } else {
      setOvTable(false);
    }
  };

  const updateTableStatus = async (tableId, newStatus) => {
    try {
      const { error } = await supabase
        .from('dining_tables')
        .update({ status: newStatus })
        .eq('id', tableId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating table status:', err);
      alert(`Could not update table status: ${err.message || 'Please try again'}`);
    }
  };

  const openTableQRModal = (t) => {
    setQrTable(t);
    setOvTableQR(true);
  };

  const downloadSingleTableQR = async () => {
    if (!qrTable) return;
    const qrHolder = document.getElementById(`qr-admin-preview-${qrTable.id}`);
    const qrCanvas = qrHolder ? qrHolder.querySelector('canvas') : null;
    const canvas = await buildCardCanvas(qrTable.id, qrTable.name || (`Table ${qrTable.id}`), qrCanvas);
    const safeName = (qrTable.name || (`table-${qrTable.id}`)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `qr-${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    }, 'image/png');
  };

  const confirmAction = (msg, cb, buttonLabel = 'Delete') => {
    setConfirmMsg(msg);
    setConfirmButtonLabel(buttonLabel);
    setConfirmCallback(() => () => { cb(); setOvConfirm(false); });
    setOvConfirm(true);
  };

  if (!me) {
    return (
      <div className="login-screen">
        <div className="glow" />
        <div className="login-wrap">
          <div className="login-brand">
            <img className="login-logo" src="/logo.png" alt="Coffee-r Attokahon" style={{ width: '76px', height: '76px', margin: '0 auto 12px', display: 'block', objectFit: 'cover', borderRadius: '50%', border: '3px solid var(--gold)', background: 'var(--bg2)', boxShadow: '0 4px 16px rgba(200,148,56,0.35)' }} />
            <div className="wm" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '36px' }}><em>Coffee-r</em> Attokahon</div>
            <div className="sub" style={{ fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '6px' }}>Admin Portal</div>
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
            <div className="login-hint">
              Default: <b>admin</b> / <b>admin123</b>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Stats
  const activeOrders = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed').length;
  const servedOrders = orders.filter(o => o.status === 'served').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'failed').reduce((acc, curr) => acc + (curr.total || 0), 0);
  const getPaymentPhone = (payment) => {
    const linkedOrder = orders.find((order) => String(order.id) === String(payment.order_id));
    return payment.sender_phone || payment.senderPhone || payment.phone || linkedOrder?.senderPhone || '—';
  };
  const todayStr = new Date().toDateString();
  const todayRev = orders.filter(o => new Date(o.time).toDateString() === todayStr && o.status !== 'cancelled' && o.status !== 'failed').reduce((acc, curr) => acc + (curr.total || 0), 0);
  const todayOrders = orders.filter(o => new Date(o.time).toDateString() === todayStr && o.status !== 'cancelled' && o.status !== 'failed').length;
  const occupiedTablesCount = new Set(orders.filter(o => o.table && o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed').map(o => o.table)).size;
  const totalTablesCount = tables.length || 20;
  const avgRatingText = feedback.length ? (feedback.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / feedback.length).toFixed(1) : '—';

  return (
    <>
      <style>{`
        .app-body { display: flex; min-height: 0; height: calc(100vh - 58px); }
        .sidebar { width: 205px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; transition: transform 0.25s ease, var(--transition-theme); }
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
        
        /* Order status action buttons */
        .order-actions { display: flex; flex-wrap: wrap; gap: 5px; min-width: 190px; }
        .btn-status { padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-h); background: none; font-size: 11px; font-weight: 600; color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .btn-status:hover { background: rgba(200,148,56,0.15); color: var(--gold); border-color: var(--gold); }
        .btn-status-cancel { border-color: var(--d-bd); color: var(--d-tx); }
        .btn-status-cancel:hover { background: var(--d-bg); border-color: var(--d-bd); color: var(--d-tx); }
        .btn-status-served { border-color: rgba(42,114,72,0.5); color: #60C890; }
        .btn-status-served:hover { background: rgba(42,114,72,0.15); }
        .status-sep { width: 1px; background: var(--border); margin: 0 2px; align-self: stretch; display: inline-block; }

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
        .btn-qr { padding: 4px 10px; border-radius: 7px; border: 1px solid rgba(160,108,40,0.4); background: none; font-size: 12px; color: var(--gold); cursor: pointer; transition: all 0.15s; }
        .btn-qr:hover { background: rgba(200,148,56,0.15); }
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

        /* Tables Page Card Styles */
        .table-metric-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 18px 22px; box-shadow: var(--shadow); transition: var(--transition-theme); }
        .table-item-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px 12px 12px 12px; display: flex; flex-direction: column; gap: 4px; box-shadow: var(--shadow); transition: var(--transition-theme), transform 0.15s ease; }
        .table-item-card:hover { transform: translateY(-2px); border-color: var(--border-h); }

        /* QR Card Tent Frame */
        .qr-modal { max-width: 440px; background: var(--card) !important; border: 1px solid var(--border) !important; border-radius: 24px !important; padding: 24px !important; box-shadow: var(--shadow) !important; transition: var(--transition-theme); }
        .qr-card-frame { position: relative; background: linear-gradient(160deg, #FAF4E8 0%, #EFE1C3 100%); border: 1.5px solid #C89438; border-radius: 20px; padding: 7px; box-shadow: 0 10px 25px rgba(0,0,0,0.35); }
        .qr-card-inner { position: relative; border: 1px solid rgba(160,108,40,0.35); border-radius: 14px; padding: 22px 16px 18px; text-align: center; }
        .qr-card-corner { position: absolute; width: 18px; height: 18px; border: 2px solid #C89438; z-index: 2; }
        .qr-cc-tl { top: 6px; left: 6px; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
        .qr-cc-tr { top: 6px; right: 6px; border-left: none; border-bottom: none; border-radius: 0 4px 0 0; }
        .qr-cc-bl { bottom: 6px; left: 6px; border-right: none; border-top: none; border-radius: 0 0 0 4px; }
        .qr-cc-br { bottom: 6px; right: 6px; border-left: none; border-top: none; border-radius: 0 0 4px 0; }
        .qr-card-logo { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #C89438; object-fit: cover; display: block; margin: 0 auto 10px; padding: 2px; background: #fff; box-shadow: 0 4px 12px rgba(160,108,40,0.25); }
        .qr-card-name { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 23px; color: #2E1C08; font-weight: 700; line-height: 1.2; margin-bottom: 2px; }
        .qr-card-name em { color: #A06C28; font-style: italic; font-weight: 700; margin-right: 4px; }
        .qr-card-tagline { font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: #9A7850; margin-top: 4px; font-weight: 600; }
        .qr-card-divider { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px auto 14px; width: 65%; }
        .qr-card-divider span { flex: 1; height: 1px; background: rgba(160,108,40,0.35); }
        .qr-card-divider i { font-style: normal; color: #C89438; font-size: 10px; }
        .qr-card-table { display: inline-block; font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff; background: linear-gradient(135deg, #D4A445 0%, #A06C28 100%); padding: 7px 28px; border-radius: 100px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(160,108,40,0.35); }
        .qr-card-qr-wrap { background: #ffffff; border-radius: 18px; padding: 14px; display: inline-block; box-shadow: 0 6px 20px rgba(0,0,0,0.12); border: 1px solid rgba(160,108,40,0.2); }
        .qr-card-scan { margin-top: 14px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #9A7850; font-weight: 700; }

        /* Mobile Responsive Navigation Drawer */
        .menu-toggle { display: none; background: none; border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; align-items: center; justify-content: center; cursor: pointer; color: var(--text); flex-shrink: 0; margin-right: 8px; }
        .sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; opacity: 0; transition: opacity 0.25s ease; }
        .sidebar-backdrop.open { display: block; opacity: 1; }

        /* Invoice Modal */
        .invoice-modal { max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 0 !important; background: var(--card) !important; border: 1px solid var(--border) !important; border-radius: 18px !important; }
        .invoice { background: var(--card); border-radius: 18px; overflow: hidden; }
        .invoice-head { padding: 22px 24px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
        .inv-brand .logo { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: var(--text); }
        .inv-brand .logo em { color: var(--gold); font-style: normal; }
        .inv-brand { display: flex; align-items: center; gap: 10px; }
        .inv-logo-img { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 2px 10px rgba(200,148,56,0.35)); }
        .inv-brand .tagline { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
        .inv-meta { text-align: right; }
        .inv-meta .inv-num { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 15px; color: var(--gold); font-weight: 700; }
        .inv-meta .inv-date { font-size: 11px; color: var(--muted); margin-top: 3px; }
        .inv-meta .inv-status { display: inline-block; background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.3); border-radius: 6px; padding: 2px 10px; font-size: 10px; font-weight: 700; color: #2ECC71; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

        .invoice-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid var(--border); }
        .inv-info-cell { padding: 12px 18px; border-right: 1px solid var(--border); }
        .inv-info-cell:last-child { border-right: none; }
        .inv-info-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 3px; }
        .inv-info-value { font-size: 13px; font-weight: 600; color: var(--text); }

        .inv-items { padding: 0; }
        .inv-items-head { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; padding: 10px 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); border-bottom: 1px solid var(--border); }
        .inv-item-row { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; padding: 10px 20px; border-bottom: 1px solid rgba(200,148,56,0.07); align-items: center; }
        .inv-item-row:last-child { border-bottom: none; }
        .inv-item-name { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); }
        .inv-item-emoji { font-size: 16px; width: 20px; height: 20px; border-radius: 5px; object-fit: cover; }
        .inv-item-col { font-size: 13px; text-align: right; color: var(--text-2); }
        .inv-item-col.price { color: var(--muted); }
        .inv-item-col.subtotal { color: var(--text); font-weight: 600; }

        .invoice-totals { padding: 14px 20px; border-top: 1px solid var(--border); background: var(--bg2); }
        .tot-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--muted); padding: 4px 0; }
        .tot-row span:last-child { color: var(--text); font-weight: 500; }
        .tot-row.grand { font-size: 16px; font-weight: 700; border-top: 1px solid var(--border); margin-top: 6px; padding-top: 10px; }
        .tot-row.grand span:first-child { color: var(--text); }
        .tot-row.grand span:last-child { color: var(--gold); font-size: 18px; }

        .invoice-payment { padding: 14px 20px; border-top: 1px solid var(--border); }
        .pay-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 3px 0; color: var(--muted); }
        .pay-row span:last-child { color: var(--text); font-weight: 500; }
        .pay-row.txn span:last-child { color: var(--gold); font-family: monospace; font-size: 12px; font-weight: 600; }

        .invoice-note { padding: 12px 20px; border-top: 1px solid var(--border); background: rgba(200,148,56,0.04); }
        .note-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 3px; }
        .note-text { font-size: 12px; color: var(--text); font-style: italic; }

        .invoice-footer { padding: 16px 20px; border-top: 1px solid var(--border); text-align: center; }
        .inv-footer-thanks { font-family: var(--font-playfair), 'Playfair Display', serif; font-style: italic; font-size: 16px; color: var(--gold); margin-bottom: 2px; }
        .inv-footer-sub { font-size: 11px; color: var(--muted); }

        @media(max-width:768px){
          .menu-toggle { display: flex; }
          .app-body { height: auto; min-height: calc(100vh - 58px); flex-direction: column; }
          .sidebar {
            position: fixed; top: 58px; left: 0; bottom: 0; z-index: 200;
            width: 230px; transform: translateX(-100%);
            box-shadow: 0 4px 24px rgba(0,0,0,0.35);
          }
          .sidebar.open { transform: translateX(0); }
          .content { padding: 16px; overflow-y: visible; }
          .topbar { padding: 0 14px; }
          .role-badge, .theme-label { display: none; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media(max-width:480px){
          .logout-btn { padding: 5px 9px; }
          .stats-grid { grid-template-columns: 1fr; }
          .modal { padding: 20px; }
        }
      `}</style>

      <div id="appScreen" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle Menu">
              ☰
            </button>
            <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
              <img className="brand-logo" src="/logo.png" alt="Coffee-r Attokahon" />
              <span><em>Coffee-r</em> Attokahon</span>
            </Link>
          </div>
          <div className="topbar-right">
            <div className="role-badge">Admin</div>
            <div className="glow" />
            <div className="ts-theme">
              <span className="theme-label">🌙</span>
              <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark/light mode" />
              <span className="theme-label">☀️</span>
            </div>
            <button className="logout-btn" onClick={doLogout}>Sign out</button>
          </div>
        </div>

        <div className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className="app-body">
          <nav className={`sidebar${sidebarOpen ? ' open' : ''}`}>
            <button className={`nav-item${currentTab === 'dashboard' ? ' active' : ''}`} onClick={() => handleTabChange('dashboard')}>📊 Dashboard</button>
            <button className={`nav-item${currentTab === 'products' ? ' active' : ''}`} onClick={() => handleTabChange('products')}>🛍 Products</button>
            <button className={`nav-item${currentTab === 'orders' ? ' active' : ''}`} onClick={() => handleTabChange('orders')}>📋 Orders</button>
            <button className={`nav-item${currentTab === 'payments' ? ' active' : ''}`} onClick={() => handleTabChange('payments')}>💳 Payments</button>
            <button className={`nav-item${currentTab === 'tables' ? ' active' : ''}`} onClick={() => handleTabChange('tables')}>🪑 Tables</button>
            <button className={`nav-item${currentTab === 'accounts' ? ' active' : ''}`} onClick={() => handleTabChange('accounts')}>👥 Accounts</button>
            <button className={`nav-item${currentTab === 'reports' ? ' active' : ''}`} onClick={() => handleTabChange('reports')}>📈 Reports</button>
            <button className={`nav-item${currentTab === 'feedback' ? ' active' : ''}`} onClick={() => handleTabChange('feedback')}>⭐ Feedback</button>
            <hr className="nav-sep" />
            <button className="nav-item" onClick={() => window.open('/order', '_blank')}>🛒 Preview Menu</button>
            <button className="nav-item" onClick={() => window.open('/kitchen', '_blank')}>👨‍🍳 Kitchen View</button>
          </nav>

          <div className="content">
            {currentTab === 'dashboard' && (
              <div>
                <div className="pg-title">Dashboard</div>
                <div className="pg-sub">Live overview of Coffee-r Attokahon operations.</div>

                {/* TODAY */}
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '16px', marginBottom: '8px' }}>
                  TODAY
                </div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(160px, 220px))', gap: '12px', marginBottom: '18px' }}>
                  <div className="stat-card">
                    <div className="stat-lbl">TODAY&apos;S ORDERS</div>
                    <div className="stat-val">{todayOrders}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">TODAY&apos;S REVENUE</div>
                    <div className="stat-val">৳{todayRev.toLocaleString()}</div>
                  </div>
                </div>

                {/* ALL-TIME OVERVIEW */}
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '18px', marginBottom: '8px' }}>
                  ALL-TIME OVERVIEW
                </div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div className="stat-card">
                    <div className="stat-lbl">TOTAL ORDERS</div>
                    <div className="stat-val">{orders.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">TOTAL REVENUE</div>
                    <div className="stat-val">৳{totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">SERVED ORDERS</div>
                    <div className="stat-val" style={{ color: 'var(--success-tx)' }}>{servedOrders}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">CANCELLED ORDERS</div>
                    <div className="stat-val" style={{ color: 'var(--d-tx)' }}>{cancelledOrders}</div>
                  </div>
                </div>

                {/* RIGHT NOW */}
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '18px', marginBottom: '8px' }}>
                  RIGHT NOW
                </div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '26px' }}>
                  <div className="stat-card">
                    <div className="stat-lbl">ACTIVE ORDERS</div>
                    <div className="stat-val" style={{ color: 'var(--gold)' }}>{activeOrders}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">OCCUPIED TABLES</div>
                    <div className="stat-val">{occupiedTablesCount} <small style={{ fontSize: '16px', color: 'var(--muted)' }}>/ {totalTablesCount}</small></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">MENU ITEMS</div>
                    <div className="stat-val">{products.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-lbl">AVG. RATING</div>
                    <div className="stat-val">{avgRatingText}</div>
                  </div>
                </div>

                {/* Recent Paid Orders Table */}
                <div className="pg-title" style={{ fontSize: '18px', marginBottom: '12px', marginTop: '12px' }}>Recent Paid Orders</div>
                <div className="tbl-wrap" style={{ marginBottom: '28px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>TABLE</th>
                        <th>ITEMS</th>
                        <th>TOTAL</th>
                        <th>PAYMENT</th>
                        <th>SENT FROM</th>
                        <th>STATUS</th>
                        <th>TIME</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => {
                        const statusFlow = ['pending', 'paid', 'preparing', 'ready', 'served'];
                        const curIdx = statusFlow.indexOf(o.status);
                        const nextStatus = curIdx >= 0 && curIdx < statusFlow.length - 1 ? statusFlow[curIdx + 1] : null;
                        const nextLabel = nextStatus ? `→ ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}` : null;
                        const isCancelled = o.status === 'cancelled';
                        return (
                          <tr key={o.id}>
                            <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{o.id}</td>
                            <td>{o.table || '—'}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}>
                              {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                            </td>
                            <td style={{ fontWeight: 600 }}>৳{o.total}</td>
                            <td style={{ fontSize: '11px' }}>{o.paymentMethod || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{o.senderPhone || '—'}</td>
                            <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
                            <td style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                              {new Date(o.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td>
                              <div className="order-actions">
                                {nextLabel && !isCancelled && (
                                  <button
                                    className={`btn-status${nextStatus === 'served' ? ' btn-status-served' : ''}`}
                                    onClick={() => updateOrderStatus(o.id, nextStatus)}
                                    title={`Mark as ${nextStatus}`}
                                  >
                                    {nextLabel}
                                  </button>
                                )}
                                {!isCancelled && o.status !== 'served' && (
                                  <button
                                    className="btn-status btn-status-cancel"
                                    onClick={() => confirmAction(`Cancel order #${o.id}?`, () => updateOrderStatus(o.id, 'cancelled'))}
                                    title="Cancel order"
                                  >
                                    ✕ Cancel
                                  </button>
                                )}
                                <button
                                  className="btn-del"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={() => confirmAction(`Delete order #${o.id} permanently?`, () => deleteOrder(o.id))}
                                  title="Delete order"
                                >
                                  {(isCancelled || o.status === 'served') ? '🗑 Delete' : '🗑'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {orders.length === 0 && <tr><td colSpan="9" className="empty-tbl">No orders yet.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Recent Payments Table */}
                <div className="pg-title" style={{ fontSize: '18px', marginBottom: '12px' }}>Recent Payments</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>TXN ID</th>
                        <th>PHONE</th>
                        <th>INVOICE</th>
                        <th>TABLE</th>
                        <th>METHOD</th>
                        <th>AMOUNT</th>
                        <th>TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 6).map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txn_id || p.txnId || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{getPaymentPhone(p)}</td>
                          <td style={{ fontSize: '12px' }}>{p.invoice_num || p.invoiceNum || '—'}</td>
                          <td>{p.table_id || p.table || '—'}</td>
                          <td>{p.payment_method || p.method || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {new Date(p.created_at || p.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && <tr><td colSpan="7" className="empty-tbl">No payments yet.</td></tr>}
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={openRestoreProducts}
                      disabled={restoringId !== null}
                      style={{ padding: '9px 14px', borderRadius: '8px', opacity: restoringId !== null ? 0.65 : 1, cursor: restoringId !== null ? 'wait' : 'pointer' }}
                    >
                      {restoringId !== null ? 'Restoring…' : '↻ Restore Products'}
                    </button>
                    <button className="btn-add" onClick={() => openProductModal(null)}>+ Add Product</button>
                  </div>
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

            {currentTab === 'orders' && (() => {
              const filteredOrders = orders.filter(o => {
                const matchSearch = !orderSearch.trim() ||
                  String(o.id).includes(orderSearch.trim()) ||
                  String(o.table || '').toLowerCase().includes(orderSearch.trim().toLowerCase()) ||
                  (o.senderPhone || '').includes(orderSearch.trim());
                const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
                return matchSearch && matchStatus;
              });
              return (
                <div>
                  <div className="toolbar">
                    <div>
                      <div className="pg-title">Orders</div>
                      <div className="pg-sub">Full history — {orders.length} total orders.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        className="inp"
                        style={{ padding: '6px 12px', fontSize: '12px', width: '160px' }}
                        type="text"
                        placeholder="Search order / table…"
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                      />
                      <select
                        className="inp"
                        style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                        value={orderStatusFilter}
                        onChange={e => setOrderStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="served">Served</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Table</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Sent From</th>
                          <th>Status</th>
                          <th>Time</th>
                          <th>Actions</th>
                          <th>Item Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 && (
                          <tr><td colSpan="10" className="empty-tbl">No orders found.</td></tr>
                        )}
                        {filteredOrders.map(o => {
                          const statusFlow = ['pending', 'paid', 'preparing', 'ready', 'served'];
                          const curIdx = statusFlow.indexOf(o.status);
                          const nextStatus = curIdx >= 0 && curIdx < statusFlow.length - 1 ? statusFlow[curIdx + 1] : null;
                          const nextLabel = nextStatus ? `→ ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}` : null;
                          const isCancelled = o.status === 'cancelled';
                          return (
                            <tr key={o.id}>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{o.id}</td>
                              <td>{o.table || '—'}</td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}>
                                {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                              </td>
                              <td style={{ fontWeight: 600 }}>৳{o.total}</td>
                              <td style={{ fontSize: '11px' }}>{o.paymentMethod || '—'}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{o.senderPhone || '—'}</td>
                              <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
                              <td style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(o.time).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td>
                                <div className="order-actions">
                                  {nextLabel && !isCancelled && (
                                    <button
                                      className={`btn-status${nextStatus === 'served' ? ' btn-status-served' : ''}`}
                                      onClick={() => updateOrderStatus(o.id, nextStatus)}
                                      title={`Mark as ${nextStatus}`}
                                    >
                                      {nextLabel}
                                    </button>
                                  )}
                                  {!isCancelled && o.status !== 'served' && (
                                    <button
                                      className="btn-status btn-status-cancel"
                                      onClick={() => confirmAction(`Cancel order #${o.id}?`, () => updateOrderStatus(o.id, 'cancelled'))}
                                      title="Cancel order"
                                    >
                                      ✕ Cancel
                                    </button>
                                  )}
                                  <button
                                    className="btn-del"
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                    onClick={() => confirmAction(`Delete order #${o.id} permanently?`, () => deleteOrder(o.id))}
                                    title="Delete order"
                                  >
                                    {(isCancelled || o.status === 'served') ? '🗑 Delete' : '🗑'}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn-status"
                                  style={{
                                    background: 'rgba(200, 148, 56, 0.12)',
                                    border: '1px solid rgba(200, 148, 56, 0.35)',
                                    color: 'var(--gold)',
                                    fontSize: '11px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => {
                                    setViewOrderDetails(o);
                                    setOvOrderDetails(true);
                                  }}
                                  title={`View invoice details for Order #${o.id}`}
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {currentTab === 'payments' && (() => {
              const sortedPayments = [...payments].sort((a, b) => {
                const timeA = new Date(a.updated_at || a.created_at || a.time || 0).getTime() || 0;
                const timeB = new Date(b.updated_at || b.created_at || b.time || 0).getTime() || 0;
                if (timeB !== timeA) return timeB - timeA;
                return (Number(b.id) || 0) - (Number(a.id) || 0);
              });

              return (
                <div>
                  <div className="pg-title">Payments</div>
                  <div className="pg-sub">All completed transactions.</div>
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                    <div className="stat-card"><div className="stat-lbl">Total Payments</div><div className="stat-val">{sortedPayments.length}</div></div>
                    <div className="stat-card"><div className="stat-lbl">Total Revenue</div><div className="stat-val">৳{totalRevenue.toLocaleString()}</div></div>
                    <div className="stat-card"><div className="stat-lbl">Avg. Transaction</div><div className="stat-val">৳{sortedPayments.length ? Math.round(totalRevenue / sortedPayments.length) : 0}</div></div>
                  </div>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr><th>TXN ID</th><th>Phone</th><th>Invoice</th><th>Table</th><th>Method</th><th>Amount</th><th>Status</th><th>Time</th></tr>
                      </thead>
                      <tbody>
                        {sortedPayments.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>{p.txn_id || p.txnId || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{getPaymentPhone(p)}</td>
                            <td style={{ fontSize: '12px' }}>{p.invoice_num || p.invoiceNum || '—'}</td>
                            <td>{p.table_id || p.table || '—'}</td>
                            <td>{p.payment_method || p.method || '—'}</td>
                            <td style={{ fontWeight: 600, color: 'var(--success-tx)' }}>৳{p.amount}</td>
                            <td>
                              <span className={`badge b-${p.status || 'paid'}`}>
                                {p.status || 'paid'}
                              </span>
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatAdminDateTime(p.created_at || p.time || p.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

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
              const avgOrder = reportOrders.length ? Math.round(revenue / reportOrders.length) : 0;

              // Daily revenue trend breakdown
              const dailyDataMap = {};
              reportOrders.forEach(o => {
                const d = new Date(o.time || o.createdAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!dailyDataMap[key]) {
                  dailyDataMap[key] = { label, total: 0, count: 0, dateObj: d };
                }
                dailyDataMap[key].total += Number(o.total) || 0;
                dailyDataMap[key].count += 1;
              });

              const sortedDaily = Object.values(dailyDataMap).sort((a, b) => a.dateObj - b.dateObj);
              const maxDailyRev = sortedDaily.length ? Math.max(...sortedDaily.map(d => d.total), 1) : 1;

              // Payment method breakdown
              const byMethod = {};
              const byMethodCount = {};
              reportOrders.forEach(o => {
                const method = o.paymentMethod || 'Cash';
                byMethod[method] = (byMethod[method] || 0) + (Number(o.total) || 0);
                byMethodCount[method] = (byMethodCount[method] || 0) + 1;
              });

              const methodColors = {
                bkash: '#DF146E',
                nagad: '#F7931E',
                rocket: '#8C3494',
                cash: '#4CAF6D',
                card: '#3A78C8',
                other: '#A06C28'
              };

              // Donut ring calculations
              const totalMethodRev = Object.values(byMethod).reduce((a, b) => a + b, 0) || 1;
              let accumulatedAngle = 0;
              const donutSegments = Object.entries(byMethod).map(([method, amount]) => {
                const mLower = method.toLowerCase();
                const color = methodColors[mLower] || methodColors.other;
                const ratio = amount / totalMethodRev;
                const strokeDasharray = `${ratio * 314.16} ${314.16}`;
                const strokeDashoffset = -accumulatedAngle * 314.16;
                accumulatedAngle += ratio;
                return { method, amount, count: byMethodCount[method] || 0, color, strokeDasharray, strokeDashoffset };
              });

              // Product rankings summary
              const prodSummary = {};
              reportOrders.forEach(o => {
                (o.items || []).forEach(i => {
                  const prodName = i.name || 'Unnamed Product';
                  const foundProd = products.find(p =>
                    (i.id && (p.id === i.id || p.id === Number(i.id) || String(p.id) === String(i.id))) ||
                    (i.productId && (p.id === i.productId || p.id === Number(i.productId) || String(p.id) === String(i.productId))) ||
                    (p.name && prodName && p.name.trim().toLowerCase() === prodName.trim().toLowerCase())
                  );

                  const displayName = foundProd?.name || prodName;
                  const key = foundProd?.id ? `id_${foundProd.id}` : displayName.toLowerCase();
                  const itemImg = resolveProductImage({ ...foundProd, ...i, name: displayName }, products);

                  if (!prodSummary[key]) {
                    prodSummary[key] = {
                      id: foundProd?.id || i.id || i.productId,
                      name: displayName,
                      qty: 0,
                      rev: 0,
                      emoji: foundProd?.emoji || i.emoji || '☕',
                      image: itemImg
                    };
                  } else if (!prodSummary[key].image && itemImg) {
                    prodSummary[key].image = itemImg;
                  }

                  prodSummary[key].qty += (Number(i.qty) || 1);
                  prodSummary[key].rev += (Number(i.qty) || 1) * (Number(i.price) || 0);
                });
              });

              const topProducts = Object.values(prodSummary).sort((a, b) => b.qty - a.qty).slice(0, 5);
              const maxQty = topProducts.length ? Math.max(...topProducts.map(p => p.qty)) : 1;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {/* Header & Date Range Filter Bar */}
                  <div>
                    <div className="pg-title">Reports</div>
                    <div className="pg-sub">Revenue trend, payment breakdown, and best-selling products by date range.</div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '14px' }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="reportFrom" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>FROM</label>
                        <input id="reportFrom" className="inp" type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }} />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="reportTo" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>TO</label>
                        <input id="reportTo" className="inp" type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }} />
                      </div>
                      <button
                        type="button"
                        style={{
                          background: 'linear-gradient(135deg, #D4A445 0%, #A06C28 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '100px',
                          padding: '9px 24px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(160,108,40,0.3)',
                          height: '38px'
                        }}
                        onClick={() => {}}
                      >
                        Run Report
                      </button>
                      {(reportFrom || reportTo) && (
                        <button className="btn-edit" style={{ height: '38px', borderRadius: '100px' }} onClick={() => { setReportFrom(''); setReportTo(''); }}>Clear range</button>
                      )}
                    </div>
                  </div>

                  {/* 3 Stat Cards Row */}
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', margin: 0 }}>
                    <div className="stat-card">
                      <div className="stat-lbl">ORDERS</div>
                      <div className="stat-val">{reportOrders.length}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-lbl">REVENUE</div>
                      <div className="stat-val">৳{revenue.toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-lbl">AVG. ORDER</div>
                      <div className="stat-val">৳{avgOrder.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Section 1: Revenue Trend Chart */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                    <div className="pg-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📈</span> Revenue Trend
                    </div>
                    {sortedDaily.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '28px', height: '180px', paddingTop: '20px', paddingBottom: '10px', overflowX: 'auto' }}>
                        {sortedDaily.map((d, i) => {
                          const barH = Math.max(20, Math.round((d.total / maxDailyRev) * 120));
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gold)' }}>৳{d.total}</span>
                              <div style={{
                                width: '42px',
                                height: `${barH}px`,
                                background: 'linear-gradient(180deg, #D4A445 0%, #A06C28 100%)',
                                borderRadius: '8px 8px 0 0',
                                boxShadow: '0 4px 12px rgba(160,108,40,0.3)',
                                transition: 'height 0.3s ease'
                              }} />
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{d.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-tbl" style={{ padding: '40px' }}>No revenue data recorded for this date range.</div>
                    )}
                  </div>

                  {/* Section 2: Payment Method Breakdown (Donut Chart) */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                    <div className="pg-title" style={{ fontSize: '18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💳</span> Payment Method Breakdown
                    </div>
                    {Object.keys(byMethod).length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
                        {/* Donut ring + legend */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                          <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <circle cx="60" cy="60" r="50" stroke="rgba(160,108,40,0.15)" strokeWidth="16" fill="none" />
                              {donutSegments.map((seg, i) => (
                                <circle
                                  key={i}
                                  cx="60"
                                  cy="60"
                                  r="50"
                                  stroke={seg.color}
                                  strokeWidth="16"
                                  fill="none"
                                  strokeDasharray={seg.strokeDasharray}
                                  strokeDashoffset={seg.strokeDashoffset}
                                  style={{ transition: 'stroke-dasharray 0.4s' }}
                                />
                              ))}
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                              <span style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>৳{revenue}</span>
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>total</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {donutSegments.map((seg, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: seg.color, display: 'inline-block' }} />
                                <strong style={{ textTransform: 'capitalize' }}>{seg.method}</strong>
                                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>· {seg.count} orders</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--gold)' }}>
                          ৳{revenue.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-tbl" style={{ padding: '30px' }}>No payment methods recorded.</div>
                    )}
                  </div>

                  {/* Section 3: Most Ordered Products */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                    <div className="pg-title" style={{ fontSize: '18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏆</span> Most Ordered Products
                    </div>
                    {topProducts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {topProducts.map((p, idx) => (
                          <div key={p.name} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <span style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'rgba(200,148,56,0.15)',
                              border: '1px solid var(--gold)',
                              color: 'var(--gold)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              marginRight: '12px',
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            
                            {(() => {
                              const finalImg = resolveProductImage(p, products) || p.image;
                              return (
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '12px', flexShrink: 0, overflow: 'hidden' }}>
                                  {finalImg ? (
                                    <img
                                      src={finalImg}
                                      alt={p.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                          e.currentTarget.nextSibling.style.display = 'inline';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <span style={{ display: finalImg ? 'none' : 'inline' }}>{p.emoji || '☕'}</span>
                                </div>
                              );
                            })()}

                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', minWidth: '90px' }}>{p.name}</span>

                            <div style={{ flex: 1, height: '8px', background: 'rgba(160,108,40,0.15)', borderRadius: '100px', overflow: 'hidden', margin: '0 16px' }}>
                              <div style={{ width: `${Math.round((p.qty / maxQty) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #D4A445, #A06C28)', borderRadius: '100px', transition: 'width 0.4s' }} />
                            </div>

                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{p.qty} sold</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>৳{p.rev.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-tbl" style={{ padding: '30px' }}>No products ordered in this date range.</div>
                    )}
                  </div>

                  {/* Section 4: Payment Method Details Table */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                    <div className="pg-title" style={{ fontSize: '18px', marginBottom: '14px' }}>Payment Method Details</div>
                    <div className="tbl-wrap" style={{ border: 'none', background: 'transparent' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>METHOD</th>
                            <th>ORDERS</th>
                            <th>REVENUE</th>
                            <th>SHARE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(byMethod).length > 0 ? Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
                            const count = byMethodCount[method] || 0;
                            const share = revenue ? Math.round((amount / revenue) * 100) : 0;
                            return (
                              <tr key={method}>
                                <td><strong style={{ textTransform: 'capitalize' }}>{method}</strong></td>
                                <td>{count}</td>
                                <td style={{ color: 'var(--gold)', fontWeight: 600 }}>৳{amount.toLocaleString()}</td>
                                <td>{share}%</td>
                              </tr>
                            );
                          }) : (
                            <tr><td colSpan="4" className="empty-tbl">No payment method details available.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Table</th><th>Order</th><th>Rating</th><th>Comment</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {feedback.length ? [...feedback]
                        .sort((a, b) => new Date(b.time || b.created_at || 0) - new Date(a.time || a.created_at || 0))
                        .map((item, index) => (
                        <tr key={`${item.id || item.orderId || 'feedback'}-${index}`}>
                          <td>{item.table || '—'}</td>
                          <td style={{ color: 'var(--gold)' }}>{item.orderId || '—'}</td>
                          <td style={{ color: 'var(--gold)' }}>{'★'.repeat(Number(item.rating) || 0)}{'☆'.repeat(Math.max(0, 5 - (Number(item.rating) || 0)))}</td>
                          <td>{item.comment || '—'}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatAdminDateTime(item.time || item.created_at)}</td>
                        </tr>
                      )) : <tr><td colSpan="5" className="empty-tbl">No feedback submitted yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab === 'tables' && (() => {
              const availableCount = tables.filter(t => t.status === 'available' || !t.status).length;
              const occupiedCount = tables.filter(t => t.status === 'occupied').length;
              const reservedCount = tables.filter(t => t.status === 'reserved').length;
              const cleaningCount = tables.filter(t => t.status === 'cleaning').length;

              const tableStatusStyles = {
                available: { border: '#2ECC71', dot: '#2ECC71', label: 'AVAILABLE' },
                occupied:  { border: '#E74C3C', dot: '#E74C3C', label: 'OCCUPIED' },
                reserved:  { border: '#3498DB', dot: '#3498DB', label: 'RESERVED' },
                cleaning:  { border: '#F39C12', dot: '#F39C12', label: 'CLEANING' },
              };

              return (
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div className="pg-title" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '28px', color: 'var(--text)', marginBottom: '4px', fontWeight: 700 }}>Tables</div>
                      <div className="pg-sub" style={{ fontSize: '13px', color: 'var(--muted)' }}>Floor map & seating status — {tables.length} tables.</div>
                    </div>
                    <button
                      className="btn-add"
                      style={{
                        background: 'var(--gold)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s ease',
                      }}
                      onClick={() => openTableModal(null)}
                      disabled={tables.length >= 100}
                    >
                      + Add Table
                    </button>
                  </div>

                  {/* Top 4 Status Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="table-metric-card">
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>AVAILABLE</div>
                      <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: '#2ECC71', marginTop: '6px' }}>{availableCount}</div>
                    </div>
                    <div className="table-metric-card">
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>OCCUPIED</div>
                      <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: '#E74C3C', marginTop: '6px' }}>{occupiedCount}</div>
                    </div>
                    <div className="table-metric-card">
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>RESERVED</div>
                      <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: '#3498DB', marginTop: '6px' }}>{reservedCount}</div>
                    </div>
                    <div className="table-metric-card">
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>CLEANING</div>
                      <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: '#F39C12', marginTop: '6px' }}>{cleaningCount}</div>
                    </div>
                  </div>

                  {/* Table Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                    {tables.map(t => {
                      const tblStatus = t.status || 'available';
                      const tblStyle = tableStatusStyles[tblStatus] || tableStatusStyles.available;
                      const tableLabel = t.name || `Table ${t.id}`;

                      const cycleOrder = ['available', 'occupied', 'reserved', 'cleaning'];
                      const curIdx = cycleOrder.indexOf(tblStatus);
                      const nextStatus = cycleOrder[curIdx >= 0 ? (curIdx + 1) % cycleOrder.length : 1];
                      const nextLabel = tableStatusStyles[nextStatus]?.label || 'OCCUPIED';

                      return (
                        <div key={t.id} className="table-item-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '15px' }}>🪑</span>
                            <span style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tableLabel}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                            {t.seats ? `${t.seats} seats` : 'No seats'}
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <button
                              type="button"
                              onClick={() => updateTableStatus(t.id, nextStatus)}
                              title={`Status: ${tblStyle.label} — Click to switch to ${nextLabel}`}
                              style={{
                                width: '100%',
                                display: 'block',
                                padding: '5px 6px',
                                borderRadius: '100px',
                                border: `1.5px solid ${tblStyle.border}`,
                                color: tblStyle.dot,
                                background: 'transparent',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                outline: 'none',
                                userSelect: 'none',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {tblStyle.label}
                            </button>
                          </div>

                          <div style={{ marginTop: 'auto', display: 'flex', gap: '4px', paddingTop: '4px' }}>
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => openTableModal(t.id)}
                              style={{
                                flex: 1,
                                fontSize: '11px',
                                padding: '4px 0',
                                borderRadius: '6px',
                                border: '1px solid var(--border-h)',
                                background: 'var(--bg2)',
                                color: 'var(--gold)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-qr"
                              onClick={() => openTableQRModal(t)}
                              style={{
                                flex: 1,
                                fontSize: '11px',
                                padding: '4px 0',
                                borderRadius: '6px',
                                border: '1px solid rgba(58, 120, 200, 0.4)',
                                background: 'var(--bg2)',
                                color: '#6AABFF',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                              }}
                            >
                              <span style={{ fontSize: '10px' }}>📱</span> QR
                            </button>
                            <button
                              type="button"
                              className="btn-del"
                              onClick={() => confirmAction(`Delete ${tableLabel}?`, () => deleteTable(t.id))}
                              disabled={tables.length <= 1}
                              style={{
                                flex: 1,
                                fontSize: '12px',
                                padding: '6px 0',
                                borderRadius: '10px',
                                border: '1px solid var(--d-bd)',
                                background: 'var(--bg2)',
                                color: 'var(--d-tx)',
                                cursor: tables.length <= 1 ? 'not-allowed' : 'pointer',
                                opacity: tables.length <= 1 ? 0.5 : 1,
                                transition: 'all 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
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

      {/* Restore Products Overlay */}
      <div className={`overlay${ovRestoreProducts ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvRestoreProducts(false)}>
        <div className="modal" style={{ maxWidth: '470px' }}>
          <h3>Restore Products</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>Only products deleted from this admin page appear here. Restoring returns the original product details to the live menu.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '310px', overflowY: 'auto', paddingRight: '2px' }}>
            {deletedProducts.length ? deletedProducts.map((archivedProduct) => {
              const product = archivedProduct.product_data || {};
              const isRestoring = restoringId === archivedProduct.id;
              const name = product.name || 'Unnamed Product';
              const category = product.category || product.cat || 'Coffee';
              const price = product.price ?? 0;
              const emoji = product.emoji || '☕';
              return (
                <div key={archivedProduct.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg2)' }}>
                  <span style={{ fontSize: '20px' }}>{emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '13px' }}>{name}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>{category} · ৳{price}</div>
                  </div>
                  <button
                    type="button"
                    className="btn-save"
                    disabled={restoringId !== null}
                    onClick={() => restoreSingleProduct(archivedProduct)}
                    style={{ padding: '6px 10px', fontSize: '11px', cursor: restoringId !== null ? 'not-allowed' : 'pointer' }}
                  >
                    {isRestoring ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              );
            }) : <div className="empty-tbl" style={{ padding: '28px 16px' }}>No deleted products to restore.</div>}
          </div>
          <div className="modal-btns" style={{ marginTop: '18px' }}>
            <button className="btn-cancel" onClick={() => setOvRestoreProducts(false)}>Close</button>
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

      {/* Table QR Modal Overlay */}
      <div className={`overlay${ovTableQR ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvTableQR(false)}>
        {qrTable && (
          <div className="modal qr-modal" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--shadow)', transition: 'var(--transition-theme)' }}>
            <h3 style={{ textAlign: 'center', fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '24px', color: 'var(--text)', fontWeight: 600, marginBottom: '18px', letterSpacing: '0.5px' }}>
              QR Code — {qrTable.name || (`Table ${qrTable.id}`)}
            </h3>

            <TableQrCard
              tableName={(qrTable.name || (`Table ${qrTable.id}`)).toUpperCase()}
              qrValue={`${qrSiteUrl.trim().replace(/\/$/, '')}/?table=${qrTable.id}`}
              qrId={`qr-admin-preview-${qrTable.id}`}
            />

            <div className="field" style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>
                WEBSITE URL <span style={{ color: '#4CAF50', fontWeight: 700 }}>(AUTO-DETECTED)</span>
              </label>
              <input
                className="inp"
                type="text"
                value={qrSiteUrl}
                onChange={e => {
                  setQrSiteUrl(e.target.value);
                  localStorage.setItem('ca_site_url', e.target.value);
                }}
                placeholder="https://coffeer-attokahon.vercel.app"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', width: '100%' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.45, textAlign: 'left' }}>
                Detected automatically from this page — the QR is generated instantly above. Only edit this if your site is actually hosted somewhere else.
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--gold)', fontFamily: 'monospace' }}>
                {`${qrSiteUrl.trim().replace(/\/$/, '')}/?table=${qrTable.id}`}
              </div>
            </div>

            <div className="modal-btns" style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button className="btn-cancel" onClick={() => setOvTableQR(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              <button className="btn-save" onClick={downloadSingleTableQR} style={{ flex: 1.5, padding: '11px', background: 'var(--gold)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(160,108,40,0.3)' }}>⬇ Download PNG</button>
            </div>
          </div>
        )}
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
            <button className="btn-del-ok" onClick={confirmCallback}>{confirmButtonLabel}</button>
          </div>
        </div>
      </div>

      {/* Order Details Invoice Modal Overlay */}
      <div className={`overlay${ovOrderDetails ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && setOvOrderDetails(false)}>
        {viewOrderDetails && (() => {
          const order = viewOrderDetails;
          const date = new Date(order.time || order.created_at);
          const dateStr = !isNaN(date.getTime()) ? date.toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
          const timeStr = !isNaN(date.getTime()) ? date.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' }) : '—';
          const subtotal = order.subtotal || (order.items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
          const service = order.serviceCharge || order.service_charge || 0;
          const isCancelled = order.status === 'cancelled' || order.status === 'failed' || order.status === 'refunded';
          const isVerified = !isCancelled && ['confirmed', 'preparing', 'ready', 'served', 'paid'].includes(order.status);

          return (
            <div className="modal invoice-modal" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOvOrderDetails(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  zIndex: 10,
                }}
              >
                ✕
              </button>

              <div className="invoice">
                <div className="invoice-head">
                  <div className="inv-brand">
                    <img className="inv-logo-img" src="/logo.png" alt="" />
                    <div>
                      <div className="logo"><em>Coffee-r</em> Attokahon</div>
                      <div className="tagline">Artisan Coffee &amp; Cuisine</div>
                    </div>
                  </div>
                  <div className="inv-meta">
                    <div className="inv-num">{esc(order.invoiceNum || order.invoice_num || 'INV-' + order.id)}</div>
                    <div className="inv-date">{dateStr} · {timeStr}</div>
                    <div className={`inv-status ${isCancelled ? 'failed' : ''}`} style={isCancelled ? { background: 'rgba(192,64,64,0.12)', border: '1px solid rgba(192,64,64,0.28)', color: '#E08080' } : {}}>
                      {isCancelled ? '✗ Cancelled' : '✓ Paid'}
                    </div>
                  </div>
                </div>

                <div className="invoice-info">
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Order No.</div>
                    <div className="inv-info-value">#{order.id}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Table</div>
                    <div className="inv-info-value">{order.table ? 'Table ' + order.table : (order.table_id ? 'Table ' + order.table_id : 'Walk-in')}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Payment</div>
                    <div className="inv-info-value">{esc(order.paymentMethod || order.payment_method || '—')}</div>
                  </div>
                </div>

                <div className="inv-items">
                  <div className="inv-items-head">
                    <span>Item</span><span>Unit Price</span><span>Qty</span><span>Total</span>
                  </div>
                  {(order.items || []).map((item, i) => {
                    const itemImage = resolveProductImage(item, products);
                    const itemEmoji = item.emoji || '☕';
                    const itemName = item.name || item.product_name;
                    const itemPrice = Number(item.price || item.unit_price || 0);
                    const itemQty = Number(item.qty || item.quantity || 1);
                    return (
                      <div className="inv-item-row" key={i}>
                        <div className="inv-item-name">
                          {itemImage ? (
                            <img
                              className="inv-item-emoji"
                              src={itemImage}
                              alt={itemName}
                              style={{ width: '20px', height: '20px', borderRadius: '5px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'inline';
                                }
                              }}
                            />
                          ) : null}
                          <span className="inv-item-emoji" style={{ display: itemImage ? 'none' : 'inline' }}>{esc(itemEmoji)}</span>
                          <span>{esc(itemName)}</span>
                        </div>
                        <div className="inv-item-col price">৳{itemPrice}</div>
                        <div className="inv-item-col">×{itemQty}</div>
                        <div className="inv-item-col subtotal">৳{itemPrice * itemQty}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="invoice-totals">
                  <div className="tot-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
                  {service > 0 && <div className="tot-row"><span>Service Charge (5%)</span><span>৳{service}</span></div>}
                  <div className="tot-row grand"><span>Total Paid</span><span>৳{order.total}</span></div>
                </div>

                <div className="invoice-payment">
                  <div className="pay-row txn"><span>Transaction ID</span><span>{esc(order.paymentId || order.payment_id || '—')}</span></div>
                  {(order.senderPhone || order.sender_phone) && (
                    <div className="pay-row"><span>Sent From</span><span>{esc(order.senderPhone || order.sender_phone)}</span></div>
                  )}
                  <div className="pay-row">
                    <span>Payment Status</span>
                    <span style={{ color: isCancelled ? '#E08080' : isVerified ? 'var(--success-tx)' : '#D4A040', fontWeight: 600 }}>
                      {isCancelled ? '✗ Invalid / Cancelled' : isVerified ? '✓ Verified' : 'Pending'}
                    </span>
                  </div>
                </div>

                {order.note && (
                  <div className="invoice-note">
                    <div className="note-label">Special Instructions</div>
                    <div className="note-text">{esc(order.note)}</div>
                  </div>
                )}

                <div className="invoice-footer">
                  <div className="inv-footer-thanks">Thank you for visiting.</div>
                  <div className="inv-footer-sub">We hope to see you again soon · Coffee-r Attokahon</div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', background: 'var(--bg2)', display: 'flex', gap: '10px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setOvOrderDetails(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => window.print()}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🖨 Print Invoice
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
