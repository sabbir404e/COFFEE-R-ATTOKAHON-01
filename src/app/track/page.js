'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const FLOW_ORDER = ['paid', 'confirmed', 'preparing', 'ready', 'served'];

const STATUS_META = {
  paid: {
    icon: '💳',
    label: 'Received',
    pill: 'sp-paid',
    msg: '✅ Order received! Our staff is verifying your payment.'
  },
  confirmed: {
    icon: '✔️',
    label: 'Payment Verified',
    pill: 'sp-confirmed',
    msg: '✔️ Payment verified! The kitchen will start preparing your order shortly.'
  },
  preparing: {
    icon: '👨‍🍳',
    label: 'Preparing',
    pill: 'sp-preparing',
    msg: '🔥 Your order is being prepared right now. It won\'t be long!'
  },
  ready: {
    icon: '✅',
    label: 'Ready',
    pill: 'sp-ready',
    msg: '🎉 Your order is READY! A staff member will bring it to your table shortly.'
  },
  served: {
    icon: '🍽️',
    label: 'Served',
    pill: 'sp-served',
    msg: '✓ Your order has been served. Enjoy your meal! Thank you for visiting.'
  },
};

const STEPS = [
  { key: 'paid',      label: 'Order Placed',     icon: '📝' },
  { key: 'confirmed', label: 'Payment Verified', icon: '💳' },
  { key: 'preparing', label: 'Preparing',        icon: '👨‍🍳' },
  { key: 'ready',     label: 'Ready',             icon: '✅' },
  { key: 'served',    label: 'Served',            icon: '🍽️' },
];

function esc(s) { return String(s); }

function TrackPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme, products } = useApp();

  const tableNum = parseInt(searchParams.get('table')) || null;
  const [orders, setOrders] = useState([]);
  const [mounted, setMounted] = useState(false);
  
  // Feedback state
  const [feedbacks, setFeedbacks] = useState([]);
  const [pendingRating, setPendingRating] = useState({});
  const [pendingComment, setPendingComment] = useState({});

  const loadOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (tableNum) query = query.eq('table_id', tableNum);
      const { data } = await query;
      if (data) {
        setOrders(data.map(o => ({
          id: o.id, invoiceNum: o.invoice_num, table: o.table_id,
          items: (o.order_items || []).map(i => ({ id: i.product_id, name: i.product_name, qty: i.quantity, emoji: '☕' })),
          total: Number(o.total), status: o.status, time: o.created_at
        })));
        
        // Load feedback for served orders
        const servedIds = data.filter(o => o.status === 'served').map(o => o.id);
        if (servedIds.length > 0) {
          const { data: fbData } = await supabase.from('feedback').select('*').in('order_id', servedIds);
          if (fbData) setFeedbacks(fbData);
        }
      }
    } catch {}
  }, [tableNum]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      loadOrders();
    });

    let insertTimer;

    // Real-time: listen for order status changes for this table
    const channel = supabase
      .channel(`rt_track_orders_${tableNum ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          ...(tableNum ? { filter: `table_id=eq.${tableNum}` } : {}),
        },
        ({ new: updated }) => {
          setOrders(prev =>
            prev.map(o =>
              o.id === updated.id ? { ...o, status: updated.status } : o
            )
          );
          if (updated.status === 'served') {
            setTimeout(loadOrders, 500); // Reload to potentially grab feedback
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          ...(tableNum ? { filter: `table_id=eq.${tableNum}` } : {}),
        },
        () => {
          // New order came in — reload to get order_items too (debounced to allow items to be inserted)
          if (insertTimer) clearTimeout(insertTimer);
          insertTimer = setTimeout(() => {
            loadOrders();
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          // Order items inserted — reload orders to capture them
          if (insertTimer) clearTimeout(insertTimer);
          insertTimer = setTimeout(() => {
            loadOrders();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      cancelAnimationFrame(handle);
      if (insertTimer) clearTimeout(insertTimer);
      channel.unsubscribe();
    };
  }, [loadOrders, tableNum]);

  const submitFeedback = async (orderId, tableId) => {
    const rating = pendingRating[orderId];
    if (!rating) {
      alert('Please select a star rating first.');
      return;
    }
    const comment = pendingComment[orderId] || '';
    
    // Optimistic update
    const newFb = { order_id: orderId, table_id: tableId || null, rating, comment, created_at: new Date().toISOString() };
    setFeedbacks(prev => [...prev, newFb]);
    
    try {
      await supabase.from('feedback').insert(newFb);
    } catch {}
  };

  if (!mounted) return null;

  const active = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled' && o.status !== 'failed');
  const served = orders.filter(o => o.status === 'served');
  const sorted = [...active, ...served].slice(0, 5);

  return (
    <>
      <style>{`
        :root{--tt:background-color 0.3s,color 0.3s,border-color 0.3s;}
        [data-theme="dark"]{
          --bg:#1A1410;--bg2:#211A12;--card:#2A2115;
          --border:rgba(200,148,56,0.20);--border-h:rgba(200,148,56,0.45);
          --gold:#C89438;--gold-h:#E0AE58;
          --text:#EDE0C8;--text2:#BBA880;--muted:#8A7860;
          --shadow:0 4px 24px rgba(0,0,0,0.35);--pill-bg:rgba(200,148,56,0.13);
          --s-paid-bg:rgba(70,100,180,0.14);--s-paid-bd:rgba(70,100,180,0.30);--s-paid-tx:#90A8E0;
          --s-prep-bg:rgba(168,112,32,0.14);--s-prep-bd:rgba(168,112,32,0.28);--s-prep-tx:#D4A040;
          --s-ready-bg:rgba(42,114,72,0.16);--s-ready-bd:rgba(42,114,72,0.30);--s-ready-tx:#60C890;
          --s-served-bg:rgba(80,80,80,0.14);--s-served-bd:rgba(80,80,80,0.22);--s-served-tx:#999;
          --s-confirmed-bg:rgba(56,150,168,0.16);--s-confirmed-bd:rgba(56,150,168,0.32);--s-confirmed-tx:#5BC8DA;
        }
        [data-theme="light"]{
          --bg:#F0E8D8;--bg2:#E8DEC8;--card:#FAF4E8;
          --border:rgba(160,108,40,0.20);--border-h:rgba(160,108,40,0.48);
          --gold:#A06C28;--gold-h:#8A5A18;
          --text:#2E1C08;--text2:#5C4020;--muted:#9A7850;
          --shadow:0 4px 24px rgba(100,60,10,0.10);--pill-bg:rgba(160,108,40,0.12);
          --s-paid-bg:rgba(50,80,160,0.10);--s-paid-bd:rgba(50,80,160,0.22);--s-paid-tx:#3A5CAA;
          --s-prep-bg:rgba(138,92,16,0.10);--s-prep-bd:rgba(138,92,16,0.22);--s-prep-tx:#8A5C10;
          --s-ready-bg:rgba(30,100,60,0.10);--s-ready-bd:rgba(30,100,60,0.22);--s-ready-tx:#1A6B3A;
          --s-served-bg:rgba(60,60,60,0.08);--s-served-bd:rgba(60,60,60,0.16);--s-served-tx:#666;
          --s-confirmed-bg:rgba(20,110,130,0.10);--s-confirmed-bd:rgba(20,110,130,0.24);--s-confirmed-tx:#147082;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:var(--tt);}
        button{font-family:'Outfit',sans-serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(200,148,56,0.22);}50%{box-shadow:0 0 0 8px rgba(200,148,56,0.07);}}
        @keyframes spin{to{transform:rotate(360deg);}}

        .glow{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 70% 40% at 50% 0%,rgba(200,148,56,0.10) 0%,transparent 65%);}

        .topbar{background:var(--card);border-bottom:1px solid var(--border);height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:var(--shadow);}
        .brand{font-family:'Playfair Display',serif;font-size:18px;display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);}
        .brand-logo{width:52px;height:52px;object-fit:cover;border-radius:50%;border:2px solid var(--gold);background:var(--bg2);flex-shrink:0;box-shadow:0 2px 10px rgba(200,148,56,0.35);transition:transform 0.3s ease;}
        .brand:hover .brand-logo{transform:scale(1.08) rotate(-3deg);border-color:var(--gold-h);}
        .brand em{color:var(--gold);font-style:normal;}
        .topbar-right{display:flex;align-items:center;gap:10px;}
        .back-btn{background:none;border:1px solid var(--border);border-radius:9px;padding:6px 14px;font-size:13px;color:var(--muted);cursor:pointer;transition:all 0.2s;}
        .back-btn:hover{border-color:var(--border-h);color:var(--text);}
        .theme-toggle{width:38px;height:20px;background:var(--border-h);border-radius:10px;border:none;cursor:pointer;position:relative;}
        .theme-toggle::after{content:'';position:absolute;width:14px;height:14px;background:var(--card);border-radius:50%;top:3px;left:3px;transition:transform 0.3s;}
        [data-theme="light"] .theme-toggle::after{transform:translateX(18px);}

        .main{max-width:520px;margin:0 auto;padding:24px 20px 48px;position:relative;z-index:1;}

        .page-header{text-align:center;margin-bottom:28px;animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;}
        .page-header h1{font-family:'Playfair Display',serif;font-size:28px;margin-bottom:6px;}
        .page-header p{font-size:14px;color:var(--muted);}
        .table-chip{display:inline-flex;align-items:center;gap:7px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:500;color:var(--gold);margin-top:12px;}
        .live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(42,114,72,0.12);border:1px solid rgba(42,114,72,0.25);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:600;color:#60C890;margin-top:8px;letter-spacing:0.5px;}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#60C890;animation:pulse 1.8s ease-in-out infinite;}

        .order-card{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:16px;box-shadow:var(--shadow);animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        .order-card:nth-child(2){animation-delay:0.05s;}
        .order-card:nth-child(3){animation-delay:0.10s;}

        .oc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);}
        .oc-id{font-family:'Playfair Display',serif;font-size:17px;color:var(--text);}
        .oc-id span{color:var(--gold);}
        .oc-meta{font-size:11px;color:var(--muted);display:flex;gap:8px;margin-top:3px;}
        .status-pill{font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:4px 12px;border-radius:14px;border:1px solid;white-space:nowrap;}
        .sp-paid   {background:var(--s-paid-bg); border-color:var(--s-paid-bd); color:var(--s-paid-tx);}
        .sp-preparing{background:var(--s-prep-bg); border-color:var(--s-prep-bd); color:var(--s-prep-tx);}
        .sp-ready  {background:var(--s-ready-bg);border-color:var(--s-ready-bd);color:var(--s-ready-tx);}
        .sp-served {background:var(--s-served-bg);border-color:var(--s-served-bd);color:var(--s-served-tx);}
        .sp-confirmed{background:var(--s-confirmed-bg);border-color:var(--s-confirmed-bd);color:var(--s-confirmed-tx);}

        .oc-stepper{padding:20px 18px 0;display:flex;align-items:flex-start;position:relative;}
        .oc-stepper::before{content:'';position:absolute;top:34px;left:calc(18px + 14px);right:calc(18px + 14px);height:2px;background:var(--border);z-index:0;}
        .oc-progress{position:absolute;top:34px;left:calc(18px + 14px);height:2px;background:var(--gold);z-index:1;transition:width 0.7s cubic-bezier(0.16,1,0.3,1);}
        .oc-step{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;position:relative;z-index:2;}
        .oc-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--bg);font-size:12px;display:flex;align-items:center;justify-content:center;transition:all 0.4s;flex-shrink:0;}
        .oc-step.done .oc-dot{background:#2FAE60;border-color:#2FAE60;color:#fff;}
        .oc-step.active .oc-dot{background:var(--gold);border-color:var(--gold);color:#fff;animation:pulse 1.8s ease-in-out infinite;}
        .oc-step.pending .oc-dot{background:var(--bg2);color:var(--muted);}
        .oc-step-lbl{font-size:10px;font-weight:600;letter-spacing:0.5px;color:var(--muted);text-align:center;text-transform:uppercase;}
        .oc-step.done .oc-step-lbl,.oc-step.active .oc-step-lbl{color:var(--text2);}

        .oc-msg{margin:16px 18px;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.65;border:1px solid var(--border);}
        .oc-msg.paid     {background:var(--s-paid-bg); border-color:var(--s-paid-bd); color:var(--s-paid-tx);}
        .oc-msg.preparing{background:var(--s-prep-bg); border-color:var(--s-prep-bd); color:var(--s-prep-tx);}
        .oc-msg.ready    {background:var(--s-ready-bg);border-color:var(--s-ready-bd);color:var(--s-ready-tx);}
        .oc-msg.served   {background:var(--s-served-bg);border-color:var(--s-served-bd);color:var(--s-served-tx);}
        .oc-msg.confirmed{background:var(--s-confirmed-bg);border-color:var(--s-confirmed-bd);color:var(--s-confirmed-tx);}

        .oc-items{padding:0 18px 16px;display:flex;flex-wrap:wrap;gap:6px;}
        .oc-item-tag{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:12px;color:var(--text2);display:inline-flex;align-items:center;gap:6px;}
        .oc-item-thumb{width:18px;height:18px;border-radius:5px;object-fit:cover;}

        .oc-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid var(--border);background:rgba(200,148,56,0.03);}
        .oc-total{font-size:14px;font-weight:700;color:var(--gold);}
        .oc-invoice-link{font-size:12px;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;transition:all 0.2s;cursor:pointer;background:none;}
        .oc-invoice-link:hover{border-color:var(--border-h);color:var(--text);}

        .empty-state{text-align:center;padding:56px 20px;animation:fadeUp 0.5s ease;}
        .empty-icon{font-size:52px;margin-bottom:16px;}
        .empty-state h3{font-family:'Playfair Display',serif;font-size:24px;color:var(--text2);margin-bottom:8px;}
        .empty-state p{font-size:14px;color:var(--muted);line-height:1.7;max-width:280px;margin:0 auto 24px;}
        .btn-go-menu{display:inline-block;padding:13px 32px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:background 0.2s;}
        .btn-go-menu:hover{background:var(--gold-h);}

        .bottom-actions{display:flex;gap:10px;margin-top:8px;}
        .btn-menu{flex:1;padding:13px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-menu:hover{background:var(--gold-h);}
        .btn-invoice{flex:1;padding:13px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-invoice:hover{border-color:var(--border-h);color:var(--text);}

        .oc-feedback{padding:14px 18px 18px;border-top:1px solid var(--border);}
        .oc-feedback-lbl{font-size:12px;color:var(--muted);margin-bottom:8px;}
        .star-row{display:flex;gap:6px;margin-bottom:10px;}
        .star-btn{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:var(--border-h);transition:transform 0.15s,color 0.15s;padding:0;}
        .star-btn:hover{transform:scale(1.15);}
        .star-btn.on{color:var(--gold);}
        .fb-comment{width:100%;background:var(--input-bg,var(--bg));border:1px solid var(--border);border-radius:9px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;resize:vertical;min-height:44px;font-family:'Outfit',sans-serif;margin-bottom:8px;}
        .fb-comment:focus{border-color:var(--gold);}
        .btn-fb-submit{padding:9px 16px;background:var(--gold);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-fb-submit:hover{background:var(--gold-h);}
        .fb-done{font-size:13px;color:var(--s-ready-tx);display:flex;align-items:center;gap:6px;}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand">
          <img className="brand-logo" src="/logo.png" alt="" />
          <em>Coffee-r</em> Attokahon
        </Link>
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
          <div className="live-badge"><div className="live-dot" />LIVE · instant updates</div>
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
                const curRank = FLOW_ORDER.indexOf(o.status);

                let activeIdx = -1;
                STEPS.forEach((s, i) => { if (FLOW_ORDER.indexOf(s.key) === curRank) activeIdx = i; });

                const pct = activeIdx <= 0 ? 0 : Math.round((activeIdx / (STEPS.length - 1)) * 100);
                const barWidth = `calc(${pct}% - 28px)`;
                
                const fmtTime = t => { try { return new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
                const elapsed = () => {
                  const ts = o.createdAt || (o.time ? new Date(o.time).getTime() : Date.now());
                  const mins = Math.floor((Date.now() - ts) / 60000);
                  if (mins < 1) return 'Just now';
                  if (mins < 60) return mins + 'm ago';
                  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
                };

                const existingFb = feedbacks.find(f => f.order_id === o.id);
                const pendingR = pendingRating[o.id] || 0;

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
                      <div className="oc-progress" style={{width:barWidth}} />
                      {STEPS.map((s, i) => {
                        const rank = FLOW_ORDER.indexOf(s.key);
                        const cls = (rank < curRank || (rank === curRank && i < activeIdx)) ? 'done' : i === activeIdx ? 'active' : 'pending';
                        const dot = cls === 'done' ? '✓' : s.icon;
                        return (
                          <div className={`oc-step ${cls}`} key={i}>
                            <div className="oc-dot">{dot}</div>
                            <div className="oc-step-lbl">{s.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={`oc-msg ${o.status}`}>{meta.msg}</div>

                    <div className="oc-items">
                      {o.items.map((item, j) => {
                        const foundProd = (products || []).find(
                          p => p.id === item.id || 
                          (p.name && item.name && item.name.toLowerCase().startsWith(p.name.toLowerCase()))
                        );
                        const itemImage = foundProd?.image || foundProd?.image_url || item.image;
                        const itemEmoji = foundProd?.emoji || item.emoji || '☕';
                        return (
                          <div className="oc-item-tag" key={j}>
                            {itemImage ? (
                              <img className="oc-item-thumb" src={itemImage} alt="" />
                            ) : (
                              esc(itemEmoji)
                            )} {esc(item.name)} ×{item.qty}
                          </div>
                        );
                      })}
                    </div>

                    <div className="oc-foot">
                      <span className="oc-total">৳{o.total}</span>
                      <button className="oc-invoice-link" onClick={() => { localStorage.setItem('ca_last_order_id', String(o.id)); router.push('/billing'); }}>View Invoice →</button>
                    </div>

                    {o.status === 'served' && (
                      existingFb ? (
                        <div className="oc-feedback">
                          <div className="fb-done">✓ Thanks for your feedback — <span style={{color:'var(--gold)'}}>{'★'.repeat(existingFb.rating)}{'☆'.repeat(5-existingFb.rating)}</span></div>
                        </div>
                      ) : (
                        <div className="oc-feedback">
                          <div className="oc-feedback-lbl">How was your experience? Rate this order:</div>
                          <div className="star-row">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} className={`star-btn ${n <= pendingR ? 'on' : ''}`} 
                                onClick={() => setPendingRating(prev => ({...prev, [o.id]: n}))}>★</button>
                            ))}
                          </div>
                          <textarea className="fb-comment" placeholder="Optional comment..." 
                            value={pendingComment[o.id] || ''}
                            onChange={e => setPendingComment(prev => ({...prev, [o.id]: e.target.value}))} />
                          <button className="btn-fb-submit" onClick={() => submitFeedback(o.id, o.table)}>Submit Feedback</button>
                        </div>
                      )
                    )}
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
