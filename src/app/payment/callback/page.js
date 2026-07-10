'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleTheme } = useApp();

  const status = searchParams.get('status');
  const tranId = searchParams.get('tran_id');
  const amount = searchParams.get('amount');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!status || !tranId) {
      setError('Invalid callback parameters.');
      setLoading(false);
      return;
    }

    // Prevent double execution in React 18/19 StrictMode
    if (processedRef.current) return;
    processedRef.current = true;

    // Check if this order is already processed and saved
    const paidOrders = JSON.parse(localStorage.getItem('ca_paid_orders') || '[]');
    const existingOrder = paidOrders.find(o => o.paymentId === tranId);

    if (existingOrder) {
      setConfirmedOrder(existingOrder);
      setLoading(false);
      return;
    }

    if (status !== 'success') {
      setError(status === 'cancel' ? 'Payment was cancelled.' : 'Payment failed.');
      
      try {
        const cart = JSON.parse(localStorage.getItem('ca_pending_cart'));
        if (cart && cart.items && cart.items.length) {
          const pid = parseInt(localStorage.getItem('ca_pid') || '1');
          localStorage.setItem('ca_pid', String(pid + 1));
          const oid = parseInt(localStorage.getItem('ca_oid') || '1');
          localStorage.setItem('ca_oid', String(oid + 1));

          const invoiceNum = 'INV-' + new Date().getFullYear() + '-' + String(oid).padStart(4, '0');

          const order = {
            id: oid,
            invoiceNum,
            table: cart.tableNum || null,
            items: cart.items,
            subtotal: cart.subtotal || cart.total,
            serviceCharge: cart.serviceCharge || 0,
            total: cart.total,
            note: cart.note || '',
            status: status === 'cancel' ? 'cancelled' : 'failed',
            paymentMethod: 'SSLCommerz',
            paymentId: tranId || ('FAIL-' + Date.now()),
            createdAt: Date.now(),
            time: new Date().toISOString(),
          };

          paidOrders.unshift(order);
          localStorage.setItem('ca_paid_orders', JSON.stringify(paidOrders));

          const payments = JSON.parse(localStorage.getItem('ca_payments') || '[]');
          payments.unshift({
            id: pid,
            txnId: tranId || ('FAIL-' + Date.now()),
            invoiceNum,
            orderId: oid,
            table: cart.tableNum,
            amount: cart.total,
            method: 'SSLCommerz',
            status: status === 'cancel' ? 'cancelled' : 'failed',
            time: new Date().toISOString(),
          });
          localStorage.setItem('ca_payments', JSON.stringify(payments));

          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Error saving failed/cancelled order:', err);
      }

      setLoading(false);
      return;
    }

    // Verify payment with server
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/ssl-payment/verify?tran_id=${tranId}&amount=${amount}`);
        const data = await response.json();

        if (data.verified) {
          // Retrieve cart from localStorage
          const cart = JSON.parse(localStorage.getItem('ca_pending_cart'));
          if (!cart || !cart.items || !cart.items.length) {
            setError('No pending order found. The payment was verified, but the cart is empty.');
            setLoading(false);
            return;
          }

          // Generate IDs
          const pid = parseInt(localStorage.getItem('ca_pid') || '1');
          localStorage.setItem('ca_pid', String(pid + 1));
          const oid = parseInt(localStorage.getItem('ca_oid') || '1');
          localStorage.setItem('ca_oid', String(oid + 1));

          const invoiceNum = 'INV-' + new Date().getFullYear() + '-' + String(oid).padStart(4, '0');

          const order = {
            id: oid,
            invoiceNum,
            table: cart.tableNum || null,
            items: cart.items,
            subtotal: cart.subtotal || cart.total,
            serviceCharge: cart.serviceCharge || 0,
            total: cart.total,
            note: cart.note || '',
            status: 'paid',
            paymentMethod: 'SSLCommerz',
            paymentId: tranId,
            createdAt: Date.now(),
            time: new Date().toISOString(),
          };

          // Save order
          paidOrders.unshift(order);
          localStorage.setItem('ca_paid_orders', JSON.stringify(paidOrders));

          // Save payment
          const payments = JSON.parse(localStorage.getItem('ca_payments') || '[]');
          payments.unshift({
            id: pid,
            txnId: tranId,
            invoiceNum,
            orderId: oid,
            table: cart.tableNum,
            amount: cart.total,
            method: 'SSLCommerz',
            time: new Date().toISOString(),
            bankTranId: data.details?.bank_tran_id || '',
          });
          localStorage.setItem('ca_payments', JSON.stringify(payments));
          localStorage.setItem('ca_last_order_id', String(oid));
          localStorage.removeItem('ca_pending_cart');

          // Trigger same-tab synchronization check manually by raising storage event or dispatching
          window.dispatchEvent(new Event('storage'));

          setConfirmedOrder(order);
          setLoading(false);
        } else {
          setError(data.error || 'Server validation failed.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('An error occurred during verification.');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [status, tranId, amount]);

  return (
    <>
      <style>{`
        .main{max-width:480px;margin:0 auto;padding:24px 20px 40px;position:relative;z-index:1;}
        .success-screen, .loading-screen, .error-screen{text-align:center;animation:fadeIn 0.5s ease;margin-top:20px;}
        .success-icon{width:80px;height:80px;border-radius:50%;background:var(--success-bg);border:2px solid var(--success-bd);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;animation:checkPop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;}
        .error-icon{width:80px;height:80px;border-radius:50%;background:rgba(192,64,64,0.1);border:2px solid rgba(192,64,64,0.3);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;color:#C04040;}
        .spinner {width: 60px; height: 60px; border: 4px solid var(--border); border-top: 4px solid var(--gold); border-radius: 50%; margin: 40px auto 20px; animation: spin 1s linear infinite;}
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .success-screen h2, .loading-screen h2, .error-screen h2{font-family:var(--font-playfair),'Playfair Display',serif;font-size:28px;margin-bottom:8px;}
        .success-screen p, .loading-screen p, .error-screen p{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:24px;}
        .txn-card{background:var(--card);border:1px solid var(--border-h);border-radius:14px;padding:16px 20px;margin-bottom:24px;text-align:left;}
        .txn-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:5px 0;}
        .txn-row:not(:last-child){border-bottom:1px solid var(--border);}
        .txn-row span:first-child{color:var(--muted);}
        .txn-row span:last-child{color:var(--text);font-weight:500;}
        .txn-row.highlight span:last-child{color:var(--gold);font-weight:600;}
        .btn-invoice{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-bottom:10px;text-align:center;text-decoration:none;display:block;}
        .btn-invoice:hover{background:var(--gold-h);}
        .btn-menu-again{width:100%;padding:12px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s;text-align:center;text-decoration:none;display:block;}
        .btn-menu-again:hover{border-color:var(--border-h);color:var(--text);}
        .btn-retry{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;text-decoration:none;display:inline-block;}
        .btn-retry:hover{background:var(--gold-h);}
      `}</style>

      <div className="glow" />
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}><em>Coffee-r</em> Attokahon</Link>
        <div className="topbar-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
      </div>

      <div className="main">
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <h2>Verifying Payment</h2>
            <p>Please wait while we verify your transaction status with SSLCommerz. Do not close or refresh this page.</p>
          </div>
        ) : error ? (
          <div className="error-screen">
            <div className="error-icon">✗</div>
            <h2>Payment Unsuccessful</h2>
            <p>{error}</p>
            <Link href="/payment" className="btn-retry">
              Try Another Payment Method
            </Link>
          </div>
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

            <Link href="/billing" className="btn-invoice">
              View Invoice &amp; Receipt →
            </Link>
            
            <Link href={`/order${confirmedOrder.table ? '?table=' + confirmedOrder.table : ''}`} className="btn-menu-again">
              Order More Items
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--muted)' }}>
        <h2>Loading Callback...</h2>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
