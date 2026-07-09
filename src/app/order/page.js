'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const ORDER_FLOW = ['paid','preparing','ready','served'];
const TS_META = {
  paid:      { icon:'💳', label:'Received',  msg:'Order received — kitchen starts soon.' },
  preparing: { icon:'👨‍🍳', label:'Preparing', msg:'Being prepared right now. Hang tight!' },
  ready:     { icon:'✅', label:'Ready',      msg:'Ready! A staff member will bring it to you.' },
  served:    { icon:'🎉', label:'Served',     msg:'Served. Enjoy your order!' },
};

function OrderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme, products, addToCart, removeFromCart, changeCartQty, cart, clearCart, tableNum, setTableNum } = useApp();

  const urlTable = parseInt(searchParams.get('table'));
  const [step, setStep] = useState('table'); // 'table' | 'menu' | 'success'
  const [localTable, setLocalTable] = useState(null);
  const [customTableInput, setCustomTableInput] = useState('');
  const [selectedBtn, setSelectedBtn] = useState(null);
  const [menuCat, setMenuCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackOrders, setTrackOrders] = useState([]);
  const [lastOrderId, setLastOrderId] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (urlTable && urlTable >= 1 && urlTable <= 20) {
      setLocalTable(urlTable);
      setTableNum(urlTable);
      setStep('menu');
    }
  }, [urlTable, setTableNum]);

  useEffect(() => {
    if (lastOrderId) {
      setStep('success');
    }
  }, [lastOrderId]);

  const refreshTrack = useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
      const my = localTable ? all.filter(o => o.table === localTable) : all;
      setTrackOrders(my.slice(0, 4));
    } catch {}
  }, [localTable]);

  useEffect(() => {
    if (!trackOpen) return;
    refreshTrack();
    const iv = setInterval(refreshTrack, 3000);
    return () => clearInterval(iv);
  }, [trackOpen, refreshTrack]);

  const confirmTable = () => {
    const val = parseInt(customTableInput);
    if (!val || val < 1) { alert('Please select a table number.'); return; }
    if (val > 20) { alert('Table number cannot be more than 20.'); return; }
    setLocalTable(val);
    setTableNum(val);
    setStep('menu');
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, v) => s + v.qty, 0);
  const cartTotal = cartItems.reduce((s, v) => s + v.product.price * v.qty, 0);

  const cats = ['all', ...new Set(products.map(p => p.cat))];
  const filtered = menuCat === 'all' ? products : products.filter(p => p.cat === menuCat);

  const placeOrder = () => {
    const keys = Object.keys(cart).filter(k => cart[k].qty > 0);
    if (!keys.length) return;
    const items = keys.map(k => ({
      name: cart[k].product.name,
      emoji: cart[k].product.emoji,
      qty: cart[k].qty,
      price: cart[k].product.price,
      id: cart[k].product.id,
    }));
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;
    localStorage.setItem('ca_pending_cart', JSON.stringify({ tableNum: localTable, items, subtotal, serviceCharge, total }));
    setCartOpen(false);
    router.push('/checkout');
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        .table-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;}
        .table-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:36px 30px;width:100%;max-width:380px;text-align:center;position:relative;z-index:1;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .table-card .logo{font-family:var(--font-playfair),'Playfair Display',serif;font-size:40px;margin-bottom:4px;}
        .table-card .logo em{color:var(--gold);font-style:normal;}
        .table-card .tagline{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:28px;}
        .table-card h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;margin-bottom:6px;}
        .table-card p{font-size:13px;color:var(--muted);margin-bottom:20px;}
        .table-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;}
        .t-btn{aspect-ratio:1;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--muted);font-size:14px;font-weight:500;cursor:pointer;transition:all 0.18s;}
        .t-btn:hover,.t-btn.sel{background:var(--gold);color:#fff;border-color:var(--gold);}
        .or-line{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);margin-bottom:14px;}
        .or-line::before,.or-line::after{content:'';flex:1;border-top:1px solid var(--border);}
        .custom-inp{width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;color:var(--text);outline:none;margin-bottom:14px;transition:border-color 0.2s;text-align:center;}
        .custom-inp:focus{border-color:var(--gold);}
        .custom-inp::placeholder{color:var(--muted);}
        .btn-primary{width:100%;padding:12px;background:var(--gold);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-primary:hover{background:var(--gold-h);}
        .ts-theme{position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:8px;}

        .main-app{min-height:100vh;}
        .main{max-width:1100px;margin:0 auto;padding:24px 20px;}
        .page-hdr{margin-bottom:18px;}
        .page-hdr h1{font-family:var(--font-playfair),'Playfair Display',serif;font-size:28px;}
        .page-hdr p{font-size:13px;color:var(--muted);margin-top:3px;}
        .table-chip{display:inline-flex;align-items:center;gap:6px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:20px;padding:4px 12px;font-size:12px;color:var(--gold);margin-bottom:18px;}
        .cat-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
        .cat-pill{padding:6px 16px;border-radius:20px;border:1px solid var(--border);background:none;font-size:13px;cursor:pointer;color:var(--muted);transition:all 0.18s;}
        .cat-pill.active{background:var(--gold);color:#fff;border-color:var(--gold);font-weight:600;}
        .cat-pill:hover:not(.active){border-color:var(--border-h);color:var(--text);}
        .menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:32px;}
        .menu-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;transition:all 0.2s;box-shadow:var(--shadow);}
        .menu-card:hover{border-color:var(--border-h);transform:translateY(-2px);}
        .menu-card.sold-out{opacity:0.55;}
        .menu-card .emoji{font-size:34px;margin-bottom:10px;}
        .menu-card .name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:3px;}
        .menu-card .cat{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;}
        .menu-card .price{font-size:14px;color:var(--gold);font-weight:600;margin-bottom:8px;}
        .menu-card .desc{font-size:12px;color:var(--muted);line-height:1.55;flex:1;margin-bottom:12px;}
        .sold-out-badge{display:inline-block;background:rgba(192,64,64,0.15);border:1px solid rgba(192,64,64,0.30);color:#E08080;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 9px;border-radius:6px;margin-bottom:4px;}
        .add-btn{width:100%;padding:8px;background:var(--gold);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.18s;}
        .add-btn:hover{background:var(--gold-h);}
        .add-btn.sold-out-btn{background:var(--bg2)!important;color:var(--muted)!important;cursor:not-allowed!important;border:1px solid var(--border)!important;}
        .in-cart-ctrl{display:flex;align-items:center;justify-content:space-between;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:9px;padding:4px 8px;}
        .qty-btn{width:26px;height:26px;border-radius:6px;border:1px solid var(--border-h);background:var(--card);color:var(--gold);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .qty-btn:hover{background:var(--gold);color:#fff;}
        .qty-num{font-size:14px;font-weight:600;color:var(--text);}

        .cart-btn{display:flex;align-items:center;gap:8px;background:var(--gold);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .cart-btn:hover{background:var(--gold-h);}
        .cart-count{background:var(--card);color:var(--gold);border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:1px solid var(--border-h);}
        .track-nav-btn{display:flex;align-items:center;gap:6px;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:20px;padding:7px 14px;font-size:12px;font-weight:600;color:var(--gold);cursor:pointer;transition:all 0.2s;white-space:nowrap;}
        .track-nav-btn:hover{background:rgba(200,148,56,0.22);border-color:var(--gold);}
        .track-nav-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;animation:ftpulse 1.8s ease-in-out infinite;}

        .cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.70);z-index:200;animation:fadeIn 0.2s;}
        .cart-drawer{position:fixed;right:0;top:0;bottom:0;width:100%;max-width:420px;background:var(--card);border-left:1px solid var(--border);z-index:201;display:flex;flex-direction:column;animation:slideIn 0.3s ease;box-shadow:var(--shadow);}
        .cart-head{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .cart-head h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:20px;}
        .close-btn{background:none;border:1px solid var(--border);border-radius:8px;padding:5px 10px;color:var(--muted);font-size:13px;cursor:pointer;transition:all 0.18s;}
        .close-btn:hover{border-color:var(--border-h);color:var(--text);}
        .cart-body{flex:1;overflow-y:auto;padding:16px 20px;}
        .cart-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;}
        .cart-row:last-of-type{border-bottom:none;}
        .cart-row .c-emoji{font-size:20px;}
        .cart-row .c-name{flex:1;color:var(--text);}
        .cart-row .c-price{min-width:56px;text-align:right;color:var(--gold);font-weight:600;}
        .cart-foot{padding:16px 20px;border-top:1px solid var(--border);}
        .cart-total{display:flex;justify-content:space-between;font-size:16px;font-weight:600;margin-bottom:14px;}
        .cart-total span:last-child{color:var(--gold);}
        .place-btn{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;font-family:var(--font-playfair),'Playfair Display',serif;cursor:pointer;transition:background 0.2s;}
        .place-btn:hover{background:var(--gold-h);}
        .place-btn:disabled{background:var(--border);cursor:not-allowed;}
        .empty-cart{text-align:center;padding:40px 20px;color:var(--muted);}
        .empty-cart .e-icon{font-size:44px;margin-bottom:12px;}

        .track-sheet{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
        .track-inner{background:var(--card);border-radius:20px 20px 0 0;border:1px solid var(--border);padding:24px 20px 36px;width:100%;max-width:520px;animation:sheetUp 0.35s cubic-bezier(0.16,1,0.3,1) both;max-height:85vh;overflow-y:auto;}
        .track-handle{width:36px;height:4px;background:var(--border-h);border-radius:2px;margin:0 auto 20px;}
        .track-inner h3{font-family:var(--font-playfair),'Playfair Display',serif;font-size:20px;margin-bottom:4px;}
        .ts-refresh-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-bottom:14px;}
        .ts-rdot{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:ftpulse 1.8s ease-in-out infinite;}
        .ts-order-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:12px;}
        .ts-order-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .ts-order-id{font-weight:700;font-size:14px;color:var(--gold);}
        .ts-order-time{font-size:11px;color:var(--muted);}
        .ts-stepper{display:flex;align-items:flex-start;gap:0;margin-bottom:10px;position:relative;}
        .ts-stepper::before{content:'';position:absolute;top:14px;left:14px;right:14px;height:2px;background:var(--border);z-index:0;}
        .ts-progress{position:absolute;top:14px;left:14px;height:2px;background:var(--gold);z-index:1;transition:width 0.5s cubic-bezier(0.16,1,0.3,1);}
        .ts-step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;position:relative;z-index:2;}
        .ts-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.3s;flex-shrink:0;}
        .ts-step.done .ts-dot{background:var(--gold);border-color:var(--gold);color:#fff;}
        .ts-step.active .ts-dot{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 5px rgba(200,148,56,0.2);animation:ftpulse 1.6s ease-in-out infinite;}
        .ts-step-lbl{font-size:9px;color:var(--muted);letter-spacing:0.5px;text-align:center;}
        .ts-step.done .ts-step-lbl,.ts-step.active .ts-step-lbl{color:var(--text-2);}
        .ts-msg{font-size:12px;color:var(--text-2);padding:8px 10px;background:rgba(200,148,56,0.07);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;line-height:1.6;}
        .ts-msg.ready{background:rgba(42,114,72,0.12);border-color:rgba(42,114,72,0.25);color:#60C890;}
        .ts-items{font-size:12px;color:var(--muted);}
        .ts-empty{text-align:center;padding:32px 20px;color:var(--muted);font-size:14px;line-height:1.8;}
        .ts-close{width:100%;padding:12px;background:none;border:1px solid var(--border);border-radius:12px;color:var(--muted);font-size:14px;cursor:pointer;margin-top:8px;transition:all 0.2s;}
        .ts-close:hover{border-color:var(--border-h);color:var(--text);}
        .success-screen{min-height:calc(100vh - 58px);display:flex;align-items:center;justify-content:center;padding:24px;}
        .success-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:36px 28px;max-width:360px;text-align:center;animation:fadeIn 0.4s;box-shadow:var(--shadow);}
        .s-icon{font-size:56px;margin-bottom:14px;}
        .success-card h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:26px;margin-bottom:8px;}
        .success-card p{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:22px;}
        .order-badge{display:inline-block;background:var(--pill-bg);border:1px solid var(--border-h);border-radius:10px;padding:10px 20px;font-size:14px;color:var(--gold);margin-bottom:22px;}
        @media(max-width:600px){.main{padding:16px;}.menu-grid{grid-template-columns:repeat(auto-fill,minmax(155px,1fr));}.cart-drawer{max-width:100%;}}
        @media(max-width:480px){.theme-label{display:none;}.track-nav-btn span{display:none;}}
      `}</style>

      {step === 'table' && (
        <div className="table-screen">
          <div className="glow" />
          <div className="ts-theme">
            <span className="theme-label">🌙</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
            <span className="theme-label">☀️</span>
          </div>
          <div className="table-card">
            <div className="logo"><em>Coffee-r</em> Attokahon</div>
            <div className="tagline">Artisan Coffee &amp; More</div>
            <h2>Select Your Table</h2>
            <p>Choose your table number to start ordering</p>
            <div className="table-grid">
              {Array.from({length:20},(_,i)=>i+1).map(n => (
                <button key={n} className={`t-btn${selectedBtn===n?' sel':''}`}
                  onClick={() => { setSelectedBtn(n); setCustomTableInput(String(n)); }}>{n}</button>
              ))}
            </div>
            <div className="or-line">or enter manually</div>
            <input className="custom-inp" type="number" value={customTableInput}
              onChange={e => setCustomTableInput(e.target.value)}
              placeholder="Table number (1–20)..." min="1" max="20" />
            <button className="btn-primary" onClick={confirmTable}>Start Ordering →</button>
          </div>
        </div>
      )}

      {step === 'menu' && (
        <div className="main-app">
          <div className="topbar">
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <button onClick={() => setStep('table')} style={{background:'none',border:'none',color:'var(--muted)',fontSize:'18px',cursor:'pointer',padding:0,lineHeight:1}}>←</button>
              <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
            </div>
            <div className="topbar-right">
              <button className="track-nav-btn" onClick={() => setTrackOpen(true)}>
                <div className="track-nav-dot" /><span>Track Order</span>
              </button>
              <span className="theme-label">🌙</span>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
              <span className="theme-label">☀️</span>
              <button className="cart-btn" onClick={() => setCartOpen(true)}>
                🛒 Cart <span className="cart-count">{cartCount}</span>
              </button>
            </div>
          </div>

          <div className="main">
            <div className="page-hdr">
              <h1>Our Menu</h1>
              <p>Fresh, made to order — just for you.</p>
            </div>
            <div className="table-chip">📍 Table {localTable}</div>
            <div className="cat-bar">
              {cats.map(c => (
                <button key={c} className={`cat-pill${c===menuCat?' active':''}`}
                  onClick={() => setMenuCat(c)}>{c==='all'?'All':c}</button>
              ))}
            </div>
            <div className="menu-grid">
              {filtered.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--muted)'}}>No items in this category.</div>}
              {filtered.map(p => {
                const avail = p.avail !== false;
                const inCart = cart[p.id]?.qty || 0;
                return (
                  <div className={`menu-card${avail?'':' sold-out'}`} key={p.id}>
                    <div className="emoji">{p.emoji || '☕'}</div>
                    {!avail && <div className="sold-out-badge">Sold Out</div>}
                    <div className="name">{p.name}</div>
                    <div className="cat">{p.cat}</div>
                    <div className="price">৳{p.price}</div>
                    <div className="desc">{p.desc}</div>
                    {avail ? (
                      inCart > 0 ? (
                        <div className="in-cart-ctrl">
                          <button className="qty-btn" onClick={() => removeFromCart(p.id)}>−</button>
                          <span className="qty-num">{inCart}</span>
                          <button className="qty-btn" onClick={() => addToCart(p.id)}>+</button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={() => addToCart(p.id)}>Add to cart +</button>
                      )
                    ) : (
                      <button className="add-btn sold-out-btn" disabled>Sold Out</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="main-app">
          <div className="topbar">
            <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
            <div className="topbar-right">
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle" />
            </div>
          </div>
          <div className="success-screen">
            <div className="success-card">
              <div className="s-icon">✅</div>
              <h2>Order Placed!</h2>
              <p>Your payment was confirmed and the kitchen has received your order.</p>
              {lastOrderId && <div className="order-badge">Order #{lastOrderId}</div>}
              <button className="btn-primary" onClick={() => { setStep('menu'); setLastOrderId(null); }}>Order More</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="cart-head">
              <h2>Your Cart</h2>
              <button className="close-btn" onClick={() => setCartOpen(false)}>✕ Close</button>
            </div>
            <div className="cart-body">
              {cartItems.length === 0 ? (
                <div className="empty-cart"><div className="e-icon">🛒</div><p>Your cart is empty.</p></div>
              ) : (
                cartItems.map(({ product, qty }) => (
                  <div className="cart-row" key={product.id}>
                    <span className="c-emoji">{product.emoji}</span>
                    <span className="c-name">{product.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <button className="qty-btn" style={{width:'24px',height:'24px',fontSize:'14px'}} onClick={() => removeFromCart(product.id)}>−</button>
                      <span className="qty-num">{qty}</span>
                      <button className="qty-btn" style={{width:'24px',height:'24px',fontSize:'14px'}} onClick={() => addToCart(product.id)}>+</button>
                    </div>
                    <span className="c-price">৳{product.price * qty}</span>
                  </div>
                ))
              )}
            </div>
            <div className="cart-foot">
              <div className="cart-total"><span>Total</span><span>৳{cartTotal}</span></div>
              <button className="place-btn" disabled={cartItems.length===0} onClick={placeOrder}>Proceed to Checkout →</button>
            </div>
          </div>
        </>
      )}

      {/* Track Sheet */}
      {trackOpen && (
        <div className="track-sheet" onClick={e => { if (e.target === e.currentTarget) setTrackOpen(false); }}>
          <div className="track-inner">
            <div className="track-handle" />
            <h3>Your Orders</h3>
            <p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'18px'}}>Tracking Table {localTable} live.</p>
            <div className="ts-refresh-row"><div className="ts-rdot" /><span>Auto-updating every 3 seconds</span></div>
            {trackOrders.length === 0 ? (
              <div className="ts-empty">No orders found for this table.<br /><small>Place an order first.</small></div>
            ) : (
              trackOrders.map(o => {
                const idx = ORDER_FLOW.indexOf(o.status);
                const meta = TS_META[o.status] || TS_META.paid;
                const pct = idx <= 0 ? 0 : Math.round((idx / (ORDER_FLOW.length - 1)) * 100);
                const fmtT = t => { try{return new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}catch{return '';} };
                return (
                  <div className="ts-order-card" key={o.id}>
                    <div className="ts-order-head">
                      <span className="ts-order-id">Order #{o.id}</span>
                      <span className="ts-order-time">{fmtT(o.time)}</span>
                    </div>
                    <div className="ts-stepper">
                      <div className="ts-progress" style={{width:`calc(${pct}% - 28px)`}} />
                      {ORDER_FLOW.map((s, i) => {
                        const sm = TS_META[s];
                        const cls = i < idx ? 'done' : i === idx ? 'active' : 'pending';
                        return (
                          <div className={`ts-step ${cls}`} key={s}>
                            <div className="ts-dot">{i < idx ? '✓' : sm.icon}</div>
                            <div className="ts-step-lbl">{sm.label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`ts-msg${o.status==='ready'?' ready':''}`}>{meta.msg}</div>
                    <div className="ts-items">{o.items.map(i=>`${i.qty}× ${i.name}`).join(' · ')}</div>
                  </div>
                );
              })
            )}
            <button className="ts-close" onClick={() => setTrackOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="main-app">
        <div className="topbar">
          <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        </div>
        <div className="main"><p>Loading menu...</p></div>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
