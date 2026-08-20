'use client';

import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';

export default function TableQrCard({ tableName, qrValue, qrId, qrSize = 190 }) {
  return (
    <>
      <style>{`
        .tqc-card {
          position: relative;
          width: 100%;
          max-width: 360px;
          margin: 0 auto;
          border-radius: 24px;
          padding: 30px 20px 26px;
          text-align: center;
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        [data-theme="light"] .tqc-card {
          background: #ECE1CE;
          border: 2px solid #C49246;
          box-shadow: 0 16px 36px rgba(50, 30, 10, 0.16);
        }
        [data-theme="dark"] .tqc-card {
          background: linear-gradient(180deg, #241C14 0%, #1A130C 100%);
          border: 2px solid #C89438;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.50);
        }

        .tqc-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          z-index: 2;
          pointer-events: none;
          transition: border-color 0.3s ease;
        }
        [data-theme="light"] .tqc-corner { border-color: #C49246; }
        [data-theme="dark"] .tqc-corner { border-color: #C89438; }

        .tqc-corner.tl { top: 16px; left: 16px; border-top: 2px solid; border-left: 2px solid; }
        .tqc-corner.tr { top: 16px; right: 16px; border-top: 2px solid; border-right: 2px solid; }
        .tqc-corner.bl { bottom: 16px; left: 16px; border-bottom: 2px solid; border-left: 2px solid; }
        .tqc-corner.br { bottom: 16px; right: 16px; border-bottom: 2px solid; border-right: 2px solid; }

        .tqc-logo-wrap {
          margin: 0 auto 12px;
          display: flex;
          justify-content: center;
        }
        .tqc-logo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          object-fit: cover;
          padding: 2px;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        [data-theme="light"] .tqc-logo {
          border: 2px solid #C49246;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(160, 110, 30, 0.20);
        }
        [data-theme="dark"] .tqc-logo {
          border: 2px solid #C89438;
          background: #2A2115;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.40);
        }

        .tqc-title {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 4px;
          letter-spacing: -0.2px;
          transition: color 0.3s ease;
        }
        [data-theme="light"] .tqc-title { color: #261608; }
        [data-theme="dark"] .tqc-title { color: #EDE0C8; }

        .tqc-sub {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        [data-theme="light"] .tqc-sub { color: #9E7642; }
        [data-theme="dark"] .tqc-sub { color: #BBA880; }

        .tqc-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 auto 16px;
          width: 52%;
        }
        .tqc-divider span {
          flex: 1;
          height: 1px;
          transition: background-color 0.3s ease;
        }
        [data-theme="light"] .tqc-divider span { background: rgba(196, 146, 70, 0.40); }
        [data-theme="dark"] .tqc-divider span { background: rgba(200, 148, 56, 0.35); }

        .tqc-divider i {
          font-size: 8px;
          line-height: 1;
          font-style: normal;
          transition: color 0.3s ease;
        }
        [data-theme="light"] .tqc-divider i { color: #C49246; }
        [data-theme="dark"] .tqc-divider i { color: #C89438; }

        .tqc-badge {
          display: inline-block;
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #ffffff;
          padding: 7px 28px;
          border-radius: 50px;
          margin-bottom: 18px;
          box-shadow: 0 4px 14px rgba(160, 108, 40, 0.35);
          transition: background 0.3s ease;
        }
        [data-theme="light"] .tqc-badge { background: linear-gradient(135deg, #CF983C 0%, #A36F25 100%); }
        [data-theme="dark"] .tqc-badge { background: linear-gradient(135deg, #E0AE58 0%, #C89438 100%); color: #17110B; }

        .tqc-qr-box {
          background: #ffffff;
          border-radius: 20px;
          padding: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        [data-theme="light"] .tqc-qr-box {
          box-shadow: 0 10px 28px rgba(50, 30, 10, 0.14);
          border: 1px solid rgba(196, 146, 70, 0.20);
        }
        [data-theme="dark"] .tqc-qr-box {
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.40);
          border: 1px solid rgba(200, 148, 56, 0.30);
        }

        .tqc-scan {
          margin-top: 18px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          transition: color 0.3s ease;
        }
        [data-theme="light"] .tqc-scan { color: #9E7642; }
        [data-theme="dark"] .tqc-scan { color: #C89438; }
      `}</style>

      <div className="tqc-card">
        {/* 4 Decorative Corner L-Brackets */}
        <div className="tqc-corner tl" />
        <div className="tqc-corner tr" />
        <div className="tqc-corner bl" />
        <div className="tqc-corner br" />

        {/* Center Logo */}
        <div className="tqc-logo-wrap">
          <Image
            src="/logo.png"
            alt="Coffee-r Attokahon"
            width={70}
            height={70}
            className="tqc-logo"
          />
        </div>

        {/* Brand Title */}
        <div className="tqc-title">
          Coffee-r Attokahon
        </div>

        {/* Brand Subtitle */}
        <div className="tqc-sub">
          ARTISAN COFFEE &amp; CUISINE
        </div>

        {/* Divider */}
        <div className="tqc-divider">
          <span />
          <i>❖</i>
          <span />
        </div>

        {/* Table Badge */}
        <div>
          <div className="tqc-badge">
            {tableName}
          </div>
        </div>

        {/* White QR Container */}
        <div id={qrId} className="tqc-qr-box">
          <QRCodeCanvas
            value={qrValue}
            size={qrSize}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#261608"
            style={{ width: `${qrSize}px`, height: `${qrSize}px`, display: 'block' }}
          />
        </div>

        {/* Bottom Scan Prompt */}
        <div className="tqc-scan">
          SCAN TO VIEW MENU &amp; ORDER
        </div>
      </div>
    </>
  );
}
