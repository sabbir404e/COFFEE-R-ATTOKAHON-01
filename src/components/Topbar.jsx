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


    </div>
  );
}
