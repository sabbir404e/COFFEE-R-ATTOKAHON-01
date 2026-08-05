'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const METHODS = {
  bkash:  { name: 'bKash',  num: '01995883215' },
  nagad:  { name: 'Nagad',  num: '01995883215' },
  rocket: { name: 'Rocket', num: '01995883215' },
};

export default function PaymentPage() {
  const router = useRouter();
  const { toggleTheme } = useApp();

  const [cart, setCart] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('bkash');

  // Form fields
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [txnIdError, setTxnIdError] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
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
    });
    return () => cancelAnimationFrame(handle);
  }, [router]);

  const total = cart ? cart.total || 0 : 0;

  const copyNumber = () => {
    const num = METHODS[selectedMethod].num;
    navigator.clipboard.writeText(num).catch(() => {});
    const btn = document.getElementById('copyNumBtn');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    }
  };

  const selectMethod = (key) => {
    setSelectedMethod(key);
  };

  const validatePhone = (value) => /^01[0-9]{9}$/.test(value.trim());
  const validateTxnId = (value) => /^[A-Za-z0-9]{6,20}$/.test(value.trim());

  const confirmPayment = async () => {
    const phone = senderPhone.trim();
    const txnId = transactionId.trim().toUpperCase();

    let hasError = false;
    if (!validatePhone(phone)) {
      setPhoneError(true);
      hasError = true;
    }
    if (!validateTxnId(txnId)) {
      setTxnIdError(true);
      hasError = true;
    }
    if (hasError) return;

    setProcessing(true);
    setProgress(0);

    // Animate progress bar
    let p = 0;
    const progressInterval = setInterval(() => {
      p += 2;
      setProgress(p);
      if (p >= 100) clearInterval(progressInterval);
    }, 30);

    try {
      // Keep the progress feedback visible briefly while the payment is saved.
      await new Promise((resolve) => setTimeout(resolve, 900));

      const activeMethod = METHODS[selectedMethod];
      const finalTxnId = txnId;
      const cleanPhone = phone;
      const year = new Date().getFullYear();

      // Step 1: Insert the order without invoice_num first to get the real auto-increment ID
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          table_id: cart.tableNum || null,
          subtotal: cart.subtotal || cart.total,
          service_charge: cart.serviceCharge || 0,
          total: cart.total,
          note: cart.note || '',
          status: 'paid',
          payment_method: activeMethod.name,
          payment_id: finalTxnId,
          sender_phone: cleanPhone,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderId = orderData.id;

      // Step 2: Build serial invoice number from the real order ID — e.g. INV-2026-0001
      const invoiceNum = 'INV-' + year + '-' + String(orderId).padStart(4, '0');

      // Step 3: Update the order row with the serial invoice number
      const { error: invoiceErr } = await supabase
        .from('orders')
        .update({ invoice_num: invoiceNum })
        .eq('id', orderId);
      if (invoiceErr) throw invoiceErr;

      // Step 4: Insert order items
      const itemsToInsert = cart.items.map((item) => ({
        order_id: orderId,
        product_id: parseInt(item.id) || null,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        customization: item.customization || null,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // Step 5: Insert payment record with serial invoice number
      const { error: paymentErr } = await supabase.from('payments').insert({
        txn_id: finalTxnId,
        invoice_num: invoiceNum,
        order_id: orderId,
        table_id: cart.tableNum || null,
        amount: cart.total,
        method: activeMethod.name,
        sender_phone: cleanPhone,
        status: 'paid',
      });
      if (paymentErr) throw paymentErr;

      if (cart.tableNum) {
        const { error: tableErr } = await supabase
          .from('dining_tables')
          .update({ status: 'occupied' })
          .eq('id', cart.tableNum);
        if (tableErr) throw tableErr;
      }

      localStorage.removeItem('ca_pending_cart');
      localStorage.setItem('ca_last_order_id', String(orderId));

      setConfirmedOrder({
        id: orderId,
        invoiceNum,
        paymentId: finalTxnId,
        table: cart.tableNum,
        total: cart.total,
        paymentMethod: activeMethod.name,
        senderPhone: cleanPhone,
        time: orderData.created_at,
      });
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert(`Payment could not be saved: ${error.message}. Please try again or contact staff.`);
    } finally {
      clearInterval(progressInterval);
      setProcessing(false);
    }
  };

  if (!mounted || !cart) return null;

  return (
    <>
      <style>{`
        :root{--tt:background-color 0.3s ease,color 0.3s ease,border-color 0.3s ease;}
        [data-theme="dark"]{
          --bg:#1A1410;--bg2:#211A12;--card:#2A2115;
          --border:rgba(200,148,56,0.20);--border-h:rgba(200,148,56,0.45);
          --gold:#C89438;--gold-h:#E0AE58;
          --text:#EDE0C8;--text2:#BBA880;--muted:#8A7860;
          --shadow:0 4px 24px rgba(0,0,0,0.30);--pill-bg:rgba(200,148,56,0.13);
          --success-bg:rgba(42,114,72,0.18);--success-bd:rgba(42,114,72,0.35);--success-tx:#60C890;
        }
        [data-theme="light"]{
          --bg:#F0E8D8;--bg2:#E8DEC8;--card:#FAF4E8;
          --border:rgba(160,108,40,0.20);--border-h:rgba(160,108,40,0.48);
          --gold:#A06C28;--gold-h:#8A5A18;
          --text:#2E1C08;--text2:#5C4020;--muted:#9A7850;
          --shadow:0 4px 24px rgba(100,60,10,0.10);--pill-bg:rgba(160,108,40,0.12);
          --success-bg:rgba(30,100,60,0.10);--success-bd:rgba(30,100,60,0.25);--success-tx:#1A6B3A;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:var(--tt);}
        button{font-family:'Outfit',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--bg2);}::-webkit-scrollbar-thumb{background:var(--border-h);border-radius:4px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
        @keyframes checkPop{0%{transform:scale(0);}60%{transform:scale(1.3);}100%{transform:scale(1);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}

        .glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(200,148,56,0.09) 0%,transparent 65%);z-index:0;}

        .topbar{background:var(--card);border-bottom:1px solid var(--border);height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:var(--shadow);}
        .brand{font-family:'Playfair Display',serif;font-size:18px;display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);}
        .brand-logo{width:52px;height:52px;object-fit:cover;border-radius:50%;border:2px solid var(--gold);background:var(--bg2);flex-shrink:0;box-shadow:0 2px 10px rgba(200,148,56,0.35);transition:transform 0.3s ease;}
        .brand:hover .brand-logo{transform:scale(1.08) rotate(-3deg);border-color:var(--gold-h);}
        .brand em{color:var(--gold);font-style:normal;}
        .back-btn{background:none;border:1px solid var(--border);border-radius:9px;padding:6px 14px;font-size:13px;color:var(--muted);cursor:pointer;transition:all 0.2s;}
        .back-btn:hover{border-color:var(--border-h);color:var(--text);}
        .theme-toggle{width:38px;height:20px;background:var(--border-h);border-radius:10px;border:none;cursor:pointer;position:relative;transition:background 0.3s;}
        .theme-toggle::after{content:'';position:absolute;width:14px;height:14px;background:var(--card);border-radius:50%;top:3px;left:3px;transition:transform 0.3s;}
        [data-theme="light"] .theme-toggle::after{transform:translateX(18px);}

        .steps{display:flex;align-items:center;justify-content:center;padding:20px 20px 0;gap:0;max-width:480px;margin:0 auto;position:relative;z-index:1;}
        .step{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;}
        .step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid;flex-shrink:0;}
        .step.done .step-dot{background:var(--gold);border-color:var(--gold);color:#fff;}
        .step.active .step-dot{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 4px rgba(200,148,56,0.20);}
        .step.pending .step-dot{background:none;border-color:var(--border);color:var(--muted);}
        .step-label{color:var(--muted);white-space:nowrap;}
        .step.done .step-label,.step.active .step-label{color:var(--text2);}
        .step-line{flex:1;height:1px;background:var(--border);margin:0 6px;min-width:20px;}
        .step-line.filled{background:var(--gold);}

        .main{max-width:480px;margin:0 auto;padding:24px 20px 40px;position:relative;z-index:1;}
        .sect-title{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:4px;}
        .sect-sub{font-size:13px;color:var(--muted);margin-bottom:22px;}

        .amount-card{background:var(--card);border:1px solid var(--border-h);border-radius:16px;padding:22px;margin-bottom:20px;text-align:center;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .amount-label{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .amount-value{font-family:'Playfair Display',serif;font-size:42px;color:var(--gold);font-weight:600;letter-spacing:0.5px;}
        .amount-sub{font-size:12px;color:var(--muted);margin-top:6px;letter-spacing:0.3px;}

        .method-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px;}
        .method-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;}
        .method-tab{
          position:relative;background:var(--card);border:2px solid var(--border);border-radius:22px;
          padding:20px 10px 16px;text-align:center;cursor:pointer;
          transition:all 0.2s ease;
        }
        .method-tab:hover{border-color:var(--border-h);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
        .method-tab.active{
          border-color:var(--m-accent,var(--gold));
          background:color-mix(in srgb, var(--m-accent,var(--gold)) 10%, var(--card));
          box-shadow:0 4px 20px color-mix(in srgb, var(--m-accent,var(--gold)) 25%, transparent);
        }
        .method-tab[data-m="bkash"]{--m-accent:#e2136e;}
        .method-tab[data-m="nagad"]{--m-accent:#f6821f;}
        .method-tab[data-m="rocket"]{--m-accent:#8c3494;}
        .method-check{
          position:absolute;top:10px;right:10px;width:20px;height:20px;
          border-radius:50%;background:var(--m-accent,var(--gold));color:#fff;
          font-size:11px;font-weight:700;display:flex;align-items:center;
          justify-content:center;opacity:0;transition:all 0.2s ease;transform:scale(0.5);
        }
        .method-tab.active .method-check{opacity:1;transform:scale(1);}
        .method-badge{
          width:62px;height:62px;margin:0 auto 12px;display:flex;
          align-items:center;justify-content:center;border-radius:16px;
          background:#ffffff;padding:4px;overflow:hidden;
          box-shadow:0 4px 14px rgba(0,0,0,0.22);transition:transform 0.2s ease;
        }
        .method-tab:hover .method-badge{transform:scale(1.05);}
        .method-badge img{width:100%;height:100%;object-fit:contain;border-radius:12px;}
        .method-name{font-size:15px;font-weight:700;color:var(--text);letter-spacing:0.2px;margin-top:2px;}
        .method-num{font-size:11px;color:var(--muted);margin-top:4px;letter-spacing:0.3px;}
        .method-tab.active .method-name{color:var(--m-accent,var(--gold));}

        .txnid-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center;box-shadow:var(--shadow);animation:fadeIn 0.4s ease;}
        .txnid-instruction{font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.6;}
        .txnid-number{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:11px 18px;display:inline-flex;align-items:center;gap:12px;font-size:15px;font-weight:700;letter-spacing:0.5px;color:var(--text);margin-bottom:18px;}
        .txnid-number-copy{background:none;border:1px solid var(--border);border-radius:7px;padding:5px 12px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:border-color 0.15s,color 0.15s;}
        .txnid-number-copy:hover{border-color:var(--gold);color:var(--gold);}
        .txnid-input-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:8px;}
        .txnid-field{margin-bottom:16px;}
        .txnid-field:last-child{margin-bottom:0;}
        .txnid-input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:14px;font-family:monospace;letter-spacing:0.5px;transition:border-color 0.2s;outline:none;}
        .txnid-input:focus{border-color:var(--gold);}
        .txnid-input.error{border-color:#F87171;}
        .txnid-error-msg{font-size:11.5px;color:#F87171;margin-top:6px;text-align:left;}

        .confirm-note{background:rgba(200,148,56,0.07);border:1px solid var(--border);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px;}
        .confirm-note strong{color:var(--gold);}

        .btn-confirm{width:100%;padding:16px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;font-family:'Playfair Display',serif;letter-spacing:0.3px;cursor:pointer;transition:background 0.15s;box-shadow:0 4px 16px rgba(200,148,56,0.22);margin-bottom:10px;}
        .btn-confirm:hover{background:var(--gold-h);}
        .btn-confirm:active{filter:brightness(0.96);}
        .btn-confirm:disabled{background:var(--border);cursor:not-allowed;box-shadow:none;}

        .processing-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:20px;}
        .processing-fill{height:100%;background:var(--gold);border-radius:2px;transition:width 0.1s linear;}

        .success-screen{text-align:center;animation:fadeIn 0.5s ease;}
        .success-icon{width:80px;height:80px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success-bd);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;animation:checkPop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;}
        .success-screen h2{font-family:'Playfair Display',serif;font-size:28px;margin-bottom:8px;}
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
        <Link href="/" className="brand">
          <img className="brand-logo" src="/logo.png" alt="" />
          <em>Coffee-r</em> Attokahon
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!confirmedOrder && (
            <button className="back-btn" onClick={() => router.push('/checkout')}>← Review</button>
          )}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      {/* Steps */}
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
          <div id="payView">
            <div className="sect-title">Complete Payment</div>
            <div className="sect-sub">Send payment with your mobile banking app, then confirm with your Transaction ID.</div>

            <div className="amount-card">
              <div className="amount-label">Amount Due</div>
              <div className="amount-value">৳{total}</div>
              {cart.tableNum && <div className="amount-sub">Table {cart.tableNum}</div>}
            </div>

            <div className="method-label">Choose Payment Method</div>
            <div className="method-tabs">
              {Object.entries(METHODS).map(([key, m]) => (
                <div
                  key={key}
                  className={`method-tab${selectedMethod === key ? ' active' : ''}`}
                  data-m={key}
                  onClick={() => selectMethod(key)}
                >
                  <div className="method-check">✓</div>
                  <div className="method-badge">
                    <img src={`/${key}.png`} alt={m.name} />
                  </div>
                  <div className="method-name">{m.name}</div>
                  <div className="method-num">{m.num}</div>
                </div>
              ))}
            </div>

            <div className="txnid-card">
              <p className="txnid-instruction">
                Open <strong>{METHODS[selectedMethod].name}</strong> → Send Money to the number below → Enter ৳<span>{total}</span>
              </p>
              <div className="txnid-number">
                <span>{METHODS[selectedMethod].num}</span>
                <button className="txnid-number-copy" id="copyNumBtn" onClick={copyNumber}>Copy</button>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="txnid-field">
                  <div className="txnid-input-label">Your Phone Number</div>
                  <input
                    className={`txnid-input${phoneError ? ' error' : ''}`}
                    type="tel"
                    placeholder="e.g. 01712345678"
                    autoComplete="off"
                    value={senderPhone}
                    onChange={e => { setSenderPhone(e.target.value); setPhoneError(false); }}
                  />
                  {phoneError && <div className="txnid-error-msg">Enter the 11-digit number you sent the payment from.</div>}
                </div>
                <div className="txnid-field">
                  <div className="txnid-input-label">Transaction ID</div>
                  <input
                    className={`txnid-input${txnIdError ? ' error' : ''}`}
                    type="text"
                    placeholder="e.g. 8N7K2P1QZX"
                    autoComplete="off"
                    value={transactionId}
                    onChange={e => { setTransactionId(e.target.value); setTxnIdError(false); }}
                  />
                  {txnIdError && <div className="txnid-error-msg">Enter the Transaction ID from your payment confirmation SMS.</div>}
                </div>
              </div>
            </div>

            <div className="confirm-note">
              After sending the payment, enter the <strong>Transaction ID</strong> from your confirmation SMS above, then tap <strong>Confirm Payment</strong> to place your order and send it to the kitchen.
            </div>

            {processing && (
              <div className="processing-bar">
                <div className="processing-fill" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button className="btn-confirm" disabled={processing} onClick={confirmPayment}>
              {processing ? 'Processing…' : 'Confirm Payment →'}
            </button>
          </div>
        ) : (
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Your order has been placed and sent to the kitchen.<br />We&apos;ll have it ready for you shortly.</p>
            <div className="txn-card">
              <div className="txn-row highlight"><span>Transaction ID</span><span>{confirmedOrder.paymentId}</span></div>
              <div className="txn-row"><span>Sent From</span><span>{confirmedOrder.senderPhone || '—'}</span></div>
              <div className="txn-row"><span>Invoice No.</span><span>{confirmedOrder.invoiceNum}</span></div>
              <div className="txn-row"><span>Order #</span><span>{confirmedOrder.id}</span></div>
              {confirmedOrder.table && <div className="txn-row"><span>Table</span><span>{confirmedOrder.table}</span></div>}
              <div className="txn-row"><span>Method</span><span>{confirmedOrder.paymentMethod}</span></div>
              <div className="txn-row"><span>Amount Paid</span><span>৳{confirmedOrder.total}</span></div>
              <div className="txn-row"><span>Time</span><span>{new Date(confirmedOrder.time).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
            </div>
            <button className="btn-invoice" onClick={() => router.push('/billing')}>View Invoice &amp; Receipt →</button>
            <button className="btn-menu-again" onClick={() => router.push('/order' + (confirmedOrder.table ? '?table=' + confirmedOrder.table : ''))}>Order More Items</button>
          </div>
        )}
      </div>
    </>
  );
}
