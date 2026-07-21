'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const METHODS = {
  bkash: {
    id: 'bkash',
    name: 'bKash',
    type: 'Personal / Send Money',
    number: '01712-345678',
    color: '#E2136E',
    bgColor: 'rgba(226, 19, 110, 0.08)',
    borderColor: 'rgba(226, 19, 110, 0.35)',
    accentColor: '#E2136E',
    logoSvg: (
      <img src="/bkash.png" alt="bKash" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
    ),
  },
  nagad: {
    id: 'nagad',
    name: 'Nagad',
    type: 'Personal / Send Money',
    number: '01812-345678',
    color: '#F7921E',
    bgColor: 'rgba(247, 146, 30, 0.08)',
    borderColor: 'rgba(247, 146, 30, 0.35)',
    accentColor: '#F7921E',
    logoSvg: (
      <img src="/nagad.png" alt="Nagad" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
    ),
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    type: 'Personal / Send Money',
    number: '01512-345678',
    color: '#8C3494',
    bgColor: 'rgba(140, 52, 148, 0.08)',
    borderColor: 'rgba(140, 52, 148, 0.35)',
    accentColor: '#8C3494',
    logoSvg: (
      <img src="/rocket.png" alt="Rocket" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
    ),
  },
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
  const [errors, setErrors] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const [processing, setProcessing] = useState(false);
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

  const handleCopy = (methodId, number) => {
    const cleanNum = number.replace(/-/g, '');
    navigator.clipboard.writeText(cleanNum).then(() => {
      setCopiedId(methodId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const validateForm = () => {
    const errs = {};
    const cleanPhone = senderPhone.trim();
    const cleanTxn = transactionId.trim();

    if (!cleanPhone) {
      errs.senderPhone = 'Sender mobile number is required.';
    } else if (!/^(?:\+88)?01[3-9]\d{8}$/.test(cleanPhone.replace(/\s+/g, ''))) {
      errs.senderPhone = 'Please enter a valid Bangladeshi mobile number (e.g. 01712345678).';
    }

    if (!cleanTxn) {
      errs.transactionId = 'Transaction ID is required.';
    } else if (cleanTxn.length < 4) {
      errs.transactionId = 'Transaction ID must be at least 4 characters long.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const confirmPayment = async (e) => {
    e.preventDefault();
    if (!cart) return;

    if (!validateForm()) return;

    setProcessing(true);

    const activeMethod = METHODS[selectedMethod];
    const finalTxnId = transactionId.trim().toUpperCase();
    const cleanPhone = senderPhone.trim();

    setTimeout(async () => {
      const invoiceNum = 'INV-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4);
      const paymentMethodName = `${activeMethod.name} (${cleanPhone})`;

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          invoice_num: invoiceNum,
          table_id: cart.tableNum || null,
          subtotal: cart.subtotal || cart.total,
          service_charge: cart.serviceCharge || 0,
          total: cart.total,
          note: cart.note ? `${cart.note} | Sender: ${cleanPhone}` : `Sender: ${cleanPhone}`,
          status: 'paid',
          payment_method: activeMethod.name,
          payment_id: finalTxnId,
        })
        .select()
        .single();

      if (orderErr) {
        alert('Error placing order: ' + orderErr.message);
        setProcessing(false);
        return;
      }

      const orderId = orderData.id;

      const itemsToInsert = cart.items.map((item) => ({
        order_id: orderId,
        product_id: parseInt(item.id) || null,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        customization: item.customization || null,
      }));
      await supabase.from('order_items').insert(itemsToInsert);

      await supabase.from('payments').insert({
        txn_id: finalTxnId,
        invoice_num: invoiceNum,
        order_id: orderId,
        table_id: cart.tableNum || null,
        amount: cart.total,
        method: activeMethod.name,
        status: 'paid',
      });

      if (cart.tableNum) {
        await supabase.from('dining_tables').update({ status: 'occupied' }).eq('id', cart.tableNum);
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
      setProcessing(false);
    }, 1200);
  };

  if (!mounted || !cart) return null;

  return (
    <>
      <style>{`
        .pm-main { max-width: 540px; margin: 0 auto; padding: 24px 20px 48px; position: relative; z-index: 1; }
        .pm-title { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .pm-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }

        /* Amount banner */
        .pm-amount-card {
          background: var(--card); border: 1px solid var(--border-h); border-radius: 16px;
          padding: 20px 22px; margin-bottom: 24px; text-align: center; box-shadow: var(--shadow);
          animation: fadeIn 0.4s ease;
        }
        .pm-amount-lbl { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
        .pm-amount-val { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 40px; color: var(--gold); font-weight: 700; line-height: 1.1; }
        .pm-amount-sub { font-size: 12px; color: var(--muted); margin-top: 6px; }

        /* Section headings */
        .pm-sec-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 12px; }

        /* Method Cards List */
        .pm-methods-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
        
        .pm-method-card {
          background: var(--card); border: 2px solid var(--border); border-radius: 14px;
          padding: 16px 18px; display: flex; align-items: center; justify-content: space-between;
          gap: 14px; cursor: pointer; transition: all 0.22s ease; position: relative; overflow: hidden;
        }
        .pm-method-card:hover { border-color: var(--border-h); transform: translateY(-1px); }
        
        .pm-method-card.selected {
          border-color: var(--card-accent, var(--gold));
          background: var(--card-bg, rgba(200, 148, 56, 0.06));
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .pm-card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .pm-radio-dot {
          width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;
        }
        .pm-method-card.selected .pm-radio-dot { border-color: var(--card-accent, var(--gold)); }
        .pm-radio-inner {
          width: 10px; height: 10px; border-radius: 50%; background: var(--card-accent, var(--gold));
          opacity: 0; transform: scale(0.5); transition: all 0.2s;
        }
        .pm-method-card.selected .pm-radio-inner { opacity: 1; transform: scale(1); }

        .pm-logo-box {
          width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center;
          justify-content: center; background: var(--bg2); border: 1px solid var(--border); flex-shrink: 0;
        }
        
        .pm-card-details { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .pm-brand-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pm-brand-name { font-size: 15px; font-weight: 700; color: var(--text); }
        .pm-brand-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: var(--bg2); color: var(--muted); border: 1px solid var(--border); }
        .pm-brand-num { font-family: var(--font-outfit), monospace, sans-serif; font-size: 15px; font-weight: 600; color: var(--gold); letter-spacing: 0.5px; }

        .pm-copy-btn {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 9px;
          padding: 8px 14px; font-size: 12px; font-weight: 600; color: var(--text);
          cursor: pointer; transition: all 0.18s ease; display: inline-flex; align-items: center;
          gap: 6px; flex-shrink: 0;
        }
        .pm-copy-btn:hover { border-color: var(--gold); color: var(--gold); background: var(--card); }
        .pm-copy-btn.copied { background: var(--ok); color: #fff; border-color: var(--ok); }

        /* Form section */
        .pm-form-card {
          background: var(--card); border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; box-shadow: var(--shadow); margin-bottom: 24px;
        }
        .pm-field { margin-bottom: 18px; }
        .pm-field:last-child { margin-bottom: 0; }
        .pm-label { display: block; font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .pm-label span { color: #C04040; margin-left: 3px; }
        .pm-input-wrap { position: relative; }
        .pm-input {
          width: 100%; background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px; font-size: 14px; color: var(--text);
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
          font-family: inherit;
        }
        .pm-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(200, 148, 56, 0.12); }
        .pm-input.has-err { border-color: #C04040; }
        .pm-err-msg { font-size: 11px; color: #E08080; margin-top: 5px; display: flex; align-items: center; gap: 4px; }

        .pm-hint-box {
          background: rgba(200, 148, 56, 0.06); border: 1px solid var(--border);
          border-radius: 12px; padding: 12px 16px; font-size: 12px; color: var(--muted);
          line-height: 1.5; margin-bottom: 20px;
        }
        .pm-hint-box strong { color: var(--text-2); }

        /* Submit Button */
        .pm-btn-submit {
          width: 100%; padding: 16px; background: var(--gold); color: #fff; border: none;
          border-radius: 14px; font-size: 16px; font-weight: 700;
          font-family: var(--font-playfair), 'Playfair Display', serif; cursor: pointer;
          transition: all 0.2s ease; box-shadow: 0 4px 20px rgba(200, 148, 56, 0.25);
        }
        .pm-btn-submit:hover:not(:disabled) { background: var(--gold-h); transform: translateY(-1px); }
        .pm-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

        /* Success screen */
        .pm-success-card { text-align: center; animation: fadeIn 0.5s ease; }
        .pm-success-icon {
          width: 76px; height: 76px; border-radius: 50%; background: var(--o-bg);
          border: 2px solid var(--o-bd); display: flex; align-items: center; justify-content: center;
          font-size: 34px; margin: 0 auto 18px; color: var(--o-tx);
        }
        .pm-success-card h2 { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 26px; margin-bottom: 8px; }
        .pm-success-card p { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 24px; }

        .pm-txn-details {
          background: var(--card); border: 1px solid var(--border); border-radius: 14px;
          padding: 16px 20px; margin-bottom: 24px; text-align: left;
        }
        .pm-txn-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 7px 0; }
        .pm-txn-row:not(:last-child) { border-bottom: 1px solid var(--border); }
        .pm-txn-row span:first-child { color: var(--muted); }
        .pm-txn-row span:last-child { color: var(--text); font-weight: 600; }
        .pm-txn-row.highlight span:last-child { color: var(--gold); }

        .pm-btn-primary {
          width: 100%; padding: 14px; background: var(--gold); color: #fff; border: none;
          border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.2s; margin-bottom: 10px;
        }
        .pm-btn-primary:hover { background: var(--gold-h); }

        .pm-btn-sec {
          width: 100%; padding: 12px; background: none; color: var(--muted);
          border: 1px solid var(--border); border-radius: 12px; font-size: 14px;
          cursor: pointer; transition: all 0.2s;
        }
        .pm-btn-sec:hover { border-color: var(--border-h); color: var(--text); }

        @media (max-width: 600px) {
          .pm-main { padding: 16px 16px 36px; }
          .pm-method-card { padding: 14px 14px; gap: 10px; }
          .pm-card-left { gap: 10px; }
          .pm-logo-box { width: 38px; height: 38px; }
          .pm-brand-name { font-size: 14px; }
          .pm-brand-num { font-size: 13px; }
          .pm-copy-btn { padding: 6px 10px; font-size: 11px; }
          .pm-form-card { padding: 18px; }
        }
      `}</style>

      <div className="glow" />
      
      {/* Topbar */}
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <em>Coffee-r</em> Attokahon
        </Link>
        <div className="topbar-right">
          {!confirmedOrder && (
            <button className="back-btn" onClick={() => router.push('/checkout')}>
              ← Review
            </button>
          )}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      {/* Stepper */}
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

      <div className="pm-main">
        {!confirmedOrder ? (
          <>
            <div className="pm-title">Complete Payment</div>
            <div className="pm-sub">
              Send total amount to any payment method below, then submit your transaction details.
            </div>

            {/* Total Amount Banner */}
            <div className="pm-amount-card">
              <div className="pm-amount-lbl">Total Amount Payable</div>
              <div className="pm-amount-val">৳{cart.total}</div>
              {cart.tableNum && <div className="pm-amount-sub">Dining Table #{cart.tableNum}</div>}
            </div>

            {/* Payment Methods Section */}
            <div className="pm-sec-lbl">1. Select Payment Method &amp; Copy Number</div>
            <div className="pm-methods-list">
              {Object.values(METHODS).map((m) => {
                const isSelected = selectedMethod === m.id;
                return (
                  <div
                    key={m.id}
                    className={`pm-method-card${isSelected ? ' selected' : ''}`}
                    style={{
                      '--card-accent': m.accentColor,
                      '--card-bg': m.bgColor,
                    }}
                    onClick={() => setSelectedMethod(m.id)}
                  >
                    <div className="pm-card-left">
                      <div className="pm-radio-dot">
                        <div className="pm-radio-inner" />
                      </div>
                      <div className="pm-logo-box">
                        {m.logoSvg}
                      </div>
                      <div className="pm-card-details">
                        <div className="pm-brand-row">
                          <span className="pm-brand-name">{m.name}</span>
                          <span className="pm-brand-badge">{m.type}</span>
                        </div>
                        <span className="pm-brand-num">{m.number}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`pm-copy-btn${copiedId === m.id ? ' copied' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(m.id, m.number);
                      }}
                      title="Copy phone number"
                    >
                      {copiedId === m.id ? (
                        <>✓ Copied</>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Payment Confirmation Form */}
            <div className="pm-sec-lbl">2. Payment Confirmation</div>
            <form onSubmit={confirmPayment} noValidate>
              <div className="pm-form-card">
                <div className="pm-field">
                  <label className="pm-label" htmlFor="senderPhone">
                    Sender Mobile Number <span>*</span>
                  </label>
                  <div className="pm-input-wrap">
                    <input
                      id="senderPhone"
                      type="tel"
                      className={`pm-input${errors.senderPhone ? ' has-err' : ''}`}
                      placeholder="e.g. 01712345678"
                      value={senderPhone}
                      onChange={(e) => {
                        setSenderPhone(e.target.value);
                        if (errors.senderPhone) setErrors((prev) => ({ ...prev, senderPhone: null }));
                      }}
                    />
                  </div>
                  {errors.senderPhone && (
                    <div className="pm-err-msg">
                      <span>⚠</span> {errors.senderPhone}
                    </div>
                  )}
                </div>

                <div className="pm-field">
                  <label className="pm-label" htmlFor="transactionId">
                    Transaction ID (TrxID) <span>*</span>
                  </label>
                  <div className="pm-input-wrap">
                    <input
                      id="transactionId"
                      type="text"
                      className={`pm-input${errors.transactionId ? ' has-err' : ''}`}
                      placeholder="e.g. 9J47A8KL2"
                      value={transactionId}
                      onChange={(e) => {
                        setTransactionId(e.target.value);
                        if (errors.transactionId) setErrors((prev) => ({ ...prev, transactionId: null }));
                      }}
                    />
                  </div>
                  {errors.transactionId && (
                    <div className="pm-err-msg">
                      <span>⚠</span> {errors.transactionId}
                    </div>
                  )}
                </div>
              </div>

              <div className="pm-hint-box">
                💡 Please double-check your <strong>Sender Number</strong> and <strong>Transaction ID</strong> before submitting so our staff can quickly verify your payment.
              </div>

              <button type="submit" className="pm-btn-submit" disabled={processing}>
                {processing ? 'Verifying & Placing Order…' : 'Submit & Confirm Order →'}
              </button>
            </form>
          </>
        ) : (
          /* Confirmation Success Screen */
          <div className="pm-success-card">
            <div className="pm-success-icon">✓</div>
            <h2>Payment Submitted!</h2>
            <p>Your order has been verified and sent directly to the kitchen.<br />We&apos;ll prepare your handcrafted items shortly.</p>

            <div className="pm-txn-details">
              <div className="pm-txn-row highlight">
                <span>Transaction ID</span>
                <span>{confirmedOrder.paymentId}</span>
              </div>
              <div className="pm-txn-row">
                <span>Sender Mobile</span>
                <span>{confirmedOrder.senderPhone}</span>
              </div>
              <div className="pm-txn-row">
                <span>Invoice No.</span>
                <span>{confirmedOrder.invoiceNum}</span>
              </div>
              <div className="pm-txn-row">
                <span>Order #</span>
                <span>#{confirmedOrder.id}</span>
              </div>
              {confirmedOrder.table && (
                <div className="pm-txn-row">
                  <span>Table Number</span>
                  <span>Table {confirmedOrder.table}</span>
                </div>
              )}
              <div className="pm-txn-row">
                <span>Method</span>
                <span>{confirmedOrder.paymentMethod}</span>
              </div>
              <div className="pm-txn-row">
                <span>Amount</span>
                <span>৳{confirmedOrder.total}</span>
              </div>
              <div className="pm-txn-row">
                <span>Time</span>
                <span>{new Date(confirmedOrder.time).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>

            <button className="pm-btn-primary" onClick={() => router.push('/billing')}>
              View Invoice &amp; Receipt →
            </button>
            <button
              className="pm-btn-sec"
              onClick={() => router.push('/order' + (confirmedOrder.table ? '?table=' + confirmedOrder.table : ''))}
            >
              Order More Items
            </button>
          </div>
        )}
      </div>
    </>
  );
}
