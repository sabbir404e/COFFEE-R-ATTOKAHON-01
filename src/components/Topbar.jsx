'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Topbar({
  showBack = false,
  backUrl = '',
  onBackClick = null,
  showCart = false,
  onCartClick = null,
  showPrint = false,
  onPrintClick = null
}) {
  const { theme, toggleTheme, cart } = useApp();
  const router = useRouter();

  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showBack && (
          <button
            onClick={handleBack}
            className="back-btn-chevron"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1,
              outline: 'none'
            }}
          >
            ←
          </button>
        )}
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <img className="brand-logo" src="/logo.png" alt="Coffee-r Attokahon" />
          <span><em>Coffee-r</em> Attokahon</span>
        </Link>
      </div>

      <div className="topbar-right">
        {showPrint && (
          <button className="icon-btn" onClick={onPrintClick || (() => window.print())}>
            🖨 Print
          </button>
        )}



        <div className="theme-toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="theme-label" style={{ fontSize: '12px', color: 'var(--muted)' }}>🌙</span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title="Toggle theme"
          ></button>
          <span className="theme-label" style={{ fontSize: '12px', color: 'var(--muted)' }}>☀️</span>
        </div>

        {showCart && (
          <button className="cart-btn" onClick={onCartClick}>
            🛒 Cart <span className="cart-count">{cartCount}</span>
          </button>
        )}
      </div>

      <style jsx global>{`
        .topbar {
          background: var(--card);
          border-bottom: 1px solid var(--border);
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: var(--transition-theme);
          box-shadow: var(--shadow);
        }
        .brand {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .brand em {
          color: var(--gold);
          font-style: normal;
        }
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .theme-toggle {
          width: 40px;
          height: 22px;
          background: var(--border-h);
          border-radius: 11px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }
        .theme-toggle::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          background: var(--card);
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.3s, background 0.3s;
        }
        [data-theme="light"] .theme-toggle::after {
          transform: translateX(18px);
        }
        .cart-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--gold);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }
        .cart-btn:hover {
          background: var(--gold-h);
        }
        .cart-count {
          background: var(--card);
          color: var(--gold);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--border-h);
        }

        .icon-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 6px 13px;
          font-size: 12px;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          border-color: var(--border-h);
          color: var(--text);
        }
        @media (max-width: 480px) {
          .theme-label { display: none; }
        }
      `}</style>
    </div>
  );
}
