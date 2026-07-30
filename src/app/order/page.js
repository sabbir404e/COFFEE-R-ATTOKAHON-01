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
  const [customization, setCustomization] = useState({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: 'No', notes: '' });
  
  // DRINK_CATS from the user's logic
  const DRINK_CATS = ['Coffee', 'Specialty', 'Tea'];

  const availableTables = tables.filter(table => table.status === 'available');
  const maxTable = availableTables.length > 0 ? Math.max(...availableTables.map(t => t.id)) : 20;

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      if (urlTable && availableTables.some(table => table.id === urlTable)) {
        setLocalTable(urlTable);
        setTableNum(urlTable);
        setStep('menu');
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [urlTable, setTableNum, availableTables]);

  useEffect(() => {
    let handle;
    if (lastOrderId) {
      handle = requestAnimationFrame(() => {
        setStep('success');
      });
    }
    return () => {
      if (handle) cancelAnimationFrame(handle);
    };
  }, [lastOrderId]);

  const confirmTable = () => {
    const val = parseInt(customTableInput);
    if (!val || val < 1) { alert('Please select a table number.'); return; }
    if (!availableTables.some(table => table.id === val)) { alert(`Table ${val} is not available.`); return; }
    setLocalTable(val);
    setTableNum(val);
    router.push(`/?table=${val}`);
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, v) => s + v.qty, 0);
  const cartTotal = cartItems.reduce((s, v) => s + v.product.price * v.qty, 0);

  const cats = ['all', ...new Set(products.map(p => p.cat))];
  const filtered = menuCat === 'all' ? products : products.filter(p => p.cat === menuCat);

  const openProductDetails = (product) => {
    if (product.avail === false) return;
    setSelectedProduct(product);
    setCustomization({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: 'No', notes: '' });
  };

  const addConfiguredProduct = () => {
    if (!selectedProduct) return;
    const isDrink = DRINK_CATS.includes(selectedProduct.cat);
    const finalCustomization = isDrink ? { ...customization } : { ...customization, sugar: null, milk: null, extraShot: 'No' };
    
    const surcharge = (finalCustomization.size === 'Large' ? 30 : 0) + (finalCustomization.extraShot === 'Yes' ? 20 : 0);
    addToCart(selectedProduct.id, { ...finalCustomization, surcharge });
    setSelectedProduct(null);
  };

  const placeOrder = () => {
    const keys = Object.keys(cart).filter(k => cart[k].qty > 0);
    if (!keys.length) return;
    const items = keys.map(k => {
      const p = cart[k].product;
      const custom = p.customization;
      let summary = '';
      if (custom) {
        const parts = [];
        if (custom.size && custom.size !== 'Regular') parts.push(custom.size);
        if (custom.sugar && custom.sugar !== '100%') parts.push(custom.sugar + ' sugar');
        if (custom.milk && custom.milk !== 'Full Cream') parts.push(custom.milk + ' milk');
        if (custom.extraShot === 'Yes') parts.push('+Extra Shot');
        if (custom.notes) parts.push(`"${custom.notes}"`);
        summary = parts.join(' · ');
      }
      return {
        name: p.name + (summary ? ` (${summary})` : ''),
        emoji: p.emoji,
        image: p.image || null,
        qty: cart[k].qty,
        price: p.price,
        id: p.id,
        customization: custom || null,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;
    localStorage.setItem('ca_pending_cart', JSON.stringify({ tableNum: localTable, items, subtotal, serviceCharge, total }));
    setCartOpen(false);
    router.push('/checkout');
  };

  const calcModalPrice = () => {
    if (!selectedProduct) return 0;
    let p = selectedProduct.price;
    if (customization.size === 'Large') p += 30;
    if (customization.extraShot === 'Yes') p += 20;
    return p;
  };

  const getCustomSummary = (custom) => {
    if (!custom) return '';
    const parts = [];
    if (custom.size && custom.size !== 'Regular') parts.push(custom.size);
    if (custom.sugar && custom.sugar !== '100%') parts.push(custom.sugar + ' sugar');
    if (custom.milk && custom.milk !== 'Full Cream') parts.push(custom.milk + ' milk');
    if (custom.extraShot === 'Yes') parts.push('+Extra Shot');
    if (custom.notes) parts.push(`"${custom.notes}"`);
    return parts.join(' · ');
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        :root {
          --transition-theme: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        [data-theme="dark"] {
          --bg:         #1A1410;
          --bg2:        #211A12;
          --card:       #2A2115;
          --border:     rgba(200,148,56,0.20);
          --border-h:   rgba(200,148,56,0.45);
          --gold:       #C89438;
          --gold-h:     #E0AE58;
          --text:       #EDE0C8;
          --text-2:     #BBA880;
          --muted:      #8A7860;
          --input-bg:   #1A1410;
          --hover-bg:   rgba(200,148,56,0.08);
          --shadow:     0 4px 24px rgba(0,0,0,0.30);
          --pill-bg:    rgba(200,148,56,0.13);
          --success-bg: rgba(42,114,72,0.18);
          --success-bd: rgba(42,114,72,0.35);
          --success-tx: #60C890;
        }
        [data-theme="light"] {
          --bg:         #F0E8D8;
          --bg2:        #E8DEC8;
          --card:       #FAF4E8;
          --border:     rgba(160,108,40,0.20);
          --border-h:   rgba(160,108,40,0.48);
          --gold:       #A06C28;
          --gold-h:     #8A5A18;
          --text:       #2E1C08;
          --text-2:     #5C4020;
          --muted:      #9A7850;
          --input-bg:   #E8DEC8;
          --hover-bg:   rgba(160,108,40,0.08);
          --shadow:     0 4px 24px rgba(100,60,10,0.10);
          --pill-bg:    rgba(160,108,40,0.12);
          --success-bg: rgba(30,100,60,0.10);
          --success-bd: rgba(30,100,60,0.25);
          --success-tx: #1A6B3A;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; transition: var(--transition-theme); overflow-x: hidden; }
        button, input, select, textarea { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg2); }
        ::-webkit-scrollbar-thumb { background: var(--border-h); border-radius: 4px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }

        .topbar { background: var(--card); border-bottom: 1px solid var(--border); height: 66px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; position: sticky; top: 0; z-index: 100; transition: var(--transition-theme); box-shadow: var(--shadow); }
        .brand { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--text); display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .brand-logo { width: 52px; height: 52px; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 2px 10px rgba(200,148,56,0.30)); transition: transform 0.3s ease; }
        .brand:hover .brand-logo { transform: scale(1.08) rotate(-3deg); }
        .brand em { color: var(--gold); font-style: normal; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        
        .theme-toggle { width: 40px; height: 22px; background: var(--border-h); border-radius: 11px; border: none; cursor: pointer; position: relative; transition: background 0.3s; flex-shrink: 0; }
        .theme-toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: var(--card); border-radius: 50%; top: 3px; left: 3px; transition: transform 0.3s, background 0.3s; }
        [data-theme="light"] .theme-toggle::after { transform: translateX(18px); }
        .theme-label { font-size: 12px; color: var(--muted); }

        .cart-btn { display: flex; align-items: center; gap: 8px; background: var(--gold); color: #fff; border: none; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; position: relative; }
        [data-theme="light"] .cart-btn { color: #fff; }
        .cart-btn:hover { background: var(--gold-h); }
        .cart-count { background: var(--card); color: var(--gold); border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1px solid var(--border-h); }

        .table-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; }
        .glow { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 40% at 50% 10%, rgba(200,148,56,0.10) 0%, transparent 70%); }
        [data-theme="light"] .glow { background: radial-gradient(ellipse 60% 40% at 50% 10%, rgba(160,108,40,0.08) 0%, transparent 70%); }
        .table-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 36px 30px; width: 100%; max-width: 380px; text-align: center; position: relative; z-index: 1; box-shadow: var(--shadow); animation: fadeIn 0.4s ease; transition: var(--transition-theme); }
        .table-card .logo { font-family: 'Playfair Display', serif; font-size: 40px; margin-bottom: 4px; }
        .table-card .logo em { color: var(--gold); font-style: normal; }
        .table-card .logo-img { width: 84px; height: 84px; object-fit: contain; margin: 0 auto 10px; display: block; filter: drop-shadow(0 6px 16px rgba(200,148,56,0.35)); }
        .table-card .tagline { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 28px; }
        .table-card h2 { font-family: 'Playfair Display', serif; font-size: 22px; margin-bottom: 6px; }
        .table-card p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
        .table-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 18px; }
        .t-btn { aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; }
        .t-btn:hover, .t-btn.sel { background: var(--gold); color: #fff; border-color: var(--gold); }
        .or-line { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .or-line::before, .or-line::after { content: ''; flex: 1; border-top: 1px solid var(--border); }
        .custom-inp { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 14px; color: var(--text); outline: none; margin-bottom: 14px; transition: border-color 0.2s; text-align: center; }
        .custom-inp:focus { border-color: var(--gold); }
        .custom-inp::placeholder { color: var(--muted); }
        .btn-primary { width: 100%; padding: 12px; background: var(--gold); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background: var(--gold-h); }
        .ts-theme { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px; }

        .main { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
        .page-hdr { margin-bottom: 18px; }
        .page-hdr h1 { font-family: 'Playfair Display', serif; font-size: 28px; }
        .page-hdr p { font-size: 13px; color: var(--muted); margin-top: 3px; }
        .table-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--pill-bg); border: 1px solid var(--border-h); border-radius: 20px; padding: 4px 12px; font-size: 12px; color: var(--gold); margin-bottom: 18px; }
        .cat-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .cat-pill { padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); background: none; font-size: 13px; cursor: pointer; color: var(--muted); transition: all 0.18s; }
        .cat-pill.active { background: var(--gold); color: #fff; border-color: var(--gold); font-weight: 600; }
        .cat-pill:hover:not(.active) { border-color: var(--border-h); color: var(--text); }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 14px; margin-bottom: 32px; }
        .menu-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; position: relative; display: flex; flex-direction: column; transition: all 0.2s; box-shadow: var(--shadow); }
        .menu-card:hover { border-color: var(--border-h); transform: translateY(-2px); }
        .menu-card .emoji { font-size: 34px; margin-bottom: 10px; }
        .menu-img { width: 100%; height: 90px; object-fit: cover; border-radius: 10px; margin-bottom: 10px; display: block; }
        .menu-card.sold-out .menu-img { filter: grayscale(0.7); opacity: 0.6; }
        .menu-card .name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
        .menu-card .cat { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; }
        .menu-card .price { font-size: 14px; color: var(--gold); font-weight: 600; margin-bottom: 8px; }
        .menu-card .desc { font-size: 12px; color: var(--muted); line-height: 1.55; flex: 1; margin-bottom: 12px; }
        .add-btn { width: 100%; padding: 8px; background: var(--gold); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.18s; }
        .add-btn:hover { background: var(--gold-h); }
        .item-count-badge { position: absolute; top: 10px; right: 10px; background: var(--gold); color: #fff; font-size: 11px; font-weight: 700; min-width: 20px; height: 20px; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }

        .item-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 260; display: none; align-items: flex-end; justify-content: center; }
        .item-modal-overlay.open { display: flex; animation: fadeIn 0.2s; }
        .item-modal { background: var(--card); width: 100%; max-width: 480px; border-radius: 24px 24px 0 0; padding: 14px 22px 22px; max-height: 88vh; overflow-y: auto; animation: imSlideUp 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: 0 -8px 40px rgba(0,0,0,0.35); }
        @media (min-width: 600px) { .item-modal-overlay { align-items: center; } .item-modal { border-radius: 24px; max-height: 84vh; } }
        @keyframes imSlideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        .item-modal-handle { width: 40px; height: 4px; background: var(--border-h); border-radius: 2px; margin: 0 auto 18px; }
        .item-modal-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
        .item-modal-emoji { width: 56px; height: 56px; border-radius: 14px; background: var(--bg2); display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
        .item-modal-img { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
        .item-modal-name { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--text); margin-bottom: 2px; }
        .item-modal-price { color: var(--gold); font-weight: 600; font-size: 15px; }
        .opt-section { margin-bottom: 20px; }
        .opt-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
        .opt-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .opt-pill { padding: 9px 16px; border-radius: 999px; border: 1.5px solid var(--border); background: none; color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Outfit', sans-serif; }
        .opt-pill:hover { border-color: var(--border-h); }
        .opt-pill.sel { background: var(--gold); border-color: var(--gold); color: #fff; font-weight: 600; }
        .opt-notes { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; font-size: 13px; color: var(--text); font-family: 'Outfit', sans-serif; resize: vertical; min-height: 60px; outline: none; }
        .opt-notes:focus { border-color: var(--gold); }
        .opt-notes::placeholder { color: var(--muted); }
        .item-modal-actions { display: flex; gap: 10px; margin-top: 22px; }
        .im-btn-cancel { flex: 1; padding: 14px; background: none; border: 1px solid var(--border); border-radius: 14px; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; font-family: 'Outfit', sans-serif; }
        .im-btn-cancel:hover { border-color: var(--border-h); color: var(--text); }
        .im-btn-add { flex: 2; padding: 14px; background: var(--gold); border: none; border-radius: 14px; color: #fff; font-size: 15px; font-weight: 600; font-family: 'Playfair Display', serif; cursor: pointer; box-shadow: 0 4px 20px rgba(200,148,56,0.25); transition: background 0.2s, transform 0.15s; }
        .im-btn-add:hover { background: var(--gold-h); transform: translateY(-1px); }

        .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.70); z-index: 200; display: none; }
        .cart-overlay.open { display: block; animation: fadeIn 0.2s; }
        .cart-drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 100%; max-width: 420px; background: var(--card); border-left: 1px solid var(--border); z-index: 201; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: var(--shadow); }
        .cart-drawer.open { transform: none; animation: slideIn 0.3s ease; }
        .cart-head { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .cart-head h2 { font-family: 'Playfair Display', serif; font-size: 20px; }
        .close-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; color: var(--muted); font-size: 13px; cursor: pointer; transition: all 0.18s; }
        .close-btn:hover { border-color: var(--border-h); color: var(--text); }
        .cart-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
        .cart-item-card { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); }
        .cart-item-card:last-of-type { border-bottom: none; }
        .ci-thumb { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; flex-shrink: 0; background: var(--bg2); border: 1px solid var(--border); box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
        .ci-thumb-emoji { width: 72px; height: 72px; border-radius: 16px; background: var(--bg2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
        .ci-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .ci-top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .ci-name { font-weight: 600; color: var(--text); font-size: 14.5px; line-height: 1.3; }
        .ci-unit-price { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .ci-custom { font-size: 11px; color: var(--muted); line-height: 1.5; margin: 5px 0 0; padding: 5px 9px; background: var(--bg2); border-radius: 8px; display: inline-block; }
        .ci-bottom-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 10px; }
        .ci-actions { display: flex; align-items: center; gap: 12px; }
        .ci-qty-stepper { display: flex; align-items: center; gap: 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 4px 6px; }
        .ci-qty-stepper .qty-btn { width: 22px; height: 22px; border-radius: 6px; border: none; background: var(--card); color: var(--gold); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .ci-qty-stepper .qty-btn:hover { background: var(--gold); color: #fff; }
        .ci-qty-num { font-size: 13px; font-weight: 600; min-width: 14px; text-align: center; color: var(--text); }
        .ci-line-price { font-weight: 700; color: var(--gold); font-size: 15px; white-space: nowrap; }
        .cart-foot { padding: 16px 20px; border-top: 1px solid var(--border); }
        .cart-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; margin-bottom: 14px; }
        .cart-total span:last-child { color: var(--gold); }
        .place-btn { width: 100%; padding: 14px; background: var(--gold); color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: 'Playfair Display', serif; cursor: pointer; transition: background 0.2s; }
        .place-btn:hover { background: var(--gold-h); }
        .place-btn:disabled { background: var(--border); cursor: not-allowed; }
        .empty-cart { text-align: center; padding: 40px 20px; color: var(--muted); }
        .empty-cart .e-icon { font-size: 44px; margin-bottom: 12px; }

        .success-screen { min-height: calc(100vh - 58px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .success-card { background: var(--card); border: 1px solid var(--success-bd); border-radius: 20px; padding: 36px 28px; max-width: 360px; text-align: center; animation: fadeIn 0.4s; box-shadow: var(--shadow); }
        .success-card .s-icon { font-size: 56px; margin-bottom: 14px; }
        .success-card h2 { font-family: 'Playfair Display', serif; font-size: 26px; margin-bottom: 8px; }
        .success-card p { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 22px; }
        .order-badge { display: inline-block; background: var(--pill-bg); border: 1px solid var(--border-h); border-radius: 10px; padding: 10px 20px; font-size: 14px; color: var(--gold); margin-bottom: 22px; }

        .menu-card.sold-out { opacity: 0.55; }
        .menu-card.sold-out .emoji { filter: grayscale(0.7); }
        .sold-out-badge { display: inline-block; background: rgba(192,64,64,0.15); border: 1px solid rgba(192,64,64,0.30); color: #E08080; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 2px 9px; border-radius: 6px; margin-bottom: 4px; }
        .sold-out-btn { background: var(--bg2) !important; color: var(--muted) !important; cursor: not-allowed !important; border: 1px solid var(--border) !important; box-shadow: none !important; }

        @media(max-width:600px){ .main { padding: 16px; } .topbar { padding: 0 14px; } .menu-grid { grid-template-columns: repeat(auto-fill,minmax(155px,1fr)); } .cart-drawer { max-width: 100%; } }
      `}</style>

      {step === 'table' && (
        <div className="table-screen">
          <div className="glow" />
          <div className="ts-theme">
            <span className="theme-label">🌙</span>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark/light mode" />
            <span className="theme-label">☀️</span>
          </div>
          <div className="table-card">
            <img className="logo-img" src="/logo.png" alt="Coffee-r Attokahon" />
            <div className="logo"><em>Coffee-r</em> Attokahon</div>
            <div className="tagline">Artisan Coffee &amp; More</div>
            <h2>Select Your Table</h2>
            <p>Choose your table number to start ordering</p>
            <div className="table-grid">
              {availableTables.map(table => (
                <button key={table.id} className={`t-btn${selectedBtn === table.id ? ' sel' : ''}`}
                  onClick={() => { setSelectedBtn(table.id); setCustomTableInput(String(table.id)); }}>{table.id}</button>
              ))}
            </div>
            <div className="or-line">or enter manually</div>
            <input className="custom-inp" type="number" value={customTableInput}
              onChange={e => setCustomTableInput(e.target.value)}
              placeholder={`Table number (1–${maxTable})...`} min="1" max={maxTable} />
            <button className="btn-primary" onClick={confirmTable}>Start Ordering →</button>
          </div>
        </div>
      )}

      {step === 'menu' && (
        <div>
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setStep('table')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
              <Link href="/" className="brand">
                <img className="brand-logo" src="/logo.png" alt="" />
                <em>Coffee-r</em> Attokahon
              </Link>
            </div>
            <div className="topbar-right">
              <span className="theme-label" style={{ display: 'none' }}>🌙</span>
              <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" />
              <span className="theme-label" style={{ display: 'none' }}>☀️</span>
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
                <button key={c} className={`cat-pill${c === menuCat ? ' active' : ''}`}
                  onClick={() => setMenuCat(c)}>{c === 'all' ? 'All' : c}</button>
              ))}
            </div>
            <div className="menu-grid">
              {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No items in this category.</div>}
              {filtered.map(p => {
                const avail = p.avail !== false;
                
                // Calculate count for this specific product (summing quantities of all customizations)
                const inC = cartItems.filter(item => item.product.id === p.id).reduce((sum, item) => sum + item.qty, 0);

                return (
                  <div className={`menu-card${avail ? '' : ' sold-out'}`} key={p.id}>
                    {inC > 0 && <div className="item-count-badge">{inC}</div>}
                    {p.image ? (
                      <img className="menu-img" src={p.image} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="emoji">{p.emoji || '☕'}</div>
                    )}
                    {!avail && <div className="sold-out-badge">Sold Out</div>}
                    <div className="name">{p.name}</div>
                    <div className="cat">{p.cat}</div>
                    <div className="price">৳{p.price}</div>
                    <div className="desc">{p.desc}</div>
                    {avail ? (
                      <button className="add-btn" onClick={() => openProductDetails(p)}>Add to cart +</button>
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
        <div>
          <div className="topbar">
            <Link href="/" className="brand">
              <img className="brand-logo" src="/logo.png" alt="" />
              <em>Coffee-r</em> Attokahon
            </Link>
          </div>
          <div className="success-screen">
            <div className="success-card">
              <div className="s-icon">✅</div>
              <h2>Order Placed!</h2>
              <p>Your payment was confirmed and the kitchen has received your order.</p>
              {lastOrderId && <div className="order-badge">Order #{lastOrderId}</div>}
              <button className="btn-primary" onClick={() => { setStep('menu'); setLastOrderId(null); clearCart(); }}>Order More</button>
            </div>
          </div>
        </div>
      )}

      <div className={`item-modal-overlay ${selectedProduct ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
        {selectedProduct && (
          <div className="item-modal">
            <div className="item-modal-handle" />
            <div className="item-modal-head">
              {selectedProduct.image ? (
                <img className="item-modal-img" src={selectedProduct.image} alt="" />
              ) : (
                <div className="item-modal-emoji">{selectedProduct.emoji || '☕'}</div>
              )}
              <div>
                <div className="item-modal-name">{selectedProduct.name}</div>
                <div className="item-modal-price">৳{calcModalPrice()}</div>
              </div>
            </div>

            <div className="opt-section">
              <div className="opt-label">Size</div>
              <div className="opt-pills">
                <button type="button" className={`opt-pill${customization.size === 'Regular' ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, size: 'Regular' }))}>Regular</button>
                <button type="button" className={`opt-pill${customization.size === 'Large' ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, size: 'Large' }))}>Large +৳30</button>
              </div>
            </div>

            {DRINK_CATS.includes(selectedProduct.cat) && (
              <>
                <div className="opt-section">
                  <div className="opt-label">Sugar Level</div>
                  <div className="opt-pills">
                    {['0%', '30%', '50%', '100%', '150%'].map(sugar => (
                      <button type="button" key={sugar} className={`opt-pill${customization.sugar === sugar ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, sugar }))}>{sugar}</button>
                    ))}
                  </div>
                </div>

                <div className="opt-section">
                  <div className="opt-label">Milk Type</div>
                  <div className="opt-pills">
                    {['Full Cream', 'Oat', 'Soy', 'Skim', 'None'].map(milk => (
                      <button type="button" key={milk} className={`opt-pill${customization.milk === milk ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, milk }))}>{milk}</button>
                    ))}
                  </div>
                </div>

                <div className="opt-section">
                  <div className="opt-label">Extra Shot (+৳20)</div>
                  <div className="opt-pills">
                    <button type="button" className={`opt-pill${customization.extraShot === 'No' ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, extraShot: 'No' }))}>No</button>
                    <button type="button" className={`opt-pill${customization.extraShot === 'Yes' ? ' sel' : ''}`} onClick={() => setCustomization(prev => ({ ...prev, extraShot: 'Yes' }))}>Yes +৳20</button>
                  </div>
                </div>
              </>
            )}

            <div className="opt-section">
              <div className="opt-label">Special Notes</div>
              <textarea className="opt-notes" placeholder="Allergies, special requests..." value={customization.notes} onChange={e => setCustomization(prev => ({ ...prev, notes: e.target.value }))} />
            </div>

            <div className="item-modal-actions">
              <button className="im-btn-cancel" onClick={() => setSelectedProduct(null)}>Cancel</button>
              <button className="im-btn-add" onClick={addConfiguredProduct}>Add to Cart · ৳{calcModalPrice()}</button>
            </div>
          </div>
        )}
      </div>

      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-head">
          <h2>Your Cart</h2>
          <button className="close-btn" onClick={() => setCartOpen(false)}>✕ Close</button>
        </div>
        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart"><div className="e-icon">🛒</div><p>Your cart is empty.</p></div>
          ) : (
            cartItems.map(({ product, qty }) => {
              const unit = product.price;
              const sub = unit * qty;
              const summary = getCustomSummary(product.customization);
              return (
                <div className="cart-item-card" key={product.cartKey || product.id}>
                  {product.image ? (
                    <img className="ci-thumb" src={product.image} alt={product.name} />
                  ) : (
                    <div className="ci-thumb-emoji">{product.emoji || '☕'}</div>
                  )}
                  <div className="ci-info">
                    <div className="ci-top-row">
                      <div>
                        <div className="ci-name">{product.name}</div>
                        <div className="ci-unit-price">৳{unit} each</div>
                      </div>
                    </div>
                    {summary && <div className="ci-custom">{summary}</div>}
                    <div className="ci-bottom-row">
                      <div className="ci-actions">
                        <div className="ci-qty-stepper">
                          <button className="qty-btn" onClick={() => changeCartQty(product.cartKey || product.id, -1)}>−</button>
                          <span className="ci-qty-num">{qty}</span>
                          <button className="qty-btn" onClick={() => changeCartQty(product.cartKey || product.id, 1)}>+</button>
                        </div>
                      </div>
                      <span className="ci-line-price">৳{sub}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="cart-foot">
          <div className="cart-total"><span>Total</span><span>৳{cartTotal}</span></div>
          <button className="place-btn" disabled={cartItems.length === 0} onClick={placeOrder}>Proceed to Checkout →</button>
        </div>
      </div>
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="topbar">
          <Link href="/" className="brand">
            <img className="brand-logo" src="/logo.png" alt="" />
            <em>Coffee-r</em> Attokahon
          </Link>
        </div>
        <div className="main"><p>Loading menu...</p></div>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
