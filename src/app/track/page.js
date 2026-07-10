'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const FLOW = ['paid','preparing','ready','served'];
const STATUS_META = {
  paid:      { icon:'💳', label:'Received',  pill:'sp-paid',      msg:'✅ Order received! The kitchen will start preparing it shortly.' },
  preparing: { icon:'👨‍🍳', label:'Preparing', pill:'sp-preparing', msg:'🔥 Your order is being prepared right now. It won\'t be long!' },
  ready:     { icon:'✅', label:'Ready',      pill:'sp-ready',     msg:'🎉 Your order is READY! A staff member will bring it to your table shortly.' },
  served:    { icon:'🍽️', label:'Served',     pill:'sp-served',    msg:'✓ Your order has been served. Enjoy your meal! Thank you for visiting.' },
};

function esc(s) { return String(s); }

function TrackPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme } = useApp();

  const tableNum = parseInt(searchParams.get('table')) || null;
  const [orders, setOrders] = useState([]);
  const [mounted, setMounted] = useState(false);

  const loadOrders = useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      const filtered = tableNum ? all.filter(o => o.table === tableNum) : all;
      setOrders(filtered);
    } catch {}
  }, [tableNum]);

  useEffect(() => {
    setMounted(true);
    loadOrders();
    const iv = setInterval(loadOrders, 3000);
    return () => clearInterval(iv);
  }, [loadOrders]);

  if (!mounted) return null;

  const active = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed');
  const served = orders.filter(o => o.status === 'served');
  const sorted = [...active, ...served].slice(0, 5);

  return (
    <>
      <style>{`
        .main{max-width:520px;margin:0 auto;padding:24px 20px 48px;position:relative;z-index:1;}
        .page-header{text-align:center;margin-bottom:28px;animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;}
        .page-header h1{font-family:var(--font-playfair),'Playfair Display',serif;font-size:28px;margin-bottom:6px;}
        .page-header p{font-size:14px;color:var(--muted);}
        .table-chip{display:inline-flex;align-items:center;gap:7px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:500;color:var(--gold);margin-top:12px;}
        .live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(42,114,72,0.12);border:1px solid rgba(42,114,72,0.25);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:600;color:#60C890;margin-top:8px;letter-spacing:0.5px;}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#60C890;animation:pulse 1.8s ease-in-out infinite;}
        .order-card{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:16px;box-shadow:var(--shadow);animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        .oc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);}
        .oc-id{font-family:var(--font-playfair),'Playfair Display',serif;font-size:17px;color:var(--text);}
        .oc-id span{color:var(--gold);}
        .oc-meta{font-size:11px;color:var(--muted);display:flex;gap:8px;margin-top:3px;}
        .status-pill{font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:4px 12px;border-radius:14px;border:1px solid;white-space:nowrap;}
        .sp-paid{background:rgba(70,100,180,0.14);border-color:rgba(70,100,180,0.30);color:#90A8E0;}
        .sp-preparing{background:var(--w-bg);border-color:var(--w-bd);color:var(--w-tx);}
        .sp-ready{background:var(--o-bg);border-color:var(--o-bd);color:var(--o-tx);}
        .sp-served{background:var(--x-bg);border-color:var(--x-bd);color:var(--x-tx);}
        .oc-stepper{padding:20px 18px 0;display:flex;align-items:flex-start;position:relative;}
        .oc-stepper::before{content:'';position:absolute;top:34px;left:calc(18px + 14px);right:calc(18px + 14px);height:2px;background:var(--border);z-index:0;}
        .oc-progress{position:absolute;top:34px;left:calc(18px + 14px);height:2px;background:var(--gold);z-index:1;transition:width 0.7s cubic-bezier(0.16,1,0.3,1);}
        .oc-step{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;position:relative;z-index:2;}
        .oc-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--bg);font-size:12px;display:flex;align-items:center;justify-content:center;transition:all 0.4s;flex-shrink:0;}
        .oc-step.done .oc-dot{background:var(--gold);border-color:var(--gold);color:#fff;}
        .oc-step.active .oc-dot{background:var(--gold);border-color:var(--gold);color:#fff;animation:tpulse 1.8s ease-in-out infinite;}
        .oc-step.pending .oc-dot{background:var(--bg2);color:var(--muted);}
        .oc-step-lbl{font-size:10px;font-weight:600;letter-spacing:0.5px;color:var(--muted);text-align:center;text-transform:uppercase;}
        .oc-step.done .oc-step-lbl,.oc-step.active .oc-step-lbl{color:var(--text-2);}
        .oc-msg{margin:16px 18px;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.65;border:1px solid var(--border);}
        .oc-msg.paid{background:rgba(70,100,180,0.10);border-color:rgba(70,100,180,0.25);color:#90A8E0;}
        .oc-msg.preparing{background:var(--w-bg);border-color:var(--w-bd);color:var(--w-tx);}
        .oc-msg.ready{background:var(--o-bg);border-color:var(--o-bd);color:var(--o-tx);}
        .oc-msg.served{background:var(--x-bg);border-color:var(--x-bd);color:var(--x-tx);}
        .oc-items{padding:0 18px 16px;display:flex;flex-wrap:wrap;gap:6px;}
        .oc-item-tag{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:12px;color:var(--text-2);}
        .oc-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid var(--border);background:rgba(200,148,56,0.03);}
        .oc-total{font-size:14px;font-weight:700;color:var(--gold);}
        .oc-invoice-link{font-size:12px;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;transition:all 0.2s;cursor:pointer;background:none;}
        .oc-invoice-link:hover{border-color:var(--border-h);color:var(--text);}
        .empty-state{text-align:center;padding:56px 20px;animation:fadeUp 0.5s ease;}
        .empty-icon{font-size:52px;margin-bottom:16px;}
        .empty-state h3{font-family:var(--font-playfair),'Playfair Display',serif;font-size:24px;color:var(--text-2);margin-bottom:8px;}
        .empty-state p{font-size:14px;color:var(--muted);line-height:1.7;max-width:280px;margin:0 auto 24px;}
        .btn-go-menu{display:inline-block;padding:13px 32px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:background 0.2s;}
        .btn-go-menu:hover{background:var(--gold-h);}
        .bottom-actions{display:flex;gap:10px;margin-top:8px;}
        .btn-menu{flex:1;padding:13px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-menu:hover{background:var(--gold-h);}
        .btn-invoice{flex:1;padding:13px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-invoice:hover{border-color:var(--border-h);color:var(--text);}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        <div className="topbar-right">
          <button className="back-btn" onClick={() => router.push('/' + (tableNum ? '?table=' + tableNum : ''))}>← Menu</button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      <div className="main">
        <div className="page-header">
          <h1>Track Your Order</h1>
          <p>Live status updates for your table.</p>
          {tableNum && <div className="table-chip">🪑 Table {tableNum}</div>}
          <br />
          <div className="live-badge"><div className="live-dot" />LIVE · updates every 3 sec</div>
        </div>

        <div>
          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No orders yet</h3>
              <p>Once you place and pay for an order, its status will appear here — live.</p>
              <button className="btn-go-menu" onClick={() => router.push('/order' + (tableNum ? '?table=' + tableNum : ''))}>Browse the Menu →</button>
            </div>
          ) : (
            <>
              {sorted.map(o => {
                const meta = STATUS_META[o.status] || STATUS_META.paid;
                const flowIdx = FLOW.indexOf(o.status);
                const pct = flowIdx <= 0 ? 0 : Math.round((flowIdx / (FLOW.length - 1)) * 100);
                const fmtTime = t => { try { return new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
                const elapsed = () => {
                  const ts = o.createdAt || (o.time ? new Date(o.time).getTime() : Date.now());
                  const mins = Math.floor((Date.now() - ts) / 60000);
                  if (mins < 1) return 'Just now';
                  if (mins < 60) return mins + 'm ago';
                  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
                };

                return (
                  <div className="order-card" key={o.id}>
                    <div className="oc-head">
                      <div>
                        <div className="oc-id">Order <span>#{o.id}</span></div>
                        <div className="oc-meta">
                          <span>🪑 {o.table ? 'Table ' + o.table : 'Walk-in'}</span>
                          <span>🕐 {fmtTime(o.time)}</span>
                          <span>{elapsed()}</span>
                        </div>
                      </div>
                      <span className={`status-pill ${meta.pill}`}>{meta.label}</span>
                    </div>
                    <div className="oc-stepper">
                      <div className="oc-progress" style={{width:`calc(${pct}% - 28px)`}} />
                      {FLOW.map((s, i) => {
                        const sm = STATUS_META[s];
                        const cls = i < flowIdx ? 'done' : i === flowIdx ? 'active' : 'pending';
                        return (
                          <div className={`oc-step ${cls}`} key={s}>
                            <div className="oc-dot">{i < flowIdx ? '✓' : sm.icon}</div>
                            <div className="oc-step-lbl">{sm.label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`oc-msg ${o.status}`}>{meta.msg}</div>
                    <div className="oc-items">
                      {o.items.map((item, j) => (
                        <div className="oc-item-tag" key={j}>{esc(item.emoji || '☕')} {esc(item.name)} ×{item.qty}</div>
                      ))}
                    </div>
                    <div className="oc-foot">
                      <span className="oc-total">৳{o.total}</span>
                      <button className="oc-invoice-link" onClick={() => { localStorage.setItem('ca_last_order_id', String(o.id)); router.push('/billing'); }}>View Invoice →</button>
                    </div>
                  </div>
                );
              })}
              <div className="bottom-actions">
                <button className="btn-menu" onClick={() => router.push('/order' + (tableNum ? '?table=' + tableNum : ''))}>+ Order More</button>
                <button className="btn-invoice" onClick={() => router.push('/billing')}>My Invoice</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="main" style={{ textAlign: 'center', color: 'var(--muted)', padding: '80px 20px' }}>
        <p>Loading tracker...</p>
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}
