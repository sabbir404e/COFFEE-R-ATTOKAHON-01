'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const readPendingCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem('ca_pending_cart'));
    return cart && Array.isArray(cart.items) ? cart : null;
  } catch {
    return null;
  }
};

export default function CheckoutPage() {
  const router = useRouter();
  const { toggleTheme } = useApp();
  const [pendingCart, setPendingCart] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const recalcCart = useCallback((cart) => {
    const items = cart.items
      .map(item => ({
        ...item,
        qty: Math.max(0, Number(item.qty) || 0),
        price: Number(item.price) || 0,
      }))
      .filter(item => item.qty > 0);

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const updated = {
      ...cart,
      items,
      subtotal,
      serviceCharge,
      total: subtotal + serviceCharge,
    };

    if (items.length) {
      localStorage.setItem('ca_pending_cart', JSON.stringify(updated));
    } else {
      localStorage.removeItem('ca_pending_cart');
    }

    return updated;
  }, []);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      const cart = readPendingCart();
      setPendingCart(cart && cart.items.length ? recalcCart(cart) : cart);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [recalcCart]);

  const changeQty = (idx, delta) => {
    const items = pendingCart.items
      .map((item, itemIdx) => (
        itemIdx === idx ? { ...item, qty: item.qty + delta } : item
      ))
      .filter(item => item.qty > 0);

    const updated = recalcCart({ ...pendingCart, items });
    setPendingCart(updated);
  };

  const saveNote = (val) => {
    const updated = { ...pendingCart, note: val };
    setPendingCart(updated);
    localStorage.setItem('ca_pending_cart', JSON.stringify(updated));
  };

  const goBack = () => {
    const t = pendingCart?.tableNum;
    router.push('/order' + (t ? '?table=' + t : ''));
  };

  if (!hydrated) return null;

  return (
    <>
      <style>{`
        .main{max-width:560px;margin:0 auto;padding:24px 20px 40px;position:relative;z-index:1;}
        .sect-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;margin-bottom:4px;}
        .sect-sub{font-size:13px;color:var(--muted);margin-bottom:20px;}
        .table-chip{display:inline-flex;align-items:center;gap:6px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:20px;padding:5px 14px;font-size:12px;color:var(--gold);margin-bottom:20px;}
        .order-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .order-card-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .order-card-head h3{font-size:14px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.8px;}
        .item-count{font-size:12px;color:var(--muted);}
        .order-item{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);transition:background 0.15s;}
        .order-item:last-child{border-bottom:none;}
        .order-item:hover{background:rgba(200,148,56,0.04);}
        .oi-emoji{font-size:24px;width:36px;text-align:center;flex-shrink:0;}
        .oi-info{flex:1;}
        .oi-name{font-size:14px;font-weight:500;color:var(--text);margin-bottom:2px;}
        .oi-meta{font-size:12px;color:var(--muted);}
        .oi-qty{display:flex;align-items:center;gap:6px;}
        .qty-ctrl{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--bg2);color:var(--muted);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .qty-ctrl:hover{border-color:var(--gold);color:var(--gold);background:rgba(200,148,56,0.08);}
        .qty-num{min-width:22px;text-align:center;font-weight:600;font-size:14px;color:var(--text);}
        .oi-price{min-width:64px;text-align:right;font-weight:600;color:var(--gold);font-size:14px;}
        .note-wrap{margin-bottom:16px;}
        .note-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;}
        .note-inp{width:100%;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--text);outline:none;resize:none;height:72px;transition:border-color 0.2s;}
        .note-inp:focus{border-color:var(--gold);}
        .note-inp::placeholder{color:var(--muted);}
        .summary-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:20px;box-shadow:var(--shadow);animation:fadeIn 0.4s 0.1s ease both;}
        .summary-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:var(--muted);padding:6px 0;}
        .summary-row:not(:last-child){border-bottom:1px solid var(--border);}
        .summary-row span:last-child{color:var(--text-2);font-weight:500;}
        .summary-row.total{font-size:17px;font-weight:700;}
        .summary-row.total span:first-child{color:var(--text);}
        .summary-row.total span:last-child{color:var(--gold);font-size:20px;}
        .btn-pay{width:100%;padding:16px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;font-family:var(--font-playfair),'Playfair Display',serif;cursor:pointer;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;box-shadow:0 4px 20px rgba(200,148,56,0.25);animation:fadeIn 0.4s 0.2s ease both;}
        .btn-pay:hover{background:var(--gold-h);transform:translateY(-1px);box-shadow:0 6px 24px rgba(200,148,56,0.35);}
        .btn-pay:disabled{background:var(--border);cursor:not-allowed;box-shadow:none;}
        .empty-state{text-align:center;padding:60px 20px;color:var(--muted);animation:fadeIn 0.4s ease;}
        .empty-icon{font-size:48px;margin-bottom:14px;}
        .empty-state h3{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;color:var(--text-2);margin-bottom:8px;}
        .empty-state p{font-size:14px;line-height:1.6;margin-bottom:24px;}
        .btn-back-menu{display:inline-block;padding:12px 28px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-back-menu:hover{background:var(--gold-h);}
        @media(max-width:600px){.main{padding:16px 16px 32px;}.steps{padding:14px 10px 0;}.step-label{display:none;}}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        <div className="topbar-right">
          <button className="back-btn" onClick={goBack}>← Menu</button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      {/* Steps */}
      <div className="steps">
        <div className="step done"><div className="step-dot">✓</div><span className="step-label">Menu</span></div>
        <div className="step-line filled" />
        <div className="step active"><div className="step-dot">2</div><span className="step-label">Review</span></div>
        <div className="step-line" />
        <div className="step pending"><div className="step-dot">3</div><span className="step-label">Payment</span></div>
        <div className="step-line" />
        <div className="step pending"><div className="step-dot">4</div><span className="step-label">Confirmed</span></div>
      </div>

      <div className="main">
        {(!pendingCart || !pendingCart.items || !pendingCart.items.length) ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>{pendingCart && pendingCart.items && pendingCart.items.length === 0 ? 'Cart is now empty' : 'Your cart is empty'}</h3>
            <p>Looks like you haven&apos;t added anything yet.<br />Go back to the menu to start your order.</p>
            <button className="btn-back-menu" onClick={goBack}>Browse Menu →</button>
          </div>
        ) : (
          <>
            <div className="sect-title">Review Your Order</div>
            <div className="sect-sub">Confirm your items before payment.</div>
            {pendingCart.tableNum && <div className="table-chip">🪑 Table {pendingCart.tableNum}</div>}

            <div className="order-card">
              <div className="order-card-head">
                <h3>Order Items</h3>
                <span className="item-count">
                  {pendingCart.items.reduce((s, i) => s + i.qty, 0)} item{pendingCart.items.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''}
                </span>
              </div>
              {pendingCart.items.map((item, idx) => (
                <div className="order-item" key={idx}>
                  <div className="oi-emoji">{item.emoji || '☕'}</div>
                  <div className="oi-info">
                    <div className="oi-name">{item.name}</div>
                    <div className="oi-meta">৳{item.price} each</div>
                  </div>
                  <div className="oi-qty">
                    <button className="qty-ctrl" onClick={() => changeQty(idx, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-ctrl" onClick={() => changeQty(idx, +1)}>+</button>
                  </div>
                  <div className="oi-price">৳{item.price * item.qty}</div>
                </div>
              ))}
            </div>

            <div className="note-wrap">
              <div className="note-label">Special Instructions (optional)</div>
              <textarea className="note-inp" id="noteInp" placeholder="Allergies, preferences, extra requests…"
                defaultValue={pendingCart.note || ''}
                onChange={e => saveNote(e.target.value)} />
            </div>

            <div className="summary-card">
              <div className="summary-row"><span>Subtotal</span><span>৳{pendingCart.subtotal}</span></div>
              <div className="summary-row"><span>Service Charge (5%)</span><span>৳{pendingCart.serviceCharge}</span></div>
              <div className="summary-row total"><span>Total</span><span>৳{pendingCart.total}</span></div>
            </div>

            <button className="btn-pay" onClick={() => router.push('/payment')}>Proceed to Payment →</button>
          </>
        )}
      </div>
    </>
  );
}
