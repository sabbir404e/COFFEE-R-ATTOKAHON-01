'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';



function OrderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme, products, addToCart, removeFromCart, changeCartQty, cart, clearCart, tableNum, setTableNum, tables } = useApp();

  const urlTable = parseInt(searchParams.get('table'));
  const [step, setStep] = useState('table'); // 'table' | 'menu' | 'success'
  const [localTable, setLocalTable] = useState(null);
  const [customTableInput, setCustomTableInput] = useState('');
  const [selectedBtn, setSelectedBtn] = useState(null);
  const [menuCat, setMenuCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customization, setCustomization] = useState({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: false, notes: '' });
  const availableTables = tables.filter(table => table.status === 'available');

  useEffect(() => {
    setMounted(true);
    if (urlTable && availableTables.some(table => table.id === urlTable)) {
      setLocalTable(urlTable);
      setTableNum(urlTable);
      setStep('menu');
    }
  }, [urlTable, setTableNum, availableTables]);

  useEffect(() => {
    if (lastOrderId) {
      setStep('success');
    }
  }, [lastOrderId]);


  const confirmTable = () => {
    const val = parseInt(customTableInput);
    if (!val || !availableTables.some(table => table.id === val)) { alert('Please select an available table number.'); return; }
    setLocalTable(val);
    setTableNum(val);
    setStep('menu');
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, v) => s + v.qty, 0);
  const cartTotal = cartItems.reduce((s, v) => s + v.product.price * v.qty, 0);

  const cats = ['all', ...new Set(products.map(p => p.cat))];
  const filtered = menuCat === 'all' ? products : products.filter(p => p.cat === menuCat);

  const openProductDetails = (product) => {
    if (product.avail === false) return;
    setSelectedProduct(product);
    setCustomization({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: false, notes: '' });
  };

  const addConfiguredProduct = () => {
    if (!selectedProduct) return;
    const surcharge = (customization.size === 'Large' ? 30 : 0) + (customization.extraShot ? 20 : 0);
    addToCart(selectedProduct.id, { ...customization, surcharge });
    setSelectedProduct(null);
  };

  const placeOrder = () => {
    const keys = Object.keys(cart).filter(k => cart[k].qty > 0);
    if (!keys.length) return;
    const items = keys.map(k => ({
      name: cart[k].product.name,
      emoji: cart[k].product.emoji,
      image: cart[k].product.image,
      qty: cart[k].qty,
      price: cart[k].product.price,
      id: cart[k].product.id,
      customization: cart[k].product.customization || null,
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
        .menu-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;transition:all 0.2s;box-shadow:var(--shadow);cursor:pointer;}
        .menu-card:hover{border-color:var(--border-h);transform:translateY(-2px);}
        .menu-card.sold-out{opacity:0.55;}
        .menu-card .emoji{font-size:34px;margin-bottom:10px;}
        .menu-card .product-img{width:100%;height:100px;border-radius:10px;margin-bottom:12px;overflow:hidden;background:var(--bg2);}
        .menu-card .product-img img{width:100%;height:100%;object-fit:cover;display:block;}
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

        .product-modal-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.68);display:flex;align-items:flex-end;justify-content:center;padding:16px;animation:fadeIn .2s;}
        .product-modal{width:100%;max-width:560px;max-height:88vh;overflow-y:auto;background:var(--card);border:1px solid var(--border);border-radius:22px;padding:16px 20px 20px;box-shadow:var(--shadow);animation:sheetUp .28s ease both;}
        .product-modal-handle{width:38px;height:4px;background:var(--border-h);border-radius:3px;margin:0 auto 18px;}
        .product-modal-head{display:flex;align-items:center;gap:14px;margin-bottom:20px;}.product-modal-emoji{font-size:38px;}.product-modal-head h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:25px;margin:0;}.product-modal-price{color:var(--gold);font-size:17px;font-weight:700;margin-top:3px;}
        .option-group{margin:16px 0;}.option-label{display:block;font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--muted);margin-bottom:8px;}.option-list{display:flex;gap:8px;flex-wrap:wrap;}.option-btn{padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:var(--bg2);color:var(--text-2);font-size:13px;font-weight:600;cursor:pointer;}.option-btn.selected{border-color:var(--gold);background:var(--gold);color:#fff;}.product-notes{width:100%;min-height:72px;resize:vertical;background:var(--input-bg);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:10px 12px;outline:none;}.product-notes:focus{border-color:var(--gold);}.product-modal-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:22px;}.product-modal-actions button{margin:0;}.product-cancel{border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text-2);font-size:14px;font-weight:600;cursor:pointer;}
        @media(max-width:600px){.main{padding:16px;}.menu-grid{grid-template-columns:repeat(auto-fill,minmax(155px,1fr));}.cart-drawer{max-width:100%;}}
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
              {availableTables.map(table => (
                <button key={table.id} className={`t-btn${selectedBtn===table.id?' sel':''}`}
                  onClick={() => { setSelectedBtn(table.id); setCustomTableInput(String(table.id)); }}>{table.id}</button>
              ))}
            </div>
            <div className="or-line">or enter manually</div>
            <input className="custom-inp" type="number" value={customTableInput}
              onChange={e => setCustomTableInput(e.target.value)}
              placeholder="Enter an available table number..." min="1" />
            <button className="btn-primary" onClick={confirmTable}>Start Ordering →</button>
          </div>
        </div>
      )}

      {step === 'menu' && (
        <div className="main-app">
          <div className="topbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <button onClick={() => setStep('table')} style={{background:'none',border:'none',color:'var(--muted)',fontSize:'18px',cursor:'pointer',padding:0,lineHeight:1}}>←</button>
              <Link href="/" className="brand" style={{ textDecoration: 'none', fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'20px' }}><em>Coffee-r</em> Attokahon</Link>
            </div>
            <div className="topbar-right" style={{display:'flex',alignItems:'center',gap:'12px'}}>
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
                  <div className={`menu-card${avail?'':' sold-out'}`} key={p.id} onClick={() => openProductDetails(p)}>
                    {p.image ? (
                      <div className="product-img"><img src={p.image} alt={p.name} loading="lazy" /></div>
                    ) : (
                      <div className="emoji">{p.emoji || '☕'}</div>
                    )}
                    {!avail && <div className="sold-out-badge">Sold Out</div>}
                    <div className="name">{p.name}</div>
                    <div className="cat">{p.cat}</div>
                    <div className="price">৳{p.price}</div>
                    <div className="desc">{p.desc}</div>
                    {avail ? (
                      inCart > 0 ? (
                        <div className="in-cart-ctrl">
                          <button className="qty-btn" onClick={e => { e.stopPropagation(); removeFromCart(p.id); }}>−</button>
                          <span className="qty-num">{inCart}</span>
                          <button className="qty-btn" onClick={e => { e.stopPropagation(); openProductDetails(p); }}>+</button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={e => { e.stopPropagation(); openProductDetails(p); }}>Customize &amp; add +</button>
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

      {selectedProduct && (
        <div className="product-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-details-title">
            <div className="product-modal-handle" />
            <div className="product-modal-head">
              {selectedProduct.image ? (
                <div className="product-modal-img"><img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover' }} /></div>
              ) : (
                <div className="product-modal-emoji">{selectedProduct.emoji || '☕'}</div>
              )}
              <div>
                <h2 id="product-details-title">{selectedProduct.name}</h2>
                <div className="product-modal-price">৳{selectedProduct.price + (customization.size === 'Large' ? 30 : 0) + (customization.extraShot ? 20 : 0)}</div>
              </div>
            </div>

            <div className="option-group">
              <span className="option-label">SIZE</span>
              <div className="option-list">
                {['Regular', 'Large'].map(size => <button type="button" key={size} className={`option-btn${customization.size === size ? ' selected' : ''}`} onClick={() => setCustomization(current => ({ ...current, size }))}>{size}{size === 'Large' ? ' +৳30' : ''}</button>)}
              </div>
            </div>
            <div className="option-group">
              <span className="option-label">SUGAR LEVEL</span>
              <div className="option-list">
                {['0%', '30%', '50%', '100%', '150%'].map(sugar => <button type="button" key={sugar} className={`option-btn${customization.sugar === sugar ? ' selected' : ''}`} onClick={() => setCustomization(current => ({ ...current, sugar }))}>{sugar}</button>)}
              </div>
            </div>
            <div className="option-group">
              <span className="option-label">MILK TYPE</span>
              <div className="option-list">
                {['Full Cream', 'Oat', 'Soy', 'Skim', 'None'].map(milk => <button type="button" key={milk} className={`option-btn${customization.milk === milk ? ' selected' : ''}`} onClick={() => setCustomization(current => ({ ...current, milk }))}>{milk}</button>)}
              </div>
            </div>
            <div className="option-group">
              <span className="option-label">EXTRA SHOT (+৳20)</span>
              <div className="option-list">
                {[false, true].map(extraShot => <button type="button" key={String(extraShot)} className={`option-btn${customization.extraShot === extraShot ? ' selected' : ''}`} onClick={() => setCustomization(current => ({ ...current, extraShot }))}>{extraShot ? 'Yes +৳20' : 'No'}</button>)}
              </div>
            </div>
            <div className="option-group">
              <label className="option-label" htmlFor="product-notes">SPECIAL NOTES</label>
              <textarea id="product-notes" className="product-notes" value={customization.notes} onChange={e => setCustomization(current => ({ ...current, notes: e.target.value }))} placeholder="Allergies, special requests..." />
            </div>
            <div className="product-modal-actions">
              <button type="button" className="product-cancel" onClick={() => setSelectedProduct(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={addConfiguredProduct}>Add to Cart</button>
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
                  <div className="cart-row" key={product.cartKey || product.id}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <span className="c-emoji" style={{fontSize:'20px'}}>{product.emoji}</span>
                    )}
                    <span className="c-name">{product.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <button className="qty-btn" style={{width:'24px',height:'24px',fontSize:'14px'}} onClick={() => removeFromCart(product.cartKey || product.id)}>−</button>
                      <span className="qty-num">{qty}</span>
                      <button className="qty-btn" style={{width:'24px',height:'24px',fontSize:'14px'}} onClick={() => changeCartQty(product.cartKey || product.id, 1)}>+</button>
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
