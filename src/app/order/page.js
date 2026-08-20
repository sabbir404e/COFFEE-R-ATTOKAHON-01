'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { resolveProductImage } from '@/lib/products';
import Link from 'next/link';

function OrderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toggleTheme, products, addToCart, updateCartItem, removeFromCart, changeCartQty, cart, clearCart, tableNum, setTableNum, tables } = useApp();

  const urlTable = parseInt(searchParams.get('table'));
  const isPreview = searchParams.get('preview') === 'true';
  const [step, setStep] = useState('table'); // 'table' | 'menu' | 'success'
  const [localTable, setLocalTable] = useState(null);
  const [customTableInput, setCustomTableInput] = useState('');
  const [selectedBtn, setSelectedBtn] = useState(null);
  const [tableError, setTableError] = useState('');
  const [menuCat, setMenuCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingCartKey, setEditingCartKey] = useState(null);
  const [customization, setCustomization] = useState({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: 'No', notes: '' });
  
  const DRINK_CATS = ['Coffee', 'Specialty', 'Tea'];

  // Keep all tables selectable so guests at the same table can order multiple times
  const allTables = tables && tables.length > 0
    ? [...tables].sort((a, b) => a.id - b.id)
    : Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Table ${i + 1}`, status: 'available' }));
  const maxTable = allTables.length > 0 ? Math.max(...allTables.map(t => t.id)) : 20;

  // Only auto-skip to menu if a specific table number is provided in the URL query param (e.g. from QR scan: /order?table=5)
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      if (!isNaN(urlTable) && urlTable >= 1) {
        setLocalTable(urlTable);
        setTableNum(urlTable);
        setCustomTableInput(String(urlTable));
        setSelectedBtn(urlTable);
        setStep('menu');
      } else {
        setStep('table');
        setLocalTable(null);
        setSelectedBtn(null);
        setCustomTableInput('');
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [urlTable, setTableNum]);

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
    const val = parseInt(customTableInput, 10) || localTable || selectedBtn;
    if (!val || isNaN(val) || val < 1) {
      setTableError('Please select or enter your table number to start ordering.');
      return;
    }
    if (val > maxTable) {
      setTableError(`Please enter a valid table number (1–${maxTable}).`);
      return;
    }
    setTableError('');
    setLocalTable(val);
    setTableNum(val);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('ca_table_num', String(val)); } catch (e) {}
    }
    if (clearCart) clearCart();
    // Redirect to the welcome page with the selected table
    router.push(`/?table=${val}`);
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, v) => s + v.qty, 0);
  const cartTotal = cartItems.reduce((s, v) => s + v.product.price * v.qty, 0);

  const cats = ['all', ...new Set(products.map(p => p.cat))];
  const filtered = menuCat === 'all' ? products : products.filter(p => p.cat === menuCat);

  const openProductDetails = (product) => {
    if (product.avail === false) return;
    setEditingCartKey(null);
    setSelectedProduct(product);
    setCustomization({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: 'No', notes: '' });
  };

  const handleEditCartItem = (cartItem) => {
    const { product } = cartItem;
    const baseProduct = products.find(p => p.id === product.id) || product;
    
    setEditingCartKey(product.cartKey || product.id);
    setSelectedProduct(baseProduct);
    
    if (product.customization) {
      setCustomization({
        size: product.customization.size || 'Regular',
        sugar: product.customization.sugar || '100%',
        milk: product.customization.milk || 'Full Cream',
        extraShot: product.customization.extraShot || 'No',
        notes: product.customization.notes || '',
      });
    } else {
      setCustomization({ size: 'Regular', sugar: '100%', milk: 'Full Cream', extraShot: 'No', notes: '' });
    }
  };

  const addConfiguredProduct = () => {
    if (!selectedProduct) return;
    const isDrink = DRINK_CATS.includes(selectedProduct.cat);
    const finalCustomization = isDrink ? { ...customization } : { ...customization, sugar: null, milk: null, extraShot: 'No' };
    
    const surcharge = (finalCustomization.size === 'Large' ? 30 : 0) + (finalCustomization.extraShot === 'Yes' ? 20 : 0);
    
    if (editingCartKey) {
      updateCartItem(editingCartKey, selectedProduct.id, { ...finalCustomization, surcharge });
    } else {
      addToCart(selectedProduct.id, { ...finalCustomization, surcharge });
    }
    
    setSelectedProduct(null);
    setEditingCartKey(null);
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
        image: resolveProductImage(p, products) || p.image || null,
        qty: cart[k].qty,
        price: p.price,
        id: p.id,
        customization: custom || null,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;
    localStorage.setItem('ca_pending_cart', JSON.stringify({ tableNum: localTable || tableNum || 1, items, subtotal, serviceCharge, total }));
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
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg2); }
        ::-webkit-scrollbar-thumb { background: var(--border-h); border-radius: 4px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes floatUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

        .topbar { background: var(--card); border-bottom: 1px solid var(--border); height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; position: sticky; top: 0; z-index: 100; transition: var(--transition-theme); box-shadow: var(--shadow); }
        .brand { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--text); display: flex; align-items: center; gap: 10px; text-decoration: none; min-width: 0; }
        .brand-logo { width: 48px; height: 48px; object-fit: cover; border-radius: 50%; border: 2px solid var(--gold); background: var(--bg2); flex-shrink: 0; box-shadow: 0 2px 10px rgba(200,148,56,0.35); transition: transform 0.3s ease; }
        .brand:hover .brand-logo { transform: scale(1.08) rotate(-3deg); border-color: var(--gold-h); }
        .brand em { color: var(--gold); font-style: normal; }
        .topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        
        .theme-toggle { width: 40px; height: 22px; background: var(--border-h); border-radius: 11px; border: none; cursor: pointer; position: relative; transition: background 0.3s; flex-shrink: 0; }
        .theme-toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: var(--card); border-radius: 50%; top: 3px; left: 3px; transition: transform 0.3s, background 0.3s; }
        [data-theme="light"] .theme-toggle::after { transform: translateX(18px); }
        .theme-label { font-size: 12px; color: var(--muted); }

        .cart-btn { display: flex; align-items: center; gap: 8px; background: var(--gold); color: #fff; border: none; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.15s; position: relative; white-space: nowrap; flex-shrink: 0; }
        [data-theme="light"] .cart-btn { color: #fff; }
        .cart-btn:hover { background: var(--gold-h); transform: translateY(-1px); }
        .cart-count { background: var(--card); color: var(--gold); border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1px solid var(--border-h); }

        .table-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; }
        .glow { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 40% at 50% 10%, rgba(200,148,56,0.10) 0%, transparent 70%); }
        [data-theme="light"] .glow { background: radial-gradient(ellipse 60% 40% at 50% 10%, rgba(160,108,40,0.08) 0%, transparent 70%); }
        .table-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 36px 28px; width: 100%; max-width: 400px; text-align: center; position: relative; z-index: 1; box-shadow: var(--shadow); animation: fadeIn 0.4s ease; transition: var(--transition-theme); }
        .table-card .logo { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 4px; }
        .table-card .logo em { color: var(--gold); font-style: normal; }
        .table-card .logo-img { width: 80px; height: 80px; object-fit: contain; margin: 0 auto 10px; display: block; filter: drop-shadow(0 6px 16px rgba(200,148,56,0.35)); }
        .table-card .tagline { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 24px; }
        .table-card h2 { font-family: 'Playfair Display', serif; font-size: 22px; margin-bottom: 6px; }
        .table-card p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
        .table-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 18px; }
        .t-btn { aspect-ratio: 1; min-height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; }
        .t-btn:hover, .t-btn.sel { background: var(--gold); color: #fff; border-color: var(--gold); font-weight: 700; }
        .or-line { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .or-line::before, .or-line::after { content: ''; flex: 1; border-top: 1px solid var(--border); }
        .custom-inp { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 14px; color: var(--text); outline: none; margin-bottom: 14px; transition: border-color 0.2s; text-align: center; }
        .custom-inp:focus { border-color: var(--gold); }
        .custom-inp::placeholder { color: var(--muted); }
        .btn-primary { width: 100%; padding: 13px; background: var(--gold); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background: var(--gold-h); }
        .ts-theme { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px; }

        .main { max-width: 1100px; margin: 0 auto; padding: 24px 20px 80px; }
        .page-hdr { margin-bottom: 18px; }
        .page-hdr h1 { font-family: 'Playfair Display', serif; font-size: 28px; }
        .page-hdr p { font-size: 13px; color: var(--muted); margin-top: 3px; }
        .table-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--pill-bg); border: 1px solid var(--border-h); border-radius: 20px; padding: 5px 12px; font-size: 12px; color: var(--gold); font-weight: 500; }
        
        .cat-bar { display: flex; gap: 8px; overflow-x: auto; flex-wrap: nowrap; margin-bottom: 20px; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .cat-bar::-webkit-scrollbar { display: none; }
        .cat-pill { padding: 7px 16px; border-radius: 20px; border: 1px solid var(--border); background: none; font-size: 13px; cursor: pointer; color: var(--muted); transition: all 0.18s; white-space: nowrap; flex-shrink: 0; }
        .cat-pill.active { background: var(--gold); color: #fff; border-color: var(--gold); font-weight: 600; }
        .cat-pill:hover:not(.active) { border-color: var(--border-h); color: var(--text); }
        
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 14px; margin-bottom: 32px; }
        .menu-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 14px; position: relative; display: flex; flex-direction: column; transition: all 0.2s; box-shadow: var(--shadow); }
        .menu-card:hover { border-color: var(--border-h); transform: translateY(-2px); }
        .menu-card .emoji { font-size: 34px; margin-bottom: 10px; height: 110px; display: flex; align-items: center; justify-content: center; background: var(--bg2); border-radius: 10px; }
        .menu-img { width: 100%; height: 110px; object-fit: cover; border-radius: 10px; margin-bottom: 10px; display: block; }
        .menu-card.sold-out .menu-img { filter: grayscale(0.7); opacity: 0.6; }
        .menu-card .name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; line-height: 1.3; }
        .menu-card .cat { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
        .menu-card .price { font-size: 14px; color: var(--gold); font-weight: 700; margin-bottom: 6px; }
        .menu-card .desc { font-size: 12px; color: var(--muted); line-height: 1.45; flex: 1; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .add-btn { width: 100%; padding: 9px 8px; background: var(--gold); color: #fff; border: none; border-radius: 9px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background 0.18s; display: flex; align-items: center; justify-content: center; }
        .add-btn:hover { background: var(--gold-h); }
        .item-count-badge { position: absolute; top: 8px; right: 8px; background: var(--gold); color: #fff; font-size: 11px; font-weight: 700; min-width: 20px; height: 20px; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); z-index: 2; }

        .item-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 260; display: none; align-items: flex-end; justify-content: center; }
        .item-modal-overlay.open { display: flex; animation: fadeIn 0.2s; }
        .item-modal { background: var(--card); width: 100%; max-width: 480px; border-radius: 24px 24px 0 0; padding: 14px 20px calc(20px + env(safe-area-inset-bottom, 0px)); max-height: 86vh; overflow-y: auto; overscroll-behavior: contain; animation: imSlideUp 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: 0 -8px 40px rgba(0,0,0,0.35); }
        @media (min-width: 600px) { .item-modal-overlay { align-items: center; } .item-modal { border-radius: 24px; max-height: 84vh; padding: 22px; } }
        @keyframes imSlideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        .item-modal-handle { width: 40px; height: 4px; background: var(--border-h); border-radius: 2px; margin: 0 auto 16px; }
        .item-modal-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .item-modal-emoji { width: 56px; height: 56px; border-radius: 14px; background: var(--bg2); display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
        .item-modal-img { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
        .item-modal-name { font-family: 'Playfair Display', serif; font-size: 19px; color: var(--text); margin-bottom: 2px; line-height: 1.25; }
        .item-modal-price { color: var(--gold); font-weight: 700; font-size: 15px; }
        .opt-section { margin-bottom: 18px; }
        .opt-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
        .opt-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .opt-pill { padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--border); background: none; color: var(--text); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Outfit', sans-serif; }
        .opt-pill:hover { border-color: var(--border-h); }
        .opt-pill.sel { background: var(--gold); border-color: var(--gold); color: #fff; font-weight: 600; }
        .opt-notes { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; font-size: 13px; color: var(--text); font-family: 'Outfit', sans-serif; resize: vertical; min-height: 60px; outline: none; }
        .opt-notes:focus { border-color: var(--gold); }
        .opt-notes::placeholder { color: var(--muted); }
        .item-modal-actions { display: flex; gap: 10px; margin-top: 20px; position: sticky; bottom: 0; background: var(--card); padding-top: 8px; }
        .im-btn-cancel { flex: 1; padding: 13px; background: none; border: 1px solid var(--border); border-radius: 12px; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; font-family: 'Outfit', sans-serif; }
        .im-btn-cancel:hover { border-color: var(--border-h); color: var(--text); }
        .im-btn-add { flex: 2; padding: 13px; background: var(--gold); border: none; border-radius: 12px; color: #fff; font-size: 14.5px; font-weight: 600; font-family: 'Playfair Display', serif; cursor: pointer; box-shadow: 0 4px 20px rgba(200,148,56,0.25); transition: background 0.2s, transform 0.15s; }
        .im-btn-add:hover { background: var(--gold-h); transform: translateY(-1px); }

        .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.70); z-index: 200; display: none; }
        .cart-overlay.open { display: block; animation: fadeIn 0.2s; }
        .cart-drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 100%; max-width: 420px; background: var(--card); border-left: 1px solid var(--border); z-index: 201; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: var(--shadow); }
        .cart-drawer.open { transform: none; animation: slideIn 0.3s ease; }
        .cart-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .cart-head h2 { font-family: 'Playfair Display', serif; font-size: 20px; }
        .close-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; color: var(--muted); font-size: 13px; cursor: pointer; transition: all 0.18s; }
        .close-btn:hover { border-color: var(--border-h); color: var(--text); }
        .cart-body { flex: 1; overflow-y: auto; padding: 14px 20px; overscroll-behavior: contain; }
        .cart-item-card { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
        .cart-item-card:last-of-type { border-bottom: none; }
        .ci-thumb { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: var(--bg2); border: 1px solid var(--border); box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
        .ci-thumb-emoji { width: 64px; height: 64px; border-radius: 50%; background: var(--bg2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
        .ci-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .ci-top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .ci-name { font-weight: 600; color: var(--text); font-size: 14px; line-height: 1.3; }
        .ci-unit-price { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .ci-custom { font-size: 11px; color: var(--muted); line-height: 1.45; margin: 4px 0 0; padding: 4px 8px; background: var(--bg2); border-radius: 6px; display: inline-block; }
        .ci-bottom-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px; }
        .ci-actions { display: flex; align-items: center; gap: 10px; }
        .ci-qty-stepper { display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 3px 5px; }
        .ci-qty-stepper .qty-btn { width: 24px; height: 24px; border-radius: 6px; border: none; background: var(--card); color: var(--gold); font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .ci-qty-stepper .qty-btn:hover { background: var(--gold); color: #fff; }
        .ci-qty-num { font-size: 13px; font-weight: 600; min-width: 16px; text-align: center; color: var(--text); }
        .ci-edit-btn { background: none; border: none; color: var(--gold); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 4px; font-family: 'Outfit', sans-serif; transition: color 0.18s; }
        .ci-edit-btn:hover { color: var(--gold-h); text-decoration: underline; }
        .ci-line-price { font-weight: 700; color: var(--gold); font-size: 14.5px; white-space: nowrap; }
        .cart-foot { padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--border); }
        .cart-total { display: flex; justify-content: space-between; font-size: 15.5px; font-weight: 600; margin-bottom: 12px; }
        .cart-total span:last-child { color: var(--gold); font-weight: 700; }
        .place-btn { width: 100%; padding: 13px; background: var(--gold); color: #fff; border: none; border-radius: 12px; font-size: 14.5px; font-weight: 600; font-family: 'Playfair Display', serif; cursor: pointer; transition: background 0.2s; }
        .place-btn:hover { background: var(--gold-h); }
        .place-btn:disabled { background: var(--border); cursor: not-allowed; }
        .empty-cart { text-align: center; padding: 40px 20px; color: var(--muted); }
        .empty-cart .e-icon { font-size: 44px; margin-bottom: 12px; }

        .mobile-floating-cart {
          display: none;
          position: fixed;
          bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          left: 14px;
          right: 14px;
          z-index: 150;
          background: var(--gold);
          color: #fff;
          border-radius: 16px;
          padding: 12px 18px;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
          cursor: pointer;
          animation: floatUp 0.3s ease;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .mobile-floating-cart:active { transform: scale(0.98); }
        .mfc-left { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
        .mfc-badge { background: rgba(0,0,0,0.25); padding: 3px 8px; border-radius: 12px; font-size: 12px; }
        .mfc-price { font-weight: 700; font-size: 15px; }
        .mfc-right { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 13.5px; }

        .success-screen { min-height: calc(100vh - 58px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .success-card { background: var(--card); border: 1px solid var(--success-bd); border-radius: 20px; padding: 32px 24px; max-width: 360px; width: 100%; text-align: center; animation: fadeIn 0.4s; box-shadow: var(--shadow); }
        .success-card .s-icon { font-size: 52px; margin-bottom: 12px; }
        .success-card h2 { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 8px; }
        .success-card p { font-size: 13.5px; color: var(--muted); line-height: 1.55; margin-bottom: 20px; }
        .order-badge { display: inline-block; background: var(--pill-bg); border: 1px solid var(--border-h); border-radius: 10px; padding: 9px 18px; font-size: 13.5px; color: var(--gold); margin-bottom: 20px; }

        .menu-card.sold-out { opacity: 0.55; }
        .menu-card.sold-out .emoji { filter: grayscale(0.7); }
        .sold-out-badge { display: inline-block; background: rgba(192,64,64,0.15); border: 1px solid rgba(192,64,64,0.30); color: #E08080; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
        .sold-out-btn { background: var(--bg2) !important; color: var(--muted) !important; cursor: not-allowed !important; border: 1px solid var(--border) !important; box-shadow: none !important; }

        /* Responsive Breakpoints */
        @media(max-width:768px) {
          .mobile-floating-cart { display: flex; }
          .main { padding-bottom: 100px; }
        }

        @media(max-width:600px) {
          .topbar { padding: 0 12px; height: 58px; }
          .brand { font-size: 17px; gap: 8px; }
          .brand-logo { width: 40px; height: 40px; }
          .cart-btn { padding: 7px 12px; font-size: 12px; }
          .theme-toggle { width: 36px; height: 20px; }
          .theme-toggle::after { width: 14px; height: 14px; }
          [data-theme="light"] .theme-toggle::after { transform: translateX(16px); }
          .main { padding: 14px 12px 100px; }
          .page-hdr h1 { font-size: 22px; }
          .page-hdr p { font-size: 12px; }
          .menu-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .menu-card { padding: 10px; border-radius: 14px; }
          .menu-img, .menu-card .emoji { height: 100px; border-radius: 8px; margin-bottom: 8px; }
          .menu-card .name { font-size: 13px; min-height: 32px; }
          .menu-card .desc { font-size: 11px; margin-bottom: 8px; }
          .menu-card .price { font-size: 13px; }
          .add-btn { font-size: 11.5px; padding: 7px 4px; border-radius: 8px; }
          .cart-drawer { max-width: 100%; }
          .table-screen { padding: 16px 12px; }
          .table-card { padding: 28px 18px; border-radius: 18px; }
          .table-card .logo { font-size: 28px; }
          .table-card .logo-img { width: 68px; height: 68px; }
          .table-grid { gap: 6px; }
          .t-btn { font-size: 13px; min-height: 36px; border-radius: 8px; }
        }

        @media(max-width:360px) {
          .menu-grid { grid-template-columns: 1fr; }
          .brand { font-size: 15px; }
          .brand-logo { width: 34px; height: 34px; }
          .topbar { padding: 0 10px; }
          .cart-btn { padding: 6px 10px; font-size: 11px; }
        }
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
              {allTables.map(table => (
                <button
                  key={table.id}
                  className={`t-btn${(selectedBtn === table.id || customTableInput === String(table.id)) ? ' sel' : ''}`}
                  onClick={() => {
                    setSelectedBtn(table.id);
                    setLocalTable(table.id);
                    setCustomTableInput(String(table.id));
                    setTableError('');
                  }}
                >
                  {table.id}
                </button>
              ))}
            </div>
            <div className="or-line">or enter manually</div>
            <input
              className="custom-inp"
              type="number"
              value={customTableInput}
              onChange={e => {
                const val = e.target.value;
                setCustomTableInput(val);
                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 1) {
                  setSelectedBtn(num);
                  setLocalTable(num);
                } else {
                  setSelectedBtn(null);
                  setLocalTable(null);
                }
                setTableError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmTable();
              }}
              placeholder={`Table number (1–${maxTable})...`}
              min="1"
              max={maxTable}
            />
            {tableError && (
              <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '6px', fontWeight: 600, textAlign: 'center' }}>
                {tableError}
              </div>
            )}
            <button className="btn-primary" onClick={confirmTable} style={{ marginTop: '12px' }}>Start Ordering →</button>
          </div>
        </div>
      )}

      {step === 'menu' && (
        <div>
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('table');
                  setTableError('');
                }}
                className="table-chip"
                style={{
                  marginBottom: 0,
                  cursor: 'pointer',
                  border: '1px solid var(--border-h)',
                  background: 'var(--card)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '20px',
                }}
                title="Click to switch table"
              >
                📍 Table {localTable || tableNum || '—'} <span style={{ fontSize: '11px', opacity: 0.75 }}>✎ Change</span>
              </button>
            </div>
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
                    {(() => {
                      const itemImg = resolveProductImage(p, products);
                      return itemImg ? (
                        <img
                          className="menu-img"
                          src={itemImg}
                          alt={p.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null;
                    })()}
                    <div className="emoji" style={{ display: resolveProductImage(p, products) ? 'none' : 'flex' }}>{p.emoji || '☕'}</div>
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

          {cartCount > 0 && (
            <div className="mobile-floating-cart" onClick={() => setCartOpen(true)}>
              <div className="mfc-left">
                <span>🛒</span>
                <span className="mfc-badge">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                <span className="mfc-price">৳{cartTotal}</span>
              </div>
              <div className="mfc-right">
                <span>View Cart</span>
                <span>→</span>
              </div>
            </div>
          )}
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
              {(() => {
                const modalImg = resolveProductImage(selectedProduct, products);
                return (
                  <>
                    {modalImg ? (
                      <img
                        className="item-modal-img"
                        src={modalImg}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className="item-modal-emoji" style={{ display: modalImg ? 'none' : 'flex' }}>{selectedProduct.emoji || '☕'}</div>
                  </>
                );
              })()}
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
              <button className="im-btn-cancel" onClick={() => { setSelectedProduct(null); setEditingCartKey(null); }}>Cancel</button>
              <button className="im-btn-add" onClick={addConfiguredProduct}>
                {editingCartKey ? `Update Item - ৳${calcModalPrice()}` : `Add to Cart · ৳${calcModalPrice()}`}
              </button>
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
                  {(() => {
                    const cartImg = resolveProductImage(product, products);
                    return (
                      <>
                        {cartImg ? (
                          <img
                            className="ci-thumb"
                            src={cartImg}
                            alt={product.name}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className="ci-thumb-emoji" style={{ display: cartImg ? 'none' : 'flex' }}>{product.emoji || '☕'}</div>
                      </>
                    );
                  })()}
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
                        <button className="ci-edit-btn" onClick={() => handleEditCartItem({ product, qty })}>Edit</button>
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
