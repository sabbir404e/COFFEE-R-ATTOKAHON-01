'use client';

import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';

export default function TableQrCard({ tableName, qrValue, qrId, qrSize = 180 }) {
  const cornerStyle = { position: 'absolute', width: '16px', height: '16px', border: '1.5px solid #C88E29', zIndex: 2 };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '390px', margin: '0 auto', background: 'linear-gradient(145deg, #FCF5E7 0%, #F4E7CD 100%)', border: '2px solid #C88E29', borderRadius: '19px', padding: '6px', boxShadow: '0 12px 28px rgba(61,38,10,0.28)' }}>
      <div style={{ ...cornerStyle, top: '7px', left: '7px', borderRight: 'none', borderBottom: 'none', borderRadius: '3px 0 0 0' }} />
      <div style={{ ...cornerStyle, top: '7px', right: '7px', borderLeft: 'none', borderBottom: 'none', borderRadius: '0 3px 0 0' }} />
      <div style={{ ...cornerStyle, bottom: '7px', left: '7px', borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 3px' }} />
      <div style={{ ...cornerStyle, right: '7px', bottom: '7px', borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 3px 0' }} />

      <div style={{ position: 'relative', minHeight: '480px', border: '1px solid rgba(137,91,28,0.35)', borderRadius: '13px', padding: '25px 16px 21px', textAlign: 'center' }}>
        <Image src="/logo.png" alt="Coffee-r Attokahon" width={56} height={56} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #BC7D20', objectFit: 'cover', display: 'block', margin: '0 auto 10px', padding: '2px', background: '#fff', boxShadow: '0 3px 8px rgba(91,56,12,0.22)' }} />
        <div style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '23px', color: '#35200D', fontWeight: 700, lineHeight: 1.15, marginBottom: '3px' }}><em style={{ color: '#AD7221', fontStyle: 'italic', marginRight: '4px' }}>Coffee-r</em> Attokahon</div>
        <div style={{ fontSize: '9px', letterSpacing: '2.6px', textTransform: 'uppercase', color: '#A17138', fontWeight: 700 }}>ARTISAN COFFEE &amp; CUISINE</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '15px auto 20px', width: '65%' }}><span style={{ flex: 1, height: '1px', background: 'rgba(175,114,33,0.45)' }} /><i style={{ fontStyle: 'normal', color: '#C88E29', fontSize: '10px' }}>❖</i><span style={{ flex: 1, height: '1px', background: 'rgba(175,114,33,0.45)' }} /></div>
        <div style={{ display: 'inline-block', minWidth: '134px', fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: '15px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#fff', background: 'linear-gradient(135deg, #D69C35 0%, #A97020 100%)', padding: '8px 24px', borderRadius: '100px', marginBottom: '16px', boxShadow: '0 5px 10px rgba(123,76,15,0.25)' }}>{tableName}</div>
        <div id={qrId} style={{ background: '#fff', borderRadius: '16px', padding: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 9px 18px rgba(92,59,18,0.20)' }}>
          <QRCodeCanvas value={qrValue} size={qrSize} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#2E1C08" style={{ width: `${qrSize}px`, height: `${qrSize}px` }} />
        </div>
        <div style={{ marginTop: '14px', fontSize: '10px', letterSpacing: '1.8px', textTransform: 'uppercase', color: '#A17138', fontWeight: 700 }}>SCAN TO VIEW MENU &amp; ORDER</div>
      </div>
    </div>
  );
}
