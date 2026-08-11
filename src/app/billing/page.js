'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const STATUS_FLOW = ['paid','confirmed','preparing','ready','served'];
const STATUS_META = {
  paid:      { icon:'💳', label:'Received',  msg:'Your order has been received. Our staff is verifying your payment.' },
  confirmed: { icon:'✔️', label:'Verified',  msg:'Payment verified! The kitchen will start preparing your order shortly.' },
  preparing: { icon:'👨‍🍳', label:'Preparing', msg:'The kitchen is preparing your order right now. Hang tight!' },
  ready:     { icon:'✅', label:'Ready',      msg:'Your order is ready! A staff member will bring it to your table.' },
  served:    { icon:'🎉', label:'Served',     msg:'Enjoy your order! Thank you for visiting Coffee-r Attokahon.' },
  cancelled: { icon:'🚫', label:'Cancelled',  msg:'This order was cancelled — usually because the phone number or Transaction ID given could not be verified. Please speak to staff if this seems wrong.' },
};

function esc(s) { return String(s); }

const readOrders = async () => {
  try {
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: itemsData } = await supabase.from('order_items').select('*');
    if (!ordersData) return [];
    return ordersData.map(o => ({
      id: o.id, invoiceNum: o.invoice_num, table: o.table_id,
      items: (itemsData || []).filter(i => i.order_id === o.id).map(i => ({
        name: i.product_name, price: Number(i.unit_price), qty: i.quantity, emoji: '☕'
      })),
      subtotal: Number(o.subtotal), serviceCharge: Number(o.service_charge),
      total: Number(o.total), note: o.note, status: o.status,
      paymentMethod: o.payment_method, paymentId: o.payment_id, senderPhone: o.sender_phone,
      time: o.created_at
    }));
  } catch { return []; }
};

export default function BillingPage() {
  const router = useRouter();
  const { toggleTheme, orders: appOrders } = useApp();
  const [order, setOrder] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [liveStatus, setLiveStatus] = useState(null);
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [fbError, setFbError] = useState(false);
  
  // State for cancelled order fixing
  const [fixPhone, setFixPhone] = useState('');
  const [fixTxnId, setFixTxnId] = useState('');
  const [fixPhoneError, setFixPhoneError] = useState(false);
  const [fixTxnIdError, setFixTxnIdError] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);

  const loadOrder = useCallback(async () => {
    const lastId = parseInt(localStorage.getItem('ca_last_order_id'));
    const orders = await readOrders();
    if (!orders.length) return null;
    if (lastId) {
      const o = orders.find(x => x.id === lastId);
      if (o) return o;
    }
    return orders[0];
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      const o = await loadOrder();
      setOrder(o);
      if (o) {
        setLiveStatus(o.status);
        setFixPhone(o.senderPhone || '');
        setFixTxnId(o.paymentId || '');
      }
      setHydrated(true);
    })();
    return () => { active = false; };
  }, [loadOrder]);

  // Real-time WebSocket subscription + 1s polling fallback for instant order status updates (<50ms)
  useEffect(() => {
    if (!order?.id) return;

    // Listen directly via Supabase Realtime channel
    const channel = supabase
      .channel(`rt_billing_order_${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        ({ new: updated }) => {
          if (updated && updated.status) {
            setLiveStatus(updated.status);
            setOrder(prev => (prev ? { ...prev, status: updated.status } : prev));
          }
        }
      )
      .subscribe();

    // Fast polling fallback (every 1 second)
    const iv = setInterval(async () => {
      try {
        const { data } = await supabase.from('orders').select('status').eq('id', order.id).single();
        if (data && data.status) {
          setLiveStatus(data.status);
          setOrder(prev => (prev ? { ...prev, status: data.status } : prev));
        }
      } catch {}
    }, 1000);

    return () => {
      channel.unsubscribe();
      clearInterval(iv);
    };
  }, [order?.id]);

  // Sync from AppContext global realtime orders list if available
  useEffect(() => {
    if (!order?.id || !appOrders?.length) return;
    const found = appOrders.find(o => String(o.id) === String(order.id));
    if (found && found.status && found.status !== liveStatus) {
      setLiveStatus(found.status);
      setOrder(prev => (prev ? { ...prev, status: found.status } : prev));
    }
  }, [appOrders, order?.id, liveStatus]);

  useEffect(() => {
    let handle;
    if (liveStatus === 'served' && order && order.id) {
      if (!localStorage.getItem(`ca_feedback_shown_${order.id}`)) {
        handle = requestAnimationFrame(() => {
          setShowFeedback(true);
          localStorage.setItem(`ca_feedback_shown_${order.id}`, 'true');
        });
      }
    }
    return () => {
      if (handle) cancelAnimationFrame(handle);
    };
  }, [liveStatus, order]);

  if (!hydrated) return null;

  const currentStatus = STATUS_FLOW.includes(liveStatus) ? liveStatus : (liveStatus === 'cancelled' ? 'cancelled' : 'paid');
  const isCancelled = currentStatus === 'cancelled';
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const progressPct = currentIdx <= 0 ? 0 : Math.round((currentIdx / (STATUS_FLOW.length - 1)) * 100);
  const meta = STATUS_META[currentStatus] || STATUS_META.paid;
  const msgClass = currentStatus === 'ready' ? 'ready' : currentStatus === 'served' ? 'served' : isCancelled ? 'cancelled' : '';
  
  const elapsedSince = (ms) => {
    const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 minute ago';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  };

  const copyFixNumber = () => {
    navigator.clipboard.writeText('01995883215').catch(()=>{});
    const btn = document.getElementById('fixCopyBtn');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    }
  };

  const resubmitPaymentDetails = () => {
    const phone = fixPhone.trim();
    const txnId = fixTxnId.trim().toUpperCase();

    let hasError = false;
    if (!/^01[0-9]{9}$/.test(phone)) {
      setFixPhoneError(true);
      hasError = true;
    }
    if (!/^[A-Za-z0-9]{6,20}$/.test(txnId)) {
      setFixTxnIdError(true);
      hasError = true;
    }
    if (hasError) return;

    setIsFixing(true);
    setFixProgress(0);

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      setFixProgress(progress);
      if (progress >= 100) clearInterval(progressInterval);
    }, 30);

    setTimeout(async () => {
      // Update Supabase order
      await supabase.from('orders').update({
        status: 'paid',
        payment_id: txnId,
        sender_phone: phone,
      }).eq('id', order.id);

      setOrder(prev => ({ ...prev, status: 'paid', paymentId: txnId, senderPhone: phone }));
      setLiveStatus('paid');
      setIsFixing(false);
      setFixProgress(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 900);
  };

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
          --x-bg:rgba(80,80,80,0.18);--x-bd:rgba(80,80,80,0.30);--x-tx:#AAAAAA;
        }
        [data-theme="light"]{
          --bg:#F0E8D8;--bg2:#E8DEC8;--card:#FAF4E8;
          --border:rgba(160,108,40,0.20);--border-h:rgba(160,108,40,0.48);
          --gold:#A06C28;--gold-h:#8A5A18;
          --text:#2E1C08;--text2:#5C4020;--muted:#9A7850;
          --shadow:0 4px 24px rgba(100,60,10,0.10);--pill-bg:rgba(160,108,40,0.12);
          --success-bg:rgba(30,100,60,0.10);--success-bd:rgba(30,100,60,0.25);--success-tx:#1A6B3A;
          --x-bg:rgba(60,60,60,0.10);--x-bd:rgba(60,60,60,0.20);--x-tx:#666666;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:var(--tt);}
        button{font-family:'Outfit',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--bg2);}::-webkit-scrollbar-thumb{background:var(--border-h);border-radius:4px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
        .glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(200,148,56,0.09) 0%,transparent 65%);z-index:0;}

        /* TOPBAR */
        .topbar{background:var(--card);border-bottom:1px solid var(--border);height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:var(--shadow);transition:var(--tt);}
        .brand{font-family:'Playfair Display',serif;font-size:20px;display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);}
        .brand-logo{width:52px;height:52px;object-fit:cover;border-radius:50%;border:2px solid var(--gold);background:var(--bg2);flex-shrink:0;box-shadow:0 2px 10px rgba(200,148,56,0.35);transition:transform 0.3s ease;}
        .brand:hover .brand-logo{transform:scale(1.08) rotate(-3deg);border-color:var(--gold-h);}
        .brand em{color:var(--gold);font-style:normal;}
        .topbar-right{display:flex;align-items:center;gap:8px;}
        .theme-toggle{width:38px;height:20px;background:var(--border-h);border-radius:10px;border:none;cursor:pointer;position:relative;}
        .theme-toggle::after{content:'';position:absolute;width:14px;height:14px;background:var(--card);border-radius:50%;top:3px;left:3px;transition:transform 0.3s;}
        [data-theme="light"] .theme-toggle::after{transform:translateX(18px);}
        .icon-btn{background:none;border:1px solid var(--border);border-radius:9px;padding:6px 13px;font-size:12px;color:var(--muted);cursor:pointer;transition:all 0.2s;}
        .icon-btn:hover{border-color:var(--border-h);color:var(--text);}

        .main{max-width:560px;margin:0 auto;padding:24px 20px 48px;position:relative;z-index:1;}

        .paid-banner{display:flex;align-items:center;justify-content:center;gap:10px;background:var(--success-bg);border:1px solid var(--success-bd);border-radius:14px;padding:14px 20px;margin-bottom:24px;animation:fadeIn 0.4s ease;}
        .paid-check{width:32px;height:32px;border-radius:50%;background:var(--success-bd);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
        .paid-banner-text h4{font-size:15px;font-weight:600;color:var(--success-tx);}
        .paid-banner-text p{font-size:12px;color:var(--muted);margin-top:2px;}

        .invoice{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);animation:fadeIn 0.4s 0.1s ease both;}
        .invoice-head{padding:24px 24px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;}
        .inv-brand .logo{font-family:'Playfair Display',serif;font-size:22px;}
        .inv-brand .logo em{color:var(--gold);font-style:normal;}
        .inv-brand{display:flex;align-items:center;gap:10px;}
        .inv-logo-img{width:52px;height:52px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 2px 10px rgba(200,148,56,0.35));}
        .inv-brand .tagline{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-top:4px;}
        .inv-meta{text-align:right;}
        .inv-meta .inv-num{font-family:'Playfair Display',serif;font-size:16px;color:var(--gold);}
        .inv-meta .inv-date{font-size:11px;color:var(--muted);margin-top:4px;}
        .inv-meta .inv-status{display:inline-block;background:var(--success-bg);border:1px solid var(--success-bd);border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;color:var(--success-tx);text-transform:uppercase;letter-spacing:1px;margin-top:6px;}

        .invoice-info{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--border);}
        .inv-info-cell{padding:14px 20px;border-right:1px solid var(--border);}
        .inv-info-cell:last-child{border-right:none;}
        .inv-info-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:4px;}
        .inv-info-value{font-size:13px;font-weight:500;color:var(--text2);}

        .inv-items{padding:0;}
        .inv-items-head{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:10px 20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);}
        .inv-item-row{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:12px 20px;border-bottom:1px solid rgba(200,148,56,0.07);align-items:center;}
        .inv-item-row:last-child{border-bottom:none;}
        .inv-item-name{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);}
        .inv-item-emoji{font-size:16px;width:20px;height:20px;}
        .inv-item-col{font-size:13px;text-align:right;color:var(--text2);}
        .inv-item-col.price{color:var(--muted);}
        .inv-item-col.subtotal{color:var(--text);font-weight:500;}

        .invoice-totals{padding:16px 20px;border-top:1px solid var(--border);background:var(--bg2);}
        .tot-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);padding:5px 0;}
        .tot-row span:last-child{color:var(--text2);}
        .tot-row.grand{font-size:17px;font-weight:700;border-top:1px solid var(--border);margin-top:8px;padding-top:12px;}
        .tot-row.grand span:first-child{color:var(--text);}
        .tot-row.grand span:last-child{color:var(--gold);font-size:20px;}

        .invoice-payment{padding:16px 20px;border-top:1px solid var(--border);}
        .pay-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:4px 0;color:var(--muted);}
        .pay-row span:last-child{color:var(--text2);font-weight:500;}
        .pay-row.txn span:last-child{color:var(--gold);font-family:monospace;font-size:12px;}

        .invoice-note{padding:12px 20px;border-top:1px solid var(--border);background:rgba(200,148,56,0.04);}
        .note-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px;}
        .note-text{font-size:13px;color:var(--text2);font-style:italic;}

        .invoice-footer{padding:18px 20px;border-top:1px solid var(--border);text-align:center;}
        .inv-footer-thanks{font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--gold);margin-bottom:4px;}
        .inv-footer-sub{font-size:11px;color:var(--muted);}

        .action-row{display:flex;gap:10px;margin-top:20px;animation:fadeIn 0.4s 0.2s ease both;}
        .btn-print{flex:1;padding:13px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-print:hover{background:var(--gold-h);}
        .btn-order-more{flex:1;padding:13px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-order-more:hover{border-color:var(--border-h);color:var(--text);}

        .empty-state{text-align:center;padding:60px 20px;color:var(--muted);}
        .empty-state h3{font-family:'Playfair Display',serif;font-size:22px;color:var(--text2);margin-bottom:10px;}

        /* LIVE STATUS TRACKER */
        .tracker-card{
          position:relative; background:linear-gradient(180deg, var(--card) 0%, var(--bg2) 100%);
          border:1px solid var(--border); border-radius:20px;padding:26px 24px 24px;margin-bottom:20px;
          box-shadow:0 10px 34px rgba(0,0,0,0.14); animation:fadeIn 0.4s ease; overflow:hidden;
        }
        .tracker-card::before{
          content:'';position:absolute;top:0;left:0;right:0;height:3px;
          background:linear-gradient(90deg, var(--gold), #E8C87E, var(--gold)); background-size:200% 100%;
          animation:trackerShimmer 3s linear infinite;
        }
        @keyframes trackerShimmer{0%{background-position:0% 0;}100%{background-position:-200% 0;}}
        .tracker-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px;}
        .tracker-head-left{display:flex;align-items:center;gap:12px;}
        .tracker-icon-badge{
          width:42px;height:42px;border-radius:13px;flex-shrink:0;
          background:linear-gradient(145deg, var(--gold), #B57E2E);
          display:flex;align-items:center;justify-content:center;font-size:19px;
          box-shadow:0 4px 12px rgba(200,148,56,0.35);
        }
        .tracker-title{font-family:'Playfair Display',serif;font-size:18px;color:var(--text);margin-bottom:2px;}
        .tracker-sub{font-size:11.5px;color:var(--muted);}
        .tracker-live-pill{
          display:flex;align-items:center;gap:6px;flex-shrink:0;
          background:var(--bg2);border:1px solid var(--border);
          border-radius:999px;padding:5px 11px 5px 9px;font-size:10.5px;
          font-weight:600;color:var(--text2);letter-spacing:0.3px;text-transform:uppercase;
        }
        .refresh-dot{width:6px;height:6px;border-radius:50%;background:#4ADE80;animation:tpulse 1.8s ease-in-out infinite;flex-shrink:0;}

        .tracker-steps{display:flex;align-items:flex-start;justify-content:space-between;position:relative;padding:0 4px;}
        .tracker-steps::before{content:'';position:absolute;top:19px;left:23px;right:23px;height:3px;border-radius:2px;background:var(--border);z-index:0;}
        .tracker-progress{position:absolute;top:19px;left:23px;height:3px;border-radius:2px;background:linear-gradient(90deg, var(--gold), #E8C87E);z-index:1;transition:width 0.7s cubic-bezier(0.16,1,0.3,1);}
        .t-step{display:flex;flex-direction:column;align-items:center;gap:9px;position:relative;z-index:2;flex:1;}
        .t-dot{
          width:38px;height:38px;border-radius:50%;border:2.5px solid var(--border);
          background:var(--bg);display:flex;align-items:center;justify-content:center;
          font-size:15px;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);flex-shrink:0;
        }
        .t-step.done .t-dot{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 3px 10px rgba(200,148,56,0.3);}
        .t-step.active .t-dot{
          background:linear-gradient(145deg, var(--gold), #B57E2E);border-color:var(--gold);color:#fff;
          box-shadow:0 0 0 6px rgba(200,148,56,0.16),0 4px 14px rgba(200,148,56,0.35);
          animation:tpulseScale 1.8s ease-in-out infinite;transform:scale(1.08);
        }
        .t-step.pending .t-dot{background:var(--bg2);border-color:var(--border);color:var(--muted);}
        @keyframes tpulseScale{0%,100%{box-shadow:0 0 0 6px rgba(200,148,56,0.16),0 4px 14px rgba(200,148,56,0.35);}50%{box-shadow:0 0 0 11px rgba(200,148,56,0.06),0 4px 14px rgba(200,148,56,0.35);}}
        @keyframes tpulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
        .t-label{font-size:10.5px;font-weight:700;text-align:center;color:var(--muted);text-transform:uppercase;letter-spacing:0.7px;line-height:1.3;transition:color 0.3s;}
        .t-step.done .t-label,.t-step.active .t-label{color:var(--text);}

        .tracker-msg{
          margin-top:22px;padding:14px 16px;border-radius:14px;
          display:flex;align-items:center;gap:12px;
          background:var(--bg2);border:1px solid var(--border);
          transition:all 0.4s;
        }
        .tracker-msg-icon{
          width:34px;height:34px;border-radius:10px;flex-shrink:0;
          background:rgba(200,148,56,0.14);display:flex;align-items:center;justify-content:center;font-size:16px;
        }
        .tracker-msg-text{font-size:12.5px;line-height:1.55;color:var(--text2);}
        .tracker-msg.ready{background:var(--success-bg);border-color:var(--success-bd);}
        .tracker-msg.ready .tracker-msg-icon{background:rgba(74,222,128,0.18);}
        .tracker-msg.ready .tracker-msg-text{color:var(--success-tx);}
        .tracker-msg.served{background:var(--x-bg);border-color:var(--x-bd);}
        .tracker-msg.served .tracker-msg-icon{background:rgba(200,148,56,0.2);}
        .tracker-msg.served .tracker-msg-text{color:var(--x-tx);}
        .tracker-msg.cancelled{background:rgba(192,64,64,0.12);border-color:rgba(192,64,64,0.28);}
        .tracker-msg.cancelled .tracker-msg-icon{background:rgba(192,64,64,0.2);}
        .tracker-msg.cancelled .tracker-msg-text{color:#E08080;}

        .tracker-elapsed{margin-top:14px;text-align:center;font-size:10.5px;color:var(--muted);letter-spacing:0.3px;}

        /* Fix payment details */
        .fix-payment-card{background:var(--card);border:1px solid rgba(192,64,64,0.28);border-radius:16px;padding:22px;margin-bottom:20px;animation:fadeIn 0.4s ease;}
        .fix-payment-title{font-family:'Playfair Display',serif;font-size:17px;color:var(--text);margin-bottom:6px;}
        .fix-payment-sub{font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:16px;}
        .fix-merchant-num{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:11px 16px;display:inline-flex;align-items:center;gap:12px;font-size:14px;font-weight:700;letter-spacing:0.5px;color:var(--text);margin-bottom:18px;}
        .fix-num-copy{background:none;border:1px solid var(--border);border-radius:7px;padding:5px 12px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:border-color 0.15s,color 0.15s;}
        .fix-num-copy:hover{border-color:var(--gold);color:var(--gold);}
        .fix-field{margin-bottom:16px;}
        .fix-field:last-of-type{margin-bottom:0;}
        .fix-field-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:8px;}
        .fix-input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:14px;font-family:monospace;letter-spacing:0.5px;transition:border-color 0.2s;}
        .fix-input:focus{outline:none;border-color:var(--gold);}
        .fix-input.error{border-color:#F87171;}
        .fix-error-msg{font-size:11.5px;color:#F87171;margin-top:6px;display:block;}
        .fix-processing-bar{height:3px;border-radius:2px;background:var(--border);overflow:hidden;margin:18px 0 0;}
        .fix-processing-fill{height:100%;width:0%;background:var(--gold);}
        .btn-fix-resubmit{width:100%;padding:15px;margin-top:18px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;transition:background 0.2s;}
        .btn-fix-resubmit:hover{background:var(--gold-h);}
        .btn-fix-resubmit:disabled{background:var(--border);cursor:not-allowed;}

        /* FEEDBACK POPUP */
        .fb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;animation:fadeIn 0.3s;}
        .fb-modal{background:var(--card);border:1px solid var(--border-h);border-radius:18px;padding:30px 26px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.35);animation:fadeIn 0.35s ease;}
        .fb-modal-icon{font-size:38px;margin-bottom:10px;}
        .fb-modal h3{font-family:'Playfair Display',serif;font-size:21px;color:var(--text);margin-bottom:6px;}
        .fb-modal p{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:18px;}
        .fb-modal .star-row{display:flex;justify-content:center;gap:8px;margin-bottom:14px;}
        .fb-modal .star-btn{background:none;border:none;font-size:30px;line-height:1;cursor:pointer;color:var(--border-h);transition:transform 0.15s,color 0.15s;padding:0;}
        .fb-modal .star-btn:hover{transform:scale(1.15);}
        .fb-modal .star-btn.on{color:var(--gold);}
        .fb-modal .fb-comment{width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:11px 12px;font-size:13.5px;color:var(--text);outline:none;resize:vertical;min-height:60px;font-family:'Outfit',sans-serif;margin-bottom:8px;}
        .fb-modal .fb-comment:focus{border-color:var(--gold);}
        .fb-error-msg{font-size:11.5px;color:#F87171;margin-bottom:8px;display:block;text-align:left;}
        .btn-fb-submit{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-bottom:10px;}
        .btn-fb-submit:hover{background:var(--gold-h);}
        .fb-skip{width:100%;background:none;border:none;color:var(--muted);font-size:12.5px;cursor:pointer;padding:4px;transition:color 0.15s;}
        .fb-skip:hover{color:var(--text);}

        @media print {
          .glow, .topbar, .action-row, .paid-banner, .tracker-card, .fix-payment-card, .fb-overlay { display: none !important; }
          @page { margin: 12mm 14mm; size: A4; }
          html, body { background: #fff !important; color: #000 !important; font-size: 11px !important; }
          .main { padding: 0 !important; max-width: 100% !important; }
          [data-theme="dark"], [data-theme="light"] {
            --card: #fff; --bg: #fff; --bg2: #f5f5f5; --text: #111; --text2: #333; --muted: #666; --border: #ddd;
            --gold: #7A5C10; --success-bg: #e8f5e9; --success-bd: #a5d6a7; --success-tx: #2e7d32;
          }
          .invoice { border: 1px solid #ccc !important; box-shadow: none !important; border-radius: 6px !important; }
          .invoice-head        { padding: 10px 14px !important; }
          .inv-brand .logo     { font-size: 16px !important; }
          .inv-meta .inv-num   { font-size: 13px !important; }
          .inv-meta .inv-date  { font-size: 10px !important; }
          .invoice-info         { grid-template-columns: repeat(3, 1fr) !important; }
          .inv-info-cell        { padding: 7px 12px !important; }
          .inv-info-label       { font-size: 9px !important; }
          .inv-info-value       { font-size: 11px !important; }
          .inv-items-head, .inv-item-row { padding: 6px 14px !important; }
          .inv-items-head       { font-size: 9px !important; }
          .inv-item-row         { font-size: 11px !important; }
          .inv-item-emoji       { font-size: 13px !important; width: 16px !important; height: 16px !important; }
          .invoice-totals       { padding: 8px 14px !important; }
          .tot-row              { font-size: 11px !important; padding: 3px 0 !important; }
          .tot-row.grand        { font-size: 14px !important; }
          .tot-row.grand span:last-child { font-size: 16px !important; }
          .invoice-payment      { padding: 8px 14px !important; }
          .pay-row              { font-size: 11px !important; }
          .invoice-note         { padding: 7px 14px !important; }
          .note-text            { font-size: 11px !important; }
          .invoice-footer       { padding: 10px 14px !important; }
          .inv-footer-thanks    { font-size: 14px !important; }
          .inv-footer-sub       { font-size: 10px !important; }
        }
        .brand-text{white-space:nowrap;}
        @media(max-width:600px){
          .main{padding:14px 12px 32px;}
          .invoice-info{grid-template-columns:repeat(2,1fr);}
          .inv-info-cell:nth-child(2){border-right:none;}
          .inv-info-cell:last-child{grid-column:1/-1;border-top:1px solid var(--border);border-right:none;}
          .inv-items-head,.inv-item-row{grid-template-columns:1fr auto auto auto;gap:8px;padding:12px 14px;}
          .inv-item-name{font-size:12px;}
          .inv-item-col{font-size:12px;}
          .action-row{flex-direction:column;}
          .invoice-head{flex-direction:column;gap:14px;}
          .inv-meta{text-align:left;}
        }
        @media(max-width:500px){
          .tracker-card{padding:20px 14px 20px;}
          .tracker-steps::before{top:16px;left:18px;right:18px;}
          .tracker-progress{
            top:16px !important;
            left:18px !important;
            width:calc(var(--progress-pct) - 36px) !important;
          }
          .t-step{gap:6px;}
          .t-dot{width:32px;height:32px;font-size:13px;}
          .t-label{font-size:8.5px;letter-spacing:0;font-weight:600;}
        }
        @media(max-width:480px){
          .topbar{padding:0 12px;height:56px;}
          .brand{font-size:16px;gap:8px;}
          .brand-logo{width:38px;height:38px;}
          .print-text{display:none;}
          .topbar .icon-btn{padding:6px 10px;font-size:14px;}
        }
      `}</style>

      {showFeedback && (
        <div className="fb-overlay">
          <div className="fb-modal">
            <div className="fb-modal-icon">🎉</div>
            <h3>Order Served!</h3>
            <p>We&apos;d love to know how it went. Rate your experience below.</p>
            <div className="star-row">
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`star-btn ${n <= rating ? 'on' : ''}`} onClick={() => { setRating(n); setFbError(false); }}>★</button>
              ))}
            </div>
            <textarea 
              className="fb-comment"
              placeholder="Optional comment..." 
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
            />
            {fbError && <div className="fb-error-msg">Please select a star rating first.</div>}
            <button className="btn-fb-submit" onClick={async () => {
              if (!rating) {
                setFbError(true);
                return;
              }
              if (order) {
                await supabase.from('feedback').insert({
                  order_id: order.id,
                  table_id: order.table || null,
                  rating,
                  comment: feedbackText
                });
              }
              setShowFeedback(false);
            }}>Submit Feedback</button>
            <button className="fb-skip" onClick={() => setShowFeedback(false)}>Skip for now</button>
          </div>
        </div>
      )}

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand">
          <img className="brand-logo" src="/logo.png" alt="" />
          <span className="brand-text"><em>Coffee-r</em> Attokahon</span>
        </Link>
        <div className="topbar-right">
          <button className="icon-btn" onClick={() => window.print()}>🖨 <span className="print-text">Print</span></button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      <div className="main">
        {!order ? (
          <div className="empty-state">
            <div style={{fontSize:'48px',marginBottom:'14px'}}>📄</div>
            <h3>No invoice found</h3>
            <p style={{marginTop:'8px',fontSize:'14px',marginBottom:'24px'}}>Complete a payment first to see your invoice.</p>
            <button onClick={() => router.push('/order')} style={{padding:'12px 28px',background:'var(--gold)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>Go to Menu</button>
          </div>
        ) : (() => {
          const date = new Date(order.time);
          const dateStr = date.toLocaleDateString('en-BD', {year:'numeric',month:'long',day:'numeric'});
          const timeStr = date.toLocaleTimeString('en-BD', {hour:'2-digit',minute:'2-digit'});
          const subtotal = order.subtotal || order.items.reduce((s,i)=>s+i.price*i.qty,0);
          const service = order.serviceCharge || 0;
          const placedMs = order.time ? new Date(order.time).getTime() : null;

          return (
            <>
              {isCancelled ? (
                <>
                  <div className="tracker-card" id="trackerCard">
                    <div className="tracker-head">
                      <div className="tracker-head-left">
                        <div className="tracker-icon-badge">📍</div>
                        <div>
                          <div className="tracker-title">Live Order Status</div>
                          <div className="tracker-sub">Updates automatically, no refresh needed</div>
                        </div>
                      </div>
                      <div className="tracker-live-pill"><div className="refresh-dot"></div>Live</div>
                    </div>
                    <div>
                      <div className="tracker-msg cancelled">
                        <div className="tracker-msg-icon">{meta.icon}</div>
                        <div className="tracker-msg-text">{meta.msg}</div>
                      </div>
                      {placedMs && <div className="tracker-elapsed">Placed {elapsedSince(placedMs)}</div>}
                    </div>
                  </div>
                  
                  <div className="fix-payment-card" id="fixPaymentCard">
                    <div className="fix-payment-title">Resend Payment Details</div>
                    <p className="fix-payment-sub">Re-enter the correct phone number and Transaction ID, then resubmit — your order will be sent back to the kitchen.</p>
                    <div className="fix-merchant-num">
                      <span id="fixMerchantNum">01995883215</span>
                      <button className="fix-num-copy" id="fixCopyBtn" onClick={copyFixNumber}>Copy</button>
                    </div>
                    <div className="fix-field">
                      <div className="fix-field-label">Your Phone Number</div>
                      <input className={`fix-input ${fixPhoneError ? 'error' : ''}`} type="tel" placeholder="e.g. 01712345678" autoComplete="off" 
                        value={fixPhone} onChange={e => { setFixPhone(e.target.value); setFixPhoneError(false); }} disabled={isFixing} />
                      {fixPhoneError && <div className="fix-error-msg">Enter the 11-digit number you sent the payment from.</div>}
                    </div>
                    <div className="fix-field">
                      <div className="fix-field-label">Transaction ID</div>
                      <input className={`fix-input ${fixTxnIdError ? 'error' : ''}`} type="text" placeholder="e.g. 8N7K2P1QZX" autoComplete="off" 
                        value={fixTxnId} onChange={e => { setFixTxnId(e.target.value); setFixTxnIdError(false); }} disabled={isFixing} />
                      {fixTxnIdError && <div className="fix-error-msg">Enter the Transaction ID from your payment confirmation SMS.</div>}
                    </div>
                    {isFixing && <div className="fix-processing-bar"><div className="fix-processing-fill" style={{width: `${fixProgress}%`}}></div></div>}
                    <button className="btn-fix-resubmit" disabled={isFixing} onClick={resubmitPaymentDetails}>
                      {isFixing ? 'Updating…' : 'Resubmit & Send to Kitchen →'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="paid-banner">
                    <div className="paid-check">✓</div>
                    <div className="paid-banner-text">
                      <h4>Payment Confirmed — Order #{order.id}</h4>
                      <p>Your order has been sent to the kitchen.</p>
                    </div>
                  </div>

                  <div className="tracker-card" id="trackerCard">
                    <div className="tracker-head">
                      <div className="tracker-head-left">
                        <div className="tracker-icon-badge">📍</div>
                        <div>
                          <div className="tracker-title">Live Order Status</div>
                          <div className="tracker-sub">Updates automatically, no refresh needed</div>
                        </div>
                      </div>
                      <div className="tracker-live-pill"><div className="refresh-dot"></div>Live</div>
                    </div>
                    <div>
                      <div className="tracker-steps">
                        <div className="tracker-progress" style={{width:`calc(${progressPct}% - 46px)`, '--progress-pct': `${progressPct}%`}}></div>
                        {STATUS_FLOW.map((s, i) => {
                          const sm = STATUS_META[s];
                          let cls = 'pending';
                          if (i < currentIdx) cls = 'done';
                          else if (i === currentIdx) cls = 'active';
                          const dotContent = i < currentIdx ? '✓' : sm.icon;
                          return (
                            <div className={`t-step ${cls}`} key={s}>
                              <div className="t-dot">{dotContent}</div>
                              <div className="t-label">{sm.label}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className={`tracker-msg ${msgClass}`}>
                        <div className="tracker-msg-icon">{meta.icon}</div>
                        <div className="tracker-msg-text">{meta.msg}</div>
                      </div>
                      {placedMs && <div className="tracker-elapsed">Placed {elapsedSince(placedMs)}</div>}
                    </div>
                  </div>
                </>
              )}

              <div className="invoice">
                <div className="invoice-head">
                  <div className="inv-brand">
                    <img className="inv-logo-img" src="/logo.png" alt="" />
                    <div>
                      <div className="logo"><em>Coffee-r</em> Attokahon</div>
                      <div className="tagline">Artisan Coffee &amp; Cuisine</div>
                    </div>
                  </div>
                  <div className="inv-meta">
                    <div className="inv-num">{esc(order.invoiceNum || 'INV-' + order.id)}</div>
                    <div className="inv-date">{dateStr} · {timeStr}</div>
                    <div className={`inv-status ${isCancelled ? 'failed' : ''}`} style={isCancelled ? {background: 'rgba(192,64,64,0.12)', border: '1px solid rgba(192,64,64,0.28)', color: '#E08080'} : {}}>{isCancelled ? '✗ Cancelled' : '✓ Paid'}</div>
                  </div>
                </div>

                <div className="invoice-info">
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Order No.</div>
                    <div className="inv-info-value">#{order.id}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Table</div>
                    <div className="inv-info-value">{order.table ? 'Table ' + order.table : 'Walk-in'}</div>
                  </div>
                  <div className="inv-info-cell">
                    <div className="inv-info-label">Payment</div>
                    <div className="inv-info-value">{esc(order.paymentMethod || '—')}</div>
                  </div>
                </div>

                <div className="inv-items">
                  <div className="inv-items-head">
                    <span>Item</span><span>Unit Price</span><span>Qty</span><span>Total</span>
                  </div>
                  {order.items.map((item, i) => (
                    <div className="inv-item-row" key={i}>
                      <div className="inv-item-name">
                        {item.image ? (
                          <img className="inv-item-emoji" src={item.image} alt={item.name} style={{width:'20px',height:'20px',borderRadius:'5px',objectFit:'cover'}} />
                        ) : (
                          <span className="inv-item-emoji">{esc(item.emoji||'☕')}</span>
                        )}
                        <span>{esc(item.name)}</span>
                      </div>
                      <div className="inv-item-col price">৳{item.price}</div>
                      <div className="inv-item-col">×{item.qty}</div>
                      <div className="inv-item-col subtotal">৳{item.price * item.qty}</div>
                    </div>
                  ))}
                </div>

                <div className="invoice-totals">
                  <div className="tot-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
                  {service > 0 && <div className="tot-row"><span>Service Charge (5%)</span><span>৳{service}</span></div>}
                  <div className="tot-row grand"><span>Total Paid</span><span>৳{order.total}</span></div>
                </div>

                <div className="invoice-payment">
                  <div className="pay-row txn"><span>Transaction ID</span><span>{esc(order.paymentId || '—')}</span></div>
                  {order.senderPhone && <div className="pay-row"><span>Sent From</span><span>{esc(order.senderPhone)}</span></div>}
                  <div className="pay-row"><span>Payment Status</span><span style={{color: isCancelled ? '#E08080' : 'var(--success-tx)'}}>{isCancelled ? '✗ Invalid / Cancelled' : '✓ Verified'}</span></div>
                </div>

                {order.note && (
                  <div className="invoice-note">
                    <div className="note-label">Special Instructions</div>
                    <div className="note-text">{esc(order.note)}</div>
                  </div>
                )}

                <div className="invoice-footer">
                  <div className="inv-footer-thanks">Thank you for visiting.</div>
                  <div className="inv-footer-sub">We hope to see you again soon · Coffee-r Attokahon</div>
                </div>
              </div>

              <div className="action-row">
                <button className="btn-print" onClick={() => window.print()}>🖨&nbsp; Print Invoice</button>
                <button className="btn-order-more" onClick={() => {
                  // Clear the last order ID so active order block resets for new browsing
                  try { localStorage.removeItem('ca_last_order_id'); } catch(e) {}
                  // Preserve table number
                  if (order && order.table) {
                    try { localStorage.setItem('ca_table_num', String(order.table)); } catch(e) {}
                  }
                  const activeTable = order?.table || localStorage.getItem('ca_table_num');
                  if (activeTable) {
                    router.push(`/?table=${activeTable}`);
                  } else {
                    router.push('/');
                  }
                }}>Order More Items</button>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
