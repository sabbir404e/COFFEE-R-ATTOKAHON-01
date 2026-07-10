'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const STATUS_FLOW = ['paid','preparing','ready','served'];
const STATUS_META = {
  paid:      { icon:'💳', label:'Received',  msg:'Your order has been received. The kitchen will start preparing it shortly.' },
  preparing: { icon:'👨‍🍳', label:'Preparing', msg:'The kitchen is preparing your order right now. Hang tight!' },
  ready:     { icon:'✅', label:'Ready',      msg:'Your order is ready! A staff member will bring it to your table.' },
  served:    { icon:'🎉', label:'Served',     msg:'Enjoy your order! Thank you for visiting Coffee-r Attokahon.' },
};

function esc(s) { return String(s); }

const readOrders = () => {
  try {
    const orders = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
};

export default function BillingPage() {
  const router = useRouter();
  const { toggleTheme } = useApp();
  const [order, setOrder] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);

  const loadOrder = useCallback(() => {
    const lastId = parseInt(localStorage.getItem('ca_last_order_id'));
    const orders = readOrders();
    if (!orders.length) return null;
    if (lastId) {
      const o = orders.find(x => x.id === lastId);
      if (o) return o;
    }
    return orders[0];
  }, []);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      const o = loadOrder();
      setOrder(o);
      if (o) setLiveStatus(o.status);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [loadOrder]);

  // Poll for live status
  useEffect(() => {
    if (!order) return;
    const iv = setInterval(() => {
      try {
        const orders = readOrders();
        const found = orders.find(o2 => o2.id === order.id);
        if (found) {
          setOrder(found);
          setLiveStatus(found.status);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [order]);

  if (!hydrated) return null;

  const currentStatus = STATUS_FLOW.includes(liveStatus) ? liveStatus : 'paid';
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const progressPct = currentIdx <= 0 ? 0 : Math.round((currentIdx / (STATUS_FLOW.length - 1)) * 100);
  const meta = STATUS_META[currentStatus] || STATUS_META.paid;
  const msgClass = currentStatus === 'ready' ? 'ready' : currentStatus === 'served' ? 'served' : '';

  return (
    <>
      <style>{`
        .main{max-width:560px;margin:0 auto;padding:24px 20px 48px;position:relative;z-index:1;}
        .paid-banner{display:flex;align-items:center;justify-content:center;gap:10px;background:var(--success-bg);border:1px solid var(--success-bd);border-radius:14px;padding:14px 20px;margin-bottom:24px;animation:fadeIn 0.4s ease;}
        .paid-check{width:32px;height:32px;border-radius:50%;background:var(--success-bd);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
        .paid-banner-text h4{font-size:15px;font-weight:600;color:var(--success-tx);}
        .paid-banner-text p{font-size:12px;color:var(--muted);margin-top:2px;}
        .invoice{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);animation:fadeIn 0.4s 0.1s ease both;}
        .invoice-head{padding:24px 24px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;}
        .inv-brand .logo{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;}
        .inv-brand .logo em{color:var(--gold);font-style:normal;}
        .inv-brand .tagline{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-top:4px;}
        .inv-meta{text-align:right;}
        .inv-meta .inv-num{font-family:var(--font-playfair),'Playfair Display',serif;font-size:16px;color:var(--gold);}
        .inv-meta .inv-date{font-size:11px;color:var(--muted);margin-top:4px;}
        .inv-meta .inv-status{display:inline-block;background:var(--success-bg);border:1px solid var(--success-bd);border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;color:var(--success-tx);text-transform:uppercase;letter-spacing:1px;margin-top:6px;}
        .invoice-info{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--border);}
        .inv-info-cell{padding:14px 20px;border-right:1px solid var(--border);}
        .inv-info-cell:last-child{border-right:none;}
        .inv-info-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:4px;}
        .inv-info-value{font-size:13px;font-weight:500;color:var(--text-2);}
        .inv-items{padding:0;}
        .inv-items-head{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:10px 20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);}
        .inv-item-row{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:12px 20px;border-bottom:1px solid rgba(200,148,56,0.07);align-items:center;}
        .inv-item-row:last-child{border-bottom:none;}
        .inv-item-name{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);}
        .inv-item-emoji{font-size:16px;}
        .inv-item-col{font-size:13px;text-align:right;color:var(--text-2);}
        .inv-item-col.price{color:var(--muted);}
        .inv-item-col.subtotal{color:var(--text);font-weight:500;}
        .invoice-totals{padding:16px 20px;border-top:1px solid var(--border);background:var(--bg2);}
        .tot-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);padding:5px 0;}
        .tot-row span:last-child{color:var(--text-2);}
        .tot-row.grand{font-size:17px;font-weight:700;border-top:1px solid var(--border);margin-top:8px;padding-top:12px;}
        .tot-row.grand span:first-child{color:var(--text);}
        .tot-row.grand span:last-child{color:var(--gold);font-size:20px;}
        .invoice-payment{padding:16px 20px;border-top:1px solid var(--border);}
        .pay-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:4px 0;color:var(--muted);}
        .pay-row span:last-child{color:var(--text-2);font-weight:500;}
        .pay-row.txn span:last-child{color:var(--gold);font-family:monospace;font-size:12px;}
        .invoice-note{padding:12px 20px;border-top:1px solid var(--border);background:rgba(200,148,56,0.04);}
        .note-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px;}
        .note-text{font-size:13px;color:var(--text-2);font-style:italic;}
        .invoice-footer{padding:18px 20px;border-top:1px solid var(--border);text-align:center;}
        .inv-footer-thanks{font-family:var(--font-playfair),'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--gold);margin-bottom:4px;}
        .inv-footer-sub{font-size:11px;color:var(--muted);}
        .action-row{display:flex;gap:10px;margin-top:20px;animation:fadeIn 0.4s 0.2s ease both;}
        .btn-print{flex:1;padding:13px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-print:hover{background:var(--gold-h);}
        .btn-order-more{flex:1;padding:13px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-order-more:hover{border-color:var(--border-h);color:var(--text);}
        .icon-btn{background:none;border:1px solid var(--border);border-radius:9px;padding:6px 13px;font-size:12px;color:var(--muted);cursor:pointer;transition:all 0.2s;}
        .icon-btn:hover{border-color:var(--border-h);color:var(--text);}
        .tracker-card{background:var(--card);border:2px solid var(--border-h);border-radius:18px;padding:24px;margin-bottom:20px;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .tracker-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:17px;margin-bottom:4px;}
        .tracker-sub{font-size:12px;color:var(--muted);margin-bottom:22px;}
        .tracker-steps{display:flex;align-items:flex-start;justify-content:space-between;position:relative;}
        .tracker-steps::before{content:'';position:absolute;top:16px;left:16px;right:16px;height:2px;background:var(--border);z-index:0;}
        .tracker-progress{position:absolute;top:16px;left:16px;height:2px;background:var(--gold);z-index:1;transition:width 0.6s cubic-bezier(0.16,1,0.3,1);}
        .t-step{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;z-index:2;flex:1;}
        .t-dot{width:32px;height:32px;border-radius:50%;border:2px solid var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.4s;flex-shrink:0;}
        .t-step.done .t-dot{background:var(--gold);border-color:var(--gold);color:#fff;}
        .t-step.active .t-dot{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 5px rgba(200,148,56,0.20);animation:tpulse 1.8s ease-in-out infinite;}
        .t-step.pending .t-dot{background:var(--bg2);border-color:var(--border);}
        .t-label{font-size:11px;font-weight:600;text-align:center;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;line-height:1.3;}
        .t-step.done .t-label,.t-step.active .t-label{color:var(--text-2);}
        .tracker-msg{margin-top:20px;padding:12px 16px;border-radius:12px;font-size:13px;line-height:1.6;text-align:center;background:rgba(200,148,56,0.07);border:1px solid var(--border);color:var(--text-2);}
        .tracker-msg.ready{background:rgba(42,114,72,0.12);border-color:rgba(42,114,72,0.28);color:#60C890;}
        .tracker-msg.served{background:var(--x-bg);border-color:var(--x-bd);color:var(--x-tx);}
        .tracker-refresh{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;font-size:11px;color:var(--muted);}
        .refresh-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:tpulse 1.8s ease-in-out infinite;}
        .empty-state{text-align:center;padding:60px 20px;color:var(--muted);}
        .empty-state h3{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;color:var(--text-2);margin-bottom:10px;}
        @media(max-width:600px){.main{padding:14px 12px 32px;}.invoice-info{grid-template-columns:repeat(2,1fr);}.action-row{flex-direction:column;}.invoice-head{flex-direction:column;gap:14px;}.inv-meta{text-align:left;}}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        <div className="topbar-right">
          <button className="icon-btn" onClick={() => window.print()}>🖨 Print</button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      <div className="main">
        {!order ? (
          <div className="empty-state">
            <div style={{fontSize:'48px',marginBottom:'14px'}}>📄</div>
            <h3>No invoice found</h3>
            <p style={{marginTop:'8px',fontSize:'14px',marginBottom:'24px'}}>Complete a payment first to see your invoice.</p>
            <button onClick={() => router.push('/order')} style={{padding:'12px 28px',background:'var(--gold)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>Go to Menu</button>
          </div>
        ) : (() => {
          const date = new Date(order.time);
          const dateStr = date.toLocaleDateString('en-BD', {year:'numeric',month:'long',day:'numeric'});
          const timeStr = date.toLocaleTimeString('en-BD', {hour:'2-digit',minute:'2-digit'});
          const subtotal = order.subtotal || order.items.reduce((s,i)=>s+i.price*i.qty,0);
          const service = order.serviceCharge || 0;

          return (
            <>
              <div className="paid-banner">
                <div className="paid-check">✓</div>
                <div className="paid-banner-text">
                  <h4>Payment Confirmed — Order #{order.id}</h4>
                  <p>Your order has been sent to the kitchen.</p>
                </div>
              </div>

              <div className="tracker-card">
                <div className="tracker-title">📍 Live Order Status</div>
                <div className="tracker-sub">Auto-updates every 3 seconds — no refresh needed.</div>
                <div className="tracker-steps">
                  <div className="tracker-progress" style={{width:`calc(${progressPct}% - 32px)`}} />
                  {STATUS_FLOW.map((s, i) => {
                    const sm = STATUS_META[s];
                    const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
                    return (
                      <div className={`t-step ${cls}`} key={s}>
                        <div className="t-dot">{i < currentIdx ? '✓' : sm.icon}</div>
                        <div className="t-label">{sm.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className={`tracker-msg ${msgClass}`}>{meta.msg}</div>
                <div className="tracker-refresh"><div className="refresh-dot" /><span>Live tracking</span></div>
              </div>

              <div className="invoice">
                <div className="invoice-head">
                  <div className="inv-brand">
                    <div className="logo"><em>Coffee-r</em> Attokahon</div>
                    <div className="tagline">Artisan Coffee &amp; Cuisine</div>
                  </div>
                  <div className="inv-meta">
                    <div className="inv-num">{esc(order.invoiceNum || 'INV-' + order.id)}</div>
                    <div className="inv-date">{dateStr} · {timeStr}</div>
                    <div className="inv-status">✓ Paid</div>
                  </div>
                </div>

                <div className="invoice-info">
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Order No.</div>
                    <div className="inv-info-value">#{order.id}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Table</div>
                    <div className="inv-info-value">{order.table ? 'Table ' + order.table : 'Walk-in'}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Payment</div>
                    <div className="inv-info-value">{esc(order.paymentMethod || '—')}</div>
                  </div>
                </div>

                <div className="inv-items">
                  <div className="inv-items-head">
                    <span>Item</span><span>Unit Price</span><span>Qty</span><span>Total</span>
                  </div>
                  {order.items.map((item, i) => (
                    <div className="inv-item-row" key={i}>
                      <div className="inv-item-name">
                        <span className="inv-item-emoji">{esc(item.emoji||'☕')}</span>
                        <span>{esc(item.name)}</span>
                      </div>
                      <div className="inv-item-col price">৳{item.price}</div>
                      <div className="inv-item-col">×{item.qty}</div>
                      <div className="inv-item-col subtotal">৳{item.price * item.qty}</div>
                    </div>
                  ))}
                </div>

                <div className="invoice-totals">
                  <div className="tot-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
                  {service > 0 && <div className="tot-row"><span>Service Charge (5%)</span><span>৳{service}</span></div>}
                  <div className="tot-row grand"><span>Total Paid</span><span>৳{order.total}</span></div>
                </div>

                <div className="invoice-payment">
                  <div className="pay-row txn"><span>Transaction ID</span><span>{esc(order.paymentId || '—')}</span></div>
                  <div className="pay-row"><span>Payment Status</span><span style={{color:'var(--success-tx)'}}>✓ Verified</span></div>
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

              <div className="action-row">
                <button className="btn-print" onClick={() => window.print()}>🖨&nbsp; Print Invoice</button>
                <button className="btn-order-more" onClick={() => router.push('/order' + (order.table ? '?table=' + order.table : ''))}>Order More Items</button>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
