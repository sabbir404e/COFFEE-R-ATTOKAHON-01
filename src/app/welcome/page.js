'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const FLOW  = ['paid','preparing','ready','served'];
const SMETA = {
  paid:      { icon:'💳', label:'Received',  msg:'Order received — kitchen will start shortly.' },
  preparing: { icon:'👨‍🍳', label:'Preparing', msg:'Being prepared right now. Hang tight!' },
  ready:     { icon:'✅', label:'Ready',      msg:'Ready! A staff member will bring it to you.' },
  served:    { icon:'🎉', label:'Served',     msg:'Enjoy! Thank you for visiting.' },
};

function buildOrderCard(o) {
  const idx  = FLOW.indexOf(o.status);
  const fmtTime = t => { try { return new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
  let stepperHtml = [];
  FLOW.forEach((s, i) => {
    const sm = SMETA[s];
    const cls = i < idx ? 'done' : i === idx ? 'active' : 'pending';
    const dotContent = i < idx ? '✓' : sm.icon;
    stepperHtml.push({ cls, dotContent, label: sm.label, line: i < FLOW.length - 1, filled: i < idx });
  });
  return { o, idx, fmtTime, stepperHtml };
}

function WelcomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme, setTableNum, orders } = useApp();

  const tableNum = parseInt(searchParams.get('table')) || null;
  const [greeting, setGreeting] = useState('Welcome.');
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerOrders, setTrackerOrders] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning.');
    else if (h < 17) setGreeting('Good afternoon.');
    else setGreeting('Good evening.');
    if (tableNum) setTableNum(tableNum);
  }, [tableNum, setTableNum]);

  const refreshTracker = useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      const myOrders = tableNum ? all.filter(o => o.table === tableNum) : all.slice(0,5);
      setTrackerOrders(myOrders.slice(0,4));
    } catch {}
  }, [tableNum]);

  useEffect(() => {
    if (!trackerOpen) return;
    refreshTracker();
    const iv = setInterval(refreshTracker, 3000);
    return () => clearInterval(iv);
  }, [trackerOpen, refreshTracker]);

  const goToMenu = () => {
    router.push('/order' + (tableNum ? '?table=' + tableNum : ''));
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        body{overflow:hidden;}
        .atm-glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 55% at 50% -10%,rgba(200,148,56,0.14) 0%,transparent 60%),radial-gradient(ellipse 45% 35% at 10% 90%,rgba(200,148,56,0.07) 0%,transparent 60%),radial-gradient(ellipse 45% 35% at 90% 80%,rgba(200,148,56,0.05) 0%,transparent 60%);z-index:0;}
        [data-theme="light"] .atm-glow{background:radial-gradient(ellipse 80% 55% at 50% -10%,rgba(160,108,40,0.10) 0%,transparent 60%),radial-gradient(ellipse 45% 35% at 10% 90%,rgba(160,108,40,0.06) 0%,transparent 60%);}
        .atm-ring{position:fixed;border-radius:50%;border:1px solid rgba(200,148,56,0.07);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:0;}
        .atm-ring.r1{width:500px;height:500px;}
        .atm-ring.r2{width:800px;height:800px;border-color:rgba(200,148,56,0.04);}
        .atm-ring.r3{width:1100px;height:1100px;border-color:rgba(200,148,56,0.025);}
        .steam{position:fixed;pointer-events:none;z-index:0;bottom:-20px;left:50%;transform:translateX(-50%);display:flex;gap:40px;}
        .steam-p{width:4px;height:4px;border-radius:50%;background:rgba(200,148,56,0.25);animation:steamRise 6s ease-in-out infinite;}
        .steam-p:nth-child(2){animation-delay:2s;}
        .steam-p:nth-child(3){animation-delay:4s;}
        .ctrl-bar{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:16px 20px;z-index:10;}
        .ctrl-home{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);text-decoration:none;transition:color 0.2s;background:none;border:none;cursor:pointer;}
        .ctrl-home:hover{color:var(--gold);}
        .ctrl-theme{display:flex;align-items:center;gap:8px;}
        .welcome-wrap{position:relative;z-index:1;width:90%;max-width:440px;text-align:center;padding:0 16px;display:flex;flex-direction:column;align-items:center;}
        .wc-logo-block{margin-bottom:36px;animation:wIn 0.9s cubic-bezier(0.16,1,0.3,1) both;}
        .wc-logo{font-family:var(--font-playfair),'Playfair Display',serif;font-size:46px;line-height:1.05;letter-spacing:-0.5px;}
        .wc-logo em{color:var(--gold);font-style:normal;}
        .wc-tagline{font-size:10px;letter-spacing:4.5px;text-transform:uppercase;color:var(--muted);margin-top:8px;}
        .wc-ornament{display:flex;align-items:center;gap:12px;margin:0 auto 36px;width:fit-content;animation:wIn 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both;}
        .wc-ornament-line{width:40px;height:1px;background:linear-gradient(to right,transparent,var(--gold));}
        .wc-ornament-line.rev{background:linear-gradient(to left,transparent,var(--gold));}
        .wc-ornament-icon{color:var(--gold);font-size:14px;opacity:0.7;}
        .wc-greeting{font-family:var(--font-playfair),'Playfair Display',serif;font-size:32px;font-style:italic;color:var(--text);margin-bottom:12px;animation:wIn 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both;}
        .wc-sub{font-size:14px;color:var(--muted);line-height:1.75;margin-bottom:30px;font-weight:300;animation:wIn 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) both;}
        .table-chip{display:inline-flex;align-items:center;gap:8px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:28px;padding:10px 22px;font-size:14px;font-weight:500;color:var(--gold);margin-bottom:32px;animation:wIn 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both;}
        .table-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);opacity:0.8;animation:tdot 2s ease-in-out infinite;}
        .btn-cta{display:block;width:100%;padding:16px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;font-family:var(--font-playfair),'Playfair Display',serif;letter-spacing:0.4px;cursor:pointer;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;margin-bottom:12px;animation:wIn 0.9s 0.3s cubic-bezier(0.16,1,0.3,1) both;box-shadow:0 4px 20px rgba(200,148,56,0.25);}
        .btn-cta:hover{background:var(--gold-h);transform:translateY(-2px);box-shadow:0 6px 24px rgba(200,148,56,0.35);}
        .btn-ghost{display:block;width:100%;padding:14px;background:none;color:var(--text-2);border:1px solid var(--border-h);border-radius:14px;font-size:14px;font-weight:400;cursor:pointer;transition:all 0.2s;margin-bottom:32px;animation:wIn 0.9s 0.35s cubic-bezier(0.16,1,0.3,1) both;}
        .btn-ghost:hover{border-color:var(--gold);color:var(--gold);}
        .wc-footer{font-size:11px;color:var(--muted);letter-spacing:0.3px;animation:wIn 0.9s 0.4s cubic-bezier(0.16,1,0.3,1) both;}
        .wc-footer span{color:var(--gold);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal-box{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:24px;width:100%;max-width:400px;animation:wIn 0.3s cubic-bezier(0.16,1,0.3,1) both;box-shadow:var(--shadow);max-height:88vh;overflow-y:auto;}
        .modal-box h3{font-family:var(--font-playfair),'Playfair Display',serif;font-size:20px;margin-bottom:4px;}
        .modal-sub{font-size:12px;color:var(--muted);margin-bottom:18px;}
        .oti-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:12px;transition:border-color 0.2s;}
        .oti-card:hover{border-color:var(--border-h);}
        .oti-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
        .oti-id{font-weight:700;font-size:14px;color:var(--gold);}
        .oti-time{font-size:11px;color:var(--muted);}
        .oti-stepper{display:flex;align-items:center;gap:0;margin-bottom:10px;}
        .oti-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;position:relative;}
        .oti-step-line{flex:1;height:2px;background:var(--border);margin-top:-16px;position:relative;z-index:0;}
        .oti-step-line.filled{background:var(--gold);}
        .oti-dot{width:24px;height:24px;border-radius:50%;border:2px solid var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:10px;z-index:1;transition:all 0.3s;flex-shrink:0;}
        .oti-step.done .oti-dot{background:var(--gold);border-color:var(--gold);color:#fff;}
        .oti-step.active .oti-dot{background:var(--gold);border-color:var(--gold);color:#fff;animation:otipulse 1.8s ease-in-out infinite;}
        .oti-slabel{font-size:9px;color:var(--muted);letter-spacing:0.5px;text-align:center;margin-top:2px;}
        .oti-step.done .oti-slabel,.oti-step.active .oti-slabel{color:var(--text-2);}
        .oti-msg{font-size:12px;color:var(--text-2);padding:8px 10px;background:rgba(200,148,56,0.07);border-radius:8px;border:1px solid var(--border);margin-bottom:8px;}
        .oti-msg.ready{background:rgba(42,114,72,0.12);border-color:rgba(42,114,72,0.25);color:#60C890;}
        .oti-items{font-size:12px;color:var(--muted);}
        .modal-close{width:100%;padding:11px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--muted);font-size:14px;cursor:pointer;margin-top:4px;transition:all 0.2s;}
        .modal-close:hover{border-color:var(--border-h);color:var(--text);}
        .modal-empty{text-align:center;padding:32px 20px;color:var(--muted);font-size:14px;line-height:1.8;}
        .refresh-row{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--muted);margin-bottom:14px;}
        .refresh-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:otipulse 1.8s ease-in-out infinite;}
        @media(max-width:420px){.wc-logo{font-size:36px;}.wc-greeting{font-size:26px;}}
      `}</style>

      <div className="atm-glow" />
      <div className="atm-ring r1" />
      <div className="atm-ring r2" />
      <div className="atm-ring r3" />
      <div className="steam">
        <div className="steam-p" />
        <div className="steam-p" />
        <div className="steam-p" />
      </div>

      <div className="ctrl-bar">
        <button className="ctrl-home" onClick={() => router.push('/')}>☕ Our Story</button>
        <div className="ctrl-theme">
          <span className="theme-label">🌙</span>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
          <span className="theme-label">☀️</span>
        </div>
      </div>

      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="welcome-wrap">
          <div className="wc-logo-block">
            <img src="/logo.png" alt="Coffee-r Attokahon Logo" style={{ width: '130px', height: 'auto', marginBottom: '16px', display: 'inline-block' }} />
            <br />
            <Link href="/" className="wc-logo" style={{ textDecoration: 'none' }}><em>Coffee-r</em><br />Attokahon</Link>
            <div className="wc-tagline">Artisan Coffee &amp; Cuisine</div>
          </div>

          <div className="wc-ornament">
            <div className="wc-ornament-line" />
            <div className="wc-ornament-icon">✦</div>
            <div className="wc-ornament-line rev" />
          </div>

          <div className="wc-greeting">{greeting}</div>
          <p className="wc-sub">Your table is ready. Take a moment, explore our menu, and let us take care of everything else.</p>

          <div className="table-chip">
            <div className="table-dot" />
            <span>{tableNum ? `Table ${tableNum}` : 'Walk-in Guest'}</span>
          </div>

          <button className="btn-cta" onClick={goToMenu}>View Our Menu →</button>
          <button className="btn-ghost" onClick={() => setTrackerOpen(true)}>📍 Track My Order</button>

          <div className="wc-footer">Open daily &nbsp;·&nbsp; <span>8:00 AM – 11:00 PM</span></div>
        </div>
      </div>

      {/* Track Order Modal */}
      {trackerOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTrackerOpen(false); }}>
          <div className="modal-box">
            <h3>Your Orders</h3>
            <p className="modal-sub">Tracking your table live.</p>
            <div className="refresh-row"><div className="refresh-dot" /><span>Auto-updating every 3 seconds</span></div>

            {trackerOrders.length === 0 ? (
              <div className="modal-empty">No orders found for this table.<br /><small>Place an order from the menu first.</small></div>
            ) : (
              trackerOrders.map(o => {
                const idx = FLOW.indexOf(o.status);
                const meta = SMETA[o.status] || SMETA.paid;
                const fmtTime = t => { try { return new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
                return (
                  <div className="oti-card" key={o.id}>
                    <div className="oti-head">
                      <span className="oti-id">Order #{o.id}</span>
                      <span className="oti-time">{fmtTime(o.time)}</span>
                    </div>
                    <div className="oti-stepper">
                      {FLOW.map((s, i) => {
                        const sm = SMETA[s];
                        const cls = i < idx ? 'done' : i === idx ? 'active' : 'pending';
                        return (
                          <div style={{ display: 'contents' }} key={s}>
                            <div className={`oti-step ${cls}`}>
                              <div className="oti-dot">{i < idx ? '✓' : sm.icon}</div>
                              <div className="oti-slabel">{sm.label}</div>
                            </div>
                            {i < FLOW.length - 1 && <div className={`oti-step-line${i < idx ? ' filled' : ''}`} />}
                          </div>
                        );
                      })}
                    </div>
                    <div className={`oti-msg${o.status === 'ready' ? ' ready' : ''}`}>{meta.msg}</div>
                    <div className="oti-items">{o.items.map(i => `${i.qty}× ${i.name}`).join(' · ')}</div>
                  </div>
                );
              })
            )}

            <button className="modal-close" onClick={() => setTrackerOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1410', color: '#EDE0C8' }}>
        <p>Loading Coffee-r Attokahon...</p>
      </div>
    }>
      <WelcomePageContent />
    </Suspense>
  );
}
