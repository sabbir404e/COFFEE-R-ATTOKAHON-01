'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { useApp } from '@/context/AppContext';
import TableQrCard from '@/components/TableQrCard.jsx';

const CARD_W = 640;
const CARD_H = 900;

let logoImgCache = null;
function getLogoImg() {
  if (logoImgCache) return Promise.resolve(logoImgCache);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoImgCache = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

function roundRect(ctx, x, y, w, h, r) {
  let radius = r;
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
  ctx.closePath();
}

async function buildCardCanvas(tableId, tableName) {
  await Promise.all([
    document.fonts.load('700 40px "Playfair Display"'),
    document.fonts.load('600 20px "Outfit"'),
    document.fonts.load('700 20px "Outfit"'),
    document.fonts.load('400 20px "Outfit"')
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const brandDark = '#261608';
  const brandGold = '#C49246';
  const brandSub = '#9E7642';
  const cream = '#ECE1CE';

  // Background
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Outer rounded border
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = brandGold;
  roundRect(ctx, 16, 16, CARD_W - 32, CARD_H - 32, 34);
  ctx.stroke();

  // Decorative corner brackets
  const cLen = 28, cInset = 36;
  ctx.lineWidth = 3;
  ctx.strokeStyle = brandGold;
  ctx.lineCap = 'square';
  const corners = [
    [[cInset, cInset + cLen], [cInset, cInset], [cInset + cLen, cInset]],
    [[CARD_W - cInset - cLen, cInset], [CARD_W - cInset, cInset], [CARD_W - cInset, cInset + cLen]],
    [[cInset, CARD_H - cInset - cLen], [cInset, CARD_H - cInset], [cInset + cLen, CARD_H - cInset]],
    [[CARD_W - cInset - cLen, CARD_H - cInset], [CARD_W - cInset, CARD_H - cInset], [CARD_W - cInset, CARD_H - cInset - cLen]]
  ];
  corners.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
  });

  // Logo (circular)
  const logo = await getLogoImg();
  const logoR = 56, logoCx = CARD_W / 2, logoCy = 115;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(logoCx - logoR, logoCy - logoR, logoR * 2, logoR * 2);
    ctx.drawImage(logo, logoCx - logoR, logoCy - logoR, logoR * 2, logoR * 2);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = brandGold;
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shop name
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = '700 38px "Playfair Display", serif';
  ctx.fillText('Coffee-r Attokahon', CARD_W / 2, 212);

  // Tagline
  ctx.font = '700 13px "Outfit", sans-serif';
  ctx.fillStyle = brandSub;
  ctx.letterSpacing = '3px';
  ctx.fillText('ARTISAN COFFEE & CUISINE', CARD_W / 2, 238);

  // Divider with diamond
  ctx.strokeStyle = 'rgba(196,146,70,0.40)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 - 90, 268);
  ctx.lineTo(CARD_W / 2 - 12, 268);
  ctx.stroke();
  ctx.fillStyle = brandGold;
  ctx.font = '700 12px serif';
  ctx.fillText('❖', CARD_W / 2, 272);
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 + 12, 268);
  ctx.lineTo(CARD_W / 2 + 90, 268);
  ctx.stroke();

  // Table Badge
  const badgeLabel = (tableName || ('Table ' + tableId)).toUpperCase();
  const badgeH = 46, badgeW = 210, badgeX = (CARD_W - badgeW) / 2, badgeTop = 296;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeTop, badgeX + badgeW, badgeTop + badgeH);
  badgeGrad.addColorStop(0, '#CF983C');
  badgeGrad.addColorStop(1, '#A36F25');
  ctx.save();
  ctx.shadowColor = 'rgba(140,90,20,0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeTop, badgeW, badgeH, 23);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = '700 20px "Playfair Display", serif';
  ctx.fillText(badgeLabel, CARD_W / 2, badgeTop + badgeH / 2 + 7);

  // White QR panel
  const qrBoxSize = 360, qrBoxX = (CARD_W - qrBoxSize) / 2, qrBoxY = 370;
  ctx.save();
  ctx.shadowColor = 'rgba(50,30,10,0.15)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(196,146,70,0.20)';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.stroke();

  // Draw QR code image
  const qrHolder = document.getElementById(`qr${tableId}`);
  const qrSrcCanvas = qrHolder ? qrHolder.querySelector('canvas') : null;
  const qrSrcImg = qrHolder ? qrHolder.querySelector('img') : null;
  const qrPad = 22;
  const qrDrawSize = qrBoxSize - qrPad * 2;
  if (qrSrcCanvas) {
    ctx.drawImage(qrSrcCanvas, qrBoxX + qrPad, qrBoxY + qrPad, qrDrawSize, qrDrawSize);
  } else if (qrSrcImg) {
    ctx.drawImage(qrSrcImg, qrBoxX + qrPad, qrBoxY + qrPad, qrDrawSize, qrDrawSize);
  }

  // Scan text
  const scanY = qrBoxY + qrBoxSize + 44;
  ctx.font = '700 13px "Outfit", sans-serif';
  ctx.fillStyle = brandSub;
  ctx.fillText('SCAN TO VIEW MENU & ORDER', CARD_W / 2, scanY);

  return canvas;
}

function triggerDownload(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }, 'image/png');
}

const DEF_TABLES = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: 'Table ' + (i + 1),
  seats: 4,
  status: 'available',
  note: ''
}));

export default function QRPrintPage() {
  const { tables: configuredTables } = useApp();
  const [siteUrl, setSiteUrl] = useState('');
  const [activeTables, setActiveTables] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipStatus, setZipStatus] = useState('');

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ca_site_url');
        setSiteUrl(saved || window.location.origin);
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let list = [];
    if (configuredTables && configuredTables.length > 0) {
      list = configuredTables;
    } else {
      try {
        const t = JSON.parse(localStorage.getItem('ca_tables'));
        list = t && t.length ? t : DEF_TABLES;
      } catch {
        list = DEF_TABLES;
      }
    }
    setActiveTables(list.slice().sort((a, b) => a.id - b.id));
  }, [configuredTables, mounted]);

  const generateAll = () => {
    if (!siteUrl.trim()) {
      alert('Please enter your website URL first.');
      return;
    }
    let url = siteUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    url = url.replace(/\/$/, '');
    localStorage.setItem('ca_site_url', url);

    // Refresh active tables list
    let list = [];
    if (configuredTables && configuredTables.length > 0) {
      list = configuredTables;
    } else {
      try {
        const t = JSON.parse(localStorage.getItem('ca_tables'));
        list = t && t.length ? t : DEF_TABLES;
      } catch {
        list = DEF_TABLES;
      }
    }
    setActiveTables(list.slice().sort((a, b) => a.id - b.id));
  };

  const downloadCard = async (tableId, tableName) => {
    const canvas = await buildCardCanvas(tableId, tableName);
    const safeName = (tableName || ('table-' + tableId)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    triggerDownload(canvas, `qr-${safeName}.png`);
  };

  const downloadAll = async () => {
    if (!activeTables.length) {
      alert('Please generate the QR codes first.');
      return;
    }
    setIsZipping(true);
    const zip = new JSZip();
    try {
      for (const t of activeTables) {
        const tName = t.name || ('Table ' + t.id);
        setZipStatus(`⏳ Preparing ${tName}...`);
        const canvas = await buildCardCanvas(t.id, tName);
        const dataUrl = canvas.toDataURL('image/png').split(',')[1];
        const safeName = tName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        zip.file(`qr-${safeName}.png`, dataUrl, { base64: true });
      }
      setZipStatus('📦 Zipping...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'coffee-r-attokahon-table-qrs.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } catch (err) {
      console.error('Error generating zip:', err);
      alert('Failed to generate ZIP. Please try downloading PNGs individually.');
    } finally {
      setIsZipping(false);
      setZipStatus('');
    }
  };

  if (!mounted) return null;

  const formattedUrl = siteUrl.trim().replace(/\/$/, '');

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          background: #ECE1CE;
          color: #2E1C08;
          padding: 30px 20px;
        }

        /* ── HEADER ── */
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 28px;
          color: #2E1C08;
        }
        .header h1 em { color: #A06C28; font-style: italic; }
        .header p { color: #9A7850; font-size: 14px; margin-top: 6px; }
        .header-logo { width: 96px; height: 96px; object-fit: contain; margin: 0 auto 10px; display: block; }

        /* ── URL INPUT ── */
        .url-box {
          background: #ECE1CE;
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
          font-family: var(--font-outfit), 'Outfit', sans-serif;
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
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .btn-generate:hover { background: #8A5A18; }
        .url-hint { font-size: 12px; color: #9A7850; }

        /* ── PRINT BUTTON ── */
        .top-actions {
          text-align: center;
          margin-bottom: 28px;
        }
        .btn-print {
          background: #2E1C08;
          color: #F0E8D8;
          border: none;
          border-radius: 10px;
          padding: 12px 32px;
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-print:hover { background: #4A3010; }
        .btn-download-all {
          background: #fff;
          color: #A06C28;
          border: 1.5px solid #A06C28;
          border-radius: 10px;
          padding: 12px 32px;
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          cursor: pointer;
          margin-left: 12px;
          transition: background 0.2s, color 0.2s;
        }
        .btn-download-all:hover { background: #A06C28; color: #fff; }
        .btn-download-all:disabled { opacity: 0.6; cursor: wait; }

        /* ── PER-CARD DOWNLOAD BUTTON ── */
        .btn-card-dl {
          background: #F0E8D8;
          color: #7A5726;
          border: 1px solid rgba(160,108,40,0.3);
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .btn-card-dl:hover { background: #A06C28; color: #fff; }

        /* ── QR GRID ── */
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* ── QR CARD ── */
        .qr-card {
          background: transparent;
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .qr-card-frame { position: relative; width: 100%; background: linear-gradient(160deg, #FAF4E8 0%, #EFE1C3 100%); border: 1.5px solid #C89438; border-radius: 20px; padding: 7px; box-shadow: 0 10px 25px rgba(0,0,0,0.20); }
        .qr-card-inner { position: relative; border: 1px solid rgba(160,108,40,0.35); border-radius: 14px; padding: 22px 16px 18px; text-align: center; }
        .qr-card-corner { position: absolute; width: 18px; height: 18px; border: 2px solid #C89438; z-index: 2; }
        .qr-cc-tl { top: 6px; left: 6px; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
        .qr-cc-tr { top: 6px; right: 6px; border-left: none; border-bottom: none; border-radius: 0 4px 0 0; }
        .qr-cc-bl { bottom: 6px; left: 6px; border-right: none; border-top: none; border-radius: 0 0 0 4px; }
        .qr-cc-br { bottom: 6px; right: 6px; border-left: none; border-top: none; border-radius: 0 0 4px 0; }
        .qr-card-logo { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #C89438; object-fit: cover; display: block; margin: 0 auto 10px; padding: 2px; background: #fff; box-shadow: 0 4px 12px rgba(160,108,40,0.25); }
        .qr-card-name {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 23px;
          color: #2E1C08;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .qr-card-name em { color: #A06C28; font-style: italic; font-weight: 700; margin-right: 4px; }
        .qr-card-tagline { font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: #9A7850; margin-top: 4px; font-weight: 600; }
        .qr-card-divider { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px auto 14px; width: 65%; }
        .qr-card-divider span { flex: 1; height: 1px; background: rgba(160,108,40,0.35); }
        .qr-card-divider i { font-style: normal; color: #C89438; font-size: 10px; }
        .qr-card-table { display: inline-block; font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff; background: linear-gradient(135deg, #D4A445 0%, #A06C28 100%); padding: 7px 28px; border-radius: 100px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(160,108,40,0.35); }
        .qr-card-qr-wrap { background: #ffffff; border-radius: 18px; padding: 14px; display: inline-block; box-shadow: 0 6px 20px rgba(0,0,0,0.12); border: 1px solid rgba(160,108,40,0.2); }
        .qr-canvas { width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
        .qr-card-scan { margin-top: 14px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #9A7850; font-weight: 700; }

        /* ── PRINT STYLES ── */
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
            border: none;
            box-shadow: none;
          }
          .btn-card-dl { display: none !important; }
        }
      `}</style>

      <div className="header">
        <img className="header-logo" src="/logo.png" alt="Coffee-r Attokahon" />
        <h1>☕ <em>Coffee-r</em> Attokahon</h1>
        <p>Generate &amp; print QR codes for all {activeTables.length} tables</p>
      </div>

      <div className="url-box">
        <label>Your Website URL</label>
        <div className="url-row">
          <input
            className="url-inp"
            type="text"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://coffeer-attokahon.vercel.app"
          />
          <button className="btn-generate" onClick={generateAll}>Generate QRs</button>
        </div>
        <div className="url-hint">
          ⚠️ Paste your actual website URL above before generating. Each table QR will link to that URL with its table number. Tables shown are read live from Admin → Tables — add or remove tables there and refresh this page.
        </div>
      </div>

      <div className="top-actions">
        <button className="btn-print" onClick={() => window.print()}>🖨️ Print All QR Codes</button>
        <button className="btn-download-all" disabled={isZipping} onClick={downloadAll}>
          {isZipping ? zipStatus : '⬇️ Download All (ZIP)'}
        </button>
      </div>

      <div className="qr-grid" id="qrGrid">
        {activeTables.map((t) => {
          const tableName = t.name || ('Table ' + t.id);
          const targetUrl = formattedUrl
            ? `${formattedUrl}/?table=${t.id}`
            : `https://coffeer-attokahon.vercel.app/?table=${t.id}`;

          return (
            <div className="qr-card" key={t.id}>
              <TableQrCard
                tableName={tableName.toUpperCase()}
                qrValue={targetUrl}
                qrId={`qr${t.id}`}
                qrSize={160}
              />
              <button className="btn-card-dl" onClick={() => downloadCard(t.id, tableName)}>
                ⬇️ Download PNG
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
