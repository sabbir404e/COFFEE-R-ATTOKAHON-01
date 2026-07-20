'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const METHODS = {
  bkash:  { name: 'bKash (Manual)',  num: '01712-345678', icon: '📱' },
  nagad:  { name: 'Nagad (Manual)',  num: '01812-345678', icon: '🪙' },
  rocket: { name: 'Rocket (Manual)', num: '01512-345678', icon: '🚀' },
};

export default function PaymentPage() {
  const router = useRouter();
  const { toggleTheme } = useApp();

  const [cart, setCart] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('bkash');
  const [timeLeft, setTimeLeft] = useState(600);
  const [processing, setProcessing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const pc = JSON.parse(localStorage.getItem('ca_pending_cart'));
      if (pc && pc.items && pc.items.length) {
        setCart(pc);
      } else {
        router.push('/order');
      }
    } catch {
      router.push('/order');
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [router]);

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(METHODS[selectedMethod].num.replace('-', '')).catch(() => {});
  };

  const confirmPayment = async () => {
    if (!cart) return;
    setProcessing(true);
    clearInterval(timerRef.current);



    setTimeout(async () => {
      const txnId = 'TXN' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*1000);
      const invoiceNum = 'INV-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4);

      const { data: orderData, error: orderErr } = await supabase.from('orders').insert({
        invoice_num: invoiceNum,
        table_id: cart.tableNum || null,
        subtotal: cart.subtotal || cart.total,
        service_charge: cart.serviceCharge || 0,
        total: cart.total,
        note: cart.note || '',
        status: 'paid',
        payment_method: METHODS[selectedMethod].name,
        payment_id: txnId
      }).select().single();

      if (orderErr) {
        alert('Error placing order: ' + orderErr.message);
        setProcessing(false);
        return;
      }

      const orderId = orderData.id;

      const itemsToInsert = cart.items.map(item => ({
        order_id: orderId,
        product_id: parseInt(item.id) || null,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        customization: item.customization || null
      }));
      await supabase.from('order_items').insert(itemsToInsert);

      await supabase.from('payments').insert({
        txn_id: txnId,
        invoice_num: invoiceNum,
        order_id: orderId,
        table_id: cart.tableNum || null,
        amount: cart.total,
        method: METHODS[selectedMethod].name,
        status: 'paid'
      });

      if (cart.tableNum) {
        await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', cart.tableNum);
      }

      localStorage.removeItem('ca_pending_cart');
      localStorage.setItem('ca_last_order_id', String(orderId));

      setConfirmedOrder({
        id: orderId,
        invoiceNum,
        paymentId: txnId,
        table: cart.tableNum,
        total: cart.total,
        paymentMethod: METHODS[selectedMethod].name,
        time: orderData.created_at
      });
      setProcessing(false);
    }, 1700);
  };

  const getQRPayload = () => {
    if (!cart) return '';
    const num = METHODS[selectedMethod].num.replace('-', '');
    const amt = cart.total;
    const ref = `CAFE-${Date.now()}`;
    
    if (selectedMethod === 'bkash') return `bkash://payment?merchant=${num}&amount=${amt}&reference=${ref}`;
    if (selectedMethod === 'nagad') return `nagad://payment?merchant=${num}&amount=${amt}&reference=${ref}`;
    if (selectedMethod === 'rocket') return `rocket://payment?merchant=${num}&amount=${amt}&reference=${ref}`;
    
    return `${METHODS[selectedMethod].name}|MERCHANT:${num}|AMOUNT:${amt}`;
  };

  const qrPayload = getQRPayload();

  if (!mounted || !cart) return null;

  return (
    <>
      <style>{`
        .main{max-width:480px;margin:0 auto;padding:24px 20px 40px;position:relative;z-index:1;}
        .sect-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:22px;margin-bottom:4px;}
        .sect-sub{font-size:13px;color:var(--muted);margin-bottom:22px;}
        .amount-card{background:var(--card);border:1px solid var(--border-h);border-radius:16px;padding:20px 22px;margin-bottom:20px;text-align:center;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .amount-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .amount-value{font-family:var(--font-playfair),'Playfair Display',serif;font-size:42px;color:var(--gold);font-weight:600;}
        .amount-sub{font-size:12px;color:var(--muted);margin-top:6px;}
        .method-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px;}
        .method-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;}
        .method-tab{background:var(--card);border:2px solid var(--border);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all 0.2s;}
        .method-tab:hover{border-color:var(--border-h);}
        .method-tab.active{border-color:var(--gold);background:rgba(200,148,56,0.08);}
        .method-icon{font-size:20px;margin-bottom:4px;}
        .method-name{font-size:12px;font-weight:600;color:var(--text-2);}
        .method-tab.active .method-name{color:var(--gold);}
        .method-num{font-size:10px;color:var(--muted);margin-top:2px;}
        .qr-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .qr-instruction{font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.6;}
        .qr-box{display:inline-block;background:#fff;padding:14px;border-radius:12px;margin-bottom:16px;}
        .qr-number{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--text);margin-bottom:14px;}
        .qr-number-copy{background:none;border:1px solid var(--border);border-radius:7px;padding:4px 10px;font-size:11px;color:var(--muted);cursor:pointer;transition:all 0.15s;}
        .qr-number-copy:hover{border-color:var(--gold);color:var(--gold);}
        .qr-timer{font-size:12px;color:var(--muted);}
        .qr-timer span{color:var(--gold);font-weight:600;}
        .confirm-note{background:rgba(200,148,56,0.07);border:1px solid var(--border);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:20px;}
        .confirm-note strong{color:var(--gold);}
        .processing-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:20px;}
        .processing-fill{height:100%;background:var(--gold);border-radius:2px;animation:expandBar 1.7s linear forwards;}
        @keyframes expandBar{from{width:0%;}to{width:100%;}}
        .btn-confirm{width:100%;padding:16px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;font-family:var(--font-playfair),'Playfair Display',serif;cursor:pointer;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;box-shadow:0 4px 20px rgba(200,148,56,0.25);margin-bottom:10px;}
        .btn-confirm:hover:not(:disabled){background:var(--gold-h);transform:translateY(-1px);}
        .btn-confirm:disabled{background:var(--border);cursor:not-allowed;box-shadow:none;}
        .success-screen{text-align:center;animation:fadeIn 0.5s ease;}
        .success-icon{width:80px;height:80px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success-bd);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;animation:checkPop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;}
        .success-screen h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:28px;margin-bottom:8px;}
        .success-screen p{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:24px;}
        .txn-card{background:var(--card);border:1px solid var(--border-h);border-radius:14px;padding:16px 20px;margin-bottom:24px;text-align:left;}
        .txn-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;}
        .txn-row:not(:last-child){border-bottom:1px solid var(--border);}
        .txn-row span:first-child{color:var(--muted);}
        .txn-row span:last-child{color:var(--text);font-weight:500;}
        .txn-row.highlight span:last-child{color:var(--gold);font-weight:600;}
        .btn-invoice{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-bottom:10px;}
        .btn-invoice:hover{background:var(--gold-h);}
        .btn-menu-again{width:100%;padding:12px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-menu-again:hover{border-color:var(--border-h);color:var(--text);}
        @media(max-width:600px){.main{padding:16px 16px 32px;}.steps{padding:14px 10px 0;}.step-label{display:none;}.amount-value{font-size:34px;}}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        <div className="topbar-right">
          {!confirmedOrder && <button className="back-btn" onClick={() => router.push('/checkout')}>← Review</button>}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      <div className="steps">
        <div className="step done"><div className="step-dot">✓</div><span className="step-label">Menu</span></div>
        <div className="step-line filled" />
        <div className="step done"><div className="step-dot">✓</div><span className="step-label">Review</span></div>
        <div className="step-line filled" />
        <div className={`step ${confirmedOrder ? 'done' : 'active'}`}>
          <div className="step-dot">{confirmedOrder ? '✓' : '3'}</div>
          <span className="step-label">Payment</span>
        </div>
        <div className={`step-line${confirmedOrder ? ' filled' : ''}`} />
        <div className={`step ${confirmedOrder ? 'active' : 'pending'}`}>
          <div className="step-dot">4</div>
          <span className="step-label">Confirmed</span>
        </div>
      </div>

      <div className="main">
        {!confirmedOrder ? (
          <>
            <div className="sect-title">Complete Payment</div>
            <div className="sect-sub">Scan the QR code with your mobile banking app.</div>

            <div className="amount-card">
              <div className="amount-label">Amount Due</div>
              <div className="amount-value">৳{cart.total}</div>
              {cart.tableNum && <div className="amount-sub">Table {cart.tableNum}</div>}
            </div>

            <div className="method-label">Choose Payment Method</div>
            <div className="method-tabs">
              {Object.entries(METHODS).map(([key, m]) => (
                <div key={key} className={`method-tab${selectedMethod === key ? ' active' : ''}`}
                  onClick={() => setSelectedMethod(key)}>
                  <div className="method-icon">{m.icon}</div>
                  <div className="method-name">{m.name}</div>
                  <div className="method-num">{m.num}</div>
                </div>
              ))}
            </div>


              <div className="qr-card">
                <p className="qr-instruction">
                  Scan with your <strong>{METHODS[selectedMethod].name.split(' ')[0]}</strong> app to auto-fill the number and amount.
                </p>
                <div className="qr-box">
                  <QRCodeSVG value={qrPayload} size={180} level="M" />
                </div>
                <br />
                <div className="qr-number">
                  <span>{METHODS[selectedMethod].num}</span>
                  <button className="qr-number-copy" onClick={copyNumber}>Copy</button>
                </div>
                <div className="qr-timer">QR expires in <span>{timeLeft > 0 ? fmtTime(timeLeft) : 'Expired'}</span></div>
              </div>

            <div className="confirm-note">
              After completing the payment in your app, tap <strong>Confirm Payment</strong> below to place your order and send it to the kitchen.
            </div>

            {processing && (
              <div className="processing-bar">
                <div className="processing-fill" />
              </div>
            )}

            <button className="btn-confirm" disabled={processing} onClick={confirmPayment}>
              {processing ? 'Processing…' : 'Confirm Payment →'}
            </button>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Your order has been placed and sent to the kitchen.<br />We&apos;ll have it ready for you shortly.</p>
            <div className="txn-card">
              <div className="txn-row highlight"><span>Transaction ID</span><span>{confirmedOrder.paymentId}</span></div>
              <div className="txn-row"><span>Invoice No.</span><span>{confirmedOrder.invoiceNum}</span></div>
              <div className="txn-row"><span>Order #</span><span>{confirmedOrder.id}</span></div>
              {confirmedOrder.table && <div className="txn-row"><span>Table</span><span>{confirmedOrder.table}</span></div>}
              <div className="txn-row"><span>Method</span><span>{confirmedOrder.paymentMethod}</span></div>
              <div className="txn-row"><span>Amount Paid</span><span>৳{confirmedOrder.total}</span></div>
              <div className="txn-row"><span>Time</span><span>{new Date(confirmedOrder.time).toLocaleString('en-BD', {dateStyle:'medium', timeStyle:'short'})}</span></div>
            </div>
            <button className="btn-invoice" onClick={() => router.push('/billing')}>View Invoice &amp; Receipt →</button>
            <button className="btn-menu-again" onClick={() => router.push('/order' + (confirmedOrder.table ? '?table=' + confirmedOrder.table : ''))}>
              Order More Items
            </button>
          </div>
        )}
      </div>
    </>
  );
}
