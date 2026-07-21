'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '@/context/AppContext';

export default function QRPrintPage() {
  const { tables: configuredTables } = useApp();
  const [siteUrl, setSiteUrl] = useState('');
  const [generated, setGenerated] = useState(false);
  const [tables, setTables] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      if (typeof window !== 'undefined') {
        setSiteUrl(window.location.origin);
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const generateAll = () => {
    if (!siteUrl.trim()) {
      alert('Please enter your website URL first.');
      return;
    }
    let url = siteUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    url = url.replace(/\/$/, ''); // Remove trailing slash

    const list = configuredTables.map(table => ({
      num: table.id,
      link: `${url}/?table=${table.id}`
    }));
    setTables(list);
    setGenerated(true);
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          background: #F0E8D8;
          color: #2E1C08;
          padding: 30px 20px;
        }
        
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 28px; color: #2E1C08; }
        .header h1 em { color: #A06C28; font-style: italic; }
        .header p { color: #9A7850; font-size: 14px; margin-top: 6px; }
        
        .url-box {
          background: #FAF4E8;
          border: 1px solid rgba(160,108,40,0.25);
          border-radius: 14px;
          padding: 22px 24px;
          max-width: 600px;
          margin: 0 auto 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .url-box label { font-size: 14px; font-weight: 500; color: #5C4020; }
        .url-row { display: flex; gap: 10px; }
        .url-inp {
          flex: 1;
          background: #E8DEC8;
          border: 1px solid rgba(160,108,40,0.25);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          color: #2E1C08;
          outline: none;
        }
        .url-inp:focus { border-color: rgba(160,108,40,0.6); }
        .btn-generate {
          background: #A06C28;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .btn-generate:hover { background: #8A5A18; }
        .url-hint { font-size: 12px; color: #9A7850; }
        
        .top-actions { text-align: center; margin-bottom: 28px; }
        .btn-print {
          background: #2E1C08;
          color: #F0E8D8;
          border: none;
          border-radius: 10px;
          padding: 12px 32px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-print:hover { background: #4A3010; }
        
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .qr-card {
          background: #fff;
          border: 1.5px solid rgba(160,108,40,0.20);
          border-radius: 16px;
          padding: 22px 16px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(100,60,10,0.08);
        }
        .qr-card .brand { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 14px; color: #9A7850; }
        .qr-card .brand em { color: #A06C28; font-style: normal; }
        .table-label { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #2E1C08; }
        .scan-text { font-size: 11px; color: #9A7850; text-align: center; line-height: 1.4; }
        
        @media print {
          body { background: #fff; padding: 10px; }
          .header, .url-box, .top-actions { display: none !important; }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          .qr-card {
            break-inside: avoid;
            border: 1.5px solid #ccc;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="header">
        <h1>☕ <em>Coffee-r</em> Attokahon</h1>
        <p>Generate &amp; print QR codes for all {configuredTables.length} tables</p>
      </div>

      <div className="url-box">
        <label>Your Website URL</label>
        <div className="url-row">
          <input className="url-inp" type="text" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://coffeer-attokahon.vercel.app" />
          <button className="btn-generate" onClick={generateAll}>Generate QRs</button>
        </div>
        <div className="url-hint">⚠️ Make sure to enter the deployed website URL. Each table QR will append table number parameters.</div>
      </div>

      {generated && (
        <div className="top-actions">
          <button className="btn-print" onClick={() => window.print()}>🖨️ Print All QR Codes</button>
        </div>
      )}

      <div className="qr-grid">
        {tables.map(t => (
          <div className="qr-card" key={t.num}>
            <div className="brand"><em>Coffee-r</em> Attokahon</div>
            <div style={{ background: '#fff', padding: '8px', border: '1px solid #eee', borderRadius: '8px' }}>
              <QRCodeSVG value={t.link} size={160} level="H" includeMargin={true} />
            </div>
            <div className="table-label">Table {t.num}</div>
            <div className="scan-text">Scan to order from your table</div>
          </div>
        ))}
      </div>
    </>
  );
}
