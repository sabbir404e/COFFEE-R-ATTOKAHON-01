'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

export default function HomePage() {
  const { theme, toggleTheme, tableNum, setTableNum } = useApp();
  const [greeting, setGreeting] = useState({ text: 'Welcome', emoji: '☕' });
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('table');
      if (t) {
        const num = parseInt(t, 10);
        if (!isNaN(num) && num >= 1) {
          setTableNum(num);
          try { localStorage.setItem('ca_table_num', String(num)); } catch (e) {}
        }
      } else {
        try {
          const savedTable = localStorage.getItem('ca_table_num');
          if (savedTable) {
            const num = parseInt(savedTable, 10);
            if (!isNaN(num) && num >= 1 && !tableNum) {
              setTableNum(num);
            }
          }
        } catch (e) {}
      }
    }
  }, [setTableNum, tableNum]);

  useEffect(() => {
    const updateGreeting = () => {
      const h = new Date().getHours();
      let text, emoji;
      if (h >= 5 && h < 12) { text = 'Good Morning'; emoji = '☀️'; }
      else if (h >= 12 && h < 17) { text = 'Good Afternoon'; emoji = '🌤️'; }
      else if (h >= 17 && h < 21) { text = 'Good Evening'; emoji = '🌙'; }
      else { text = 'Good Night'; emoji = '🌌'; }
      setGreeting({ text, emoji });
    };
    updateGreeting();
    const iv = setInterval(updateGreeting, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    try {
      const lastOrderId = localStorage.getItem('ca_last_order_id');
      if (lastOrderId) {
        setHasActiveOrder(true);
      }
    } catch (e) {
      // no active order data available
    }
  }, [tableNum]);

  useEffect(() => {
    // Scroll Animation Observer
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animation = 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both';
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.best-card, .fade-target').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'bhp-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  };

  return (
    <>
      <style>{`
        :root{--tt:background-color 0.3s ease,color 0.3s ease,border-color 0.3s ease;}
        [data-theme="dark"]{
          --bg:#1A1410;--bg2:#211A12;--card:#2A2115;
          --border:rgba(200,148,56,0.20);--border-h:rgba(200,148,56,0.45);
          --gold:#C89438;--gold-h:#E0AE58;--gold-soft:rgba(200,148,56,0.14);
          --text:#EDE0C8;--text2:#BBA880;--muted:#8A7860;
          --shadow:0 4px 24px rgba(0,0,0,0.30);--shadow-lg:0 20px 60px rgba(0,0,0,0.45);--pill-bg:rgba(200,148,56,0.13);
          --steam:rgba(237,224,200,0.55);--shimmer-hi:#FFE3A8;
        }
        [data-theme="light"]{
          --bg:#F4ECDC;--bg2:#EADFC6;--card:#FFFCF5;
          --border:rgba(160,108,40,0.24);--border-h:rgba(160,108,40,0.52);
          --gold:#95642A;--gold-h:#7A4E14;--gold-soft:rgba(160,108,40,0.12);
          --text:#2E1C08;--text2:#5C4020;--muted:#8C6B44;
          --shadow:0 6px 22px rgba(120,80,20,0.14);--shadow-lg:0 26px 60px rgba(120,80,20,0.20);--pill-bg:rgba(160,108,40,0.10);
          --steam:rgba(90,60,20,0.35);--shimmer-hi:#D98F2B;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);transition:var(--tt);overflow-x:hidden;}
        button{font-family:'Outfit',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--bg2);}::-webkit-scrollbar-thumb{background:var(--border-h);border-radius:4px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:none;}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes floatY{0%,100%{transform:translateY(0);}50%{transform:translateY(-16px);}}
        @keyframes spinSlow{to{transform:rotate(360deg);}}
        @keyframes steamRise{
          0%{ transform:translateY(0) scaleX(1); opacity:0; }
          15%{ opacity:.7; }
          50%{ transform:translateY(-22px) scaleX(1.4); opacity:.45; }
          100%{ transform:translateY(-46px) scaleX(0.8); opacity:0; }
        }
        @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}

        /* ── NAV ──────────────────────────────────────────────── */
        nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          background:rgba(26,20,16,0.82);
          backdrop-filter:blur(16px) saturate(140%);
          border-bottom:1px solid var(--border);
          height:66px;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 40px;
          transition:background 0.3s ease, border-color 0.3s ease;
        }
        [data-theme="light"] nav{
          background:rgba(244,236,220,0.88);
        }
        .nav-brand{font-family:'Playfair Display',serif;font-size:21px;text-decoration:none;color:var(--text);display:flex;align-items:center;gap:12px;}
        .nav-brand-img{width:52px;height:52px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 2px 10px rgba(200,148,56,0.35));transition:transform 0.3s ease;}
        .nav-brand:hover .nav-brand-img{transform:scale(1.08) rotate(-3deg);}
        .nav-brand em{color:var(--gold);font-style:normal;}
        .nav-links{display:flex;align-items:center;gap:30px;}
        .nav-links a{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.2s;letter-spacing:0.3px;position:relative;}
        .nav-links a::after{content:'';position:absolute;left:0;bottom:-4px;width:0;height:1px;background:var(--gold);transition:width 0.25s;}
        .nav-links a:hover{color:var(--gold);}
        .nav-links a:hover::after{width:100%;}
        .nav-right{display:flex;align-items:center;gap:14px;}
        .theme-toggle{width:46px;height:25px;background:var(--pill-bg);border-radius:13px;border:1px solid var(--border);cursor:pointer;position:relative;flex-shrink:0;box-shadow:inset 0 1px 3px rgba(0,0,0,0.12);transition:background 0.3s,border-color 0.3s;}
        .theme-toggle::after{content:'';position:absolute;width:19px;height:19px;background:linear-gradient(160deg,var(--gold-h),var(--gold));border-radius:50%;top:2px;left:2px;transition:transform 0.35s cubic-bezier(0.34,1.4,0.64,1);box-shadow:0 2px 6px rgba(0,0,0,0.25);}
        [data-theme="light"] .theme-toggle::after{transform:translateX(21px);}
        .theme-label{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);letter-spacing:0.3px;user-select:none;}
        .theme-label .tl-ic{font-size:14px;line-height:1;}
        @media(max-width:600px){.theme-label{display:none;}}

        /* ── HERO ─────────────────────────────────────────────── */
        .hero{
          min-height:100vh;
          display:flex;align-items:center;justify-content:center;
          position:relative;overflow:hidden;
          padding:110px 40px 60px;
        }
        .hero-bg{
          position:absolute;inset:0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%,rgba(200,148,56,0.16) 0%,transparent 60%),
            radial-gradient(ellipse 55% 45% at 92% 15%,rgba(200,148,56,0.10) 0%,transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 100%,rgba(200,148,56,0.09) 0%,transparent 60%),
            radial-gradient(ellipse 45% 35% at 8% 85%,rgba(200,148,56,0.08) 0%,transparent 60%),
            radial-gradient(ellipse 40% 30% at 4% 10%,rgba(200,148,56,0.06) 0%,transparent 60%);
          z-index:0;
        }
        .hero-bg::before{
          content:'';position:absolute;inset:0;opacity:.35;
          background-image:radial-gradient(rgba(200,148,56,0.35) 1px,transparent 1px);
          background-size:26px 26px;
          mask-image:radial-gradient(ellipse 70% 60% at 50% 35%,#000 0%,transparent 75%);
        }
        .coffee-stain{position:absolute;border-radius:50%;pointer-events:none;filter:blur(2px);}
        .coffee-stain.cs1{
          width:420px;height:420px;top:-8%;left:-8%;
          background:radial-gradient(circle,rgba(200,148,56,0.10) 0%,transparent 70%);
          animation:blobDrift 20s ease-in-out infinite;
        }
        .coffee-stain.cs2{
          width:520px;height:520px;bottom:-14%;right:-10%;
          background:radial-gradient(circle,rgba(200,148,56,0.09) 0%,transparent 70%);
          animation:blobDrift 26s ease-in-out infinite reverse;
        }
        .coffee-ring-mark{position:absolute;border-radius:50%;border:1.5px solid rgba(200,148,56,0.10);pointer-events:none;}
        .coffee-ring-mark.crm1{width:210px;height:210px;top:12%;right:6%;}
        .coffee-ring-mark.crm1::after{content:'';position:absolute;inset:14px;border-radius:50%;border:1.5px solid rgba(200,148,56,0.08);}
        .coffee-ring-mark.crm2{width:150px;height:150px;bottom:10%;left:5%;}
        @keyframes blobDrift{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(20px,-16px) scale(1.06);}}
        @media(max-width:700px){.coffee-stain,.coffee-ring-mark{display:none;}}

        .deco{position:absolute;pointer-events:none;animation:floatY 10s ease-in-out infinite;}
        .deco svg{display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,0.25));}
        .deco.bean{opacity:0.55;}
        .deco.bean.b1{top:16%;left:9%;width:34px;animation-delay:.2s;}
        .deco.bean.b2{top:68%;left:6%;width:24px;animation-delay:1.4s;}
        .deco.bean.b3{top:24%;right:8%;width:28px;animation-delay:.8s;animation-name:floatRot;}
        .deco.bean.b4{top:72%;right:11%;width:38px;animation-delay:2s;}
        .deco.bean.b5{top:46%;left:2%;width:18px;animation-delay:1s;}
        .deco.bean.b6{top:6%;right:26%;width:16px;opacity:0.4;animation-delay:2.4s;animation-name:floatRot;animation-duration:11s;}
        .deco.cup{opacity:0.5;}
        .deco.cup.c1{top:11%;left:20%;width:30px;animation-delay:.6s;}
        .deco.cup.c2{bottom:14%;right:20%;width:26px;animation-delay:1.8s;}
        .deco.cup.c3{top:58%;right:2%;width:22px;opacity:0.4;animation-delay:1.2s;animation-name:floatDrift;animation-duration:13s;}
        .deco.steam{opacity:0.4;}
        .deco.steam.st1{top:36%;right:4%;width:20px;animation-delay:1.1s;}
        .deco.leaf{opacity:0.45;}
        .deco.leaf.lf1{top:82%;left:17%;width:26px;animation-delay:0.4s;animation-name:floatDrift;animation-duration:12s;}
        .deco.leaf.lf2{top:4%;left:42%;width:20px;opacity:0.35;animation-delay:1.6s;animation-name:floatDrift;animation-duration:14s;}
        .deco.pastry{opacity:0.5;}
        .deco.pastry.ps1{bottom:9%;left:9%;width:28px;animation-delay:.9s;}
        .deco.sparkle{opacity:0.55;animation-name:sparkle;animation-timing-function:ease-in-out;}
        .deco.sparkle.sp1{top:20%;left:29%;width:11px;animation-duration:2.6s;animation-delay:.3s;}
        .deco.sparkle.sp2{top:78%;right:31%;width:9px;animation-duration:3.2s;animation-delay:1.1s;}
        .deco.sparkle.sp3{top:50%;left:13%;width:8px;animation-duration:2.8s;animation-delay:1.9s;}
        .deco.sparkle.sp4{top:14%;right:14%;width:10px;animation-duration:3s;animation-delay:.7s;}
        @keyframes floatRot{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(-12px) rotate(8deg);}}
        @keyframes floatDrift{0%,100%{transform:translate(0,0);}50%{transform:translate(10px,-13px);}}
        @keyframes sparkle{0%,100%{opacity:.2;transform:scale(.7);}50%{opacity:.95;transform:scale(1.25);}}


        .hero-content{position:relative;z-index:1;text-align:center;max-width:720px;}

        .greeting-hero{
          position:relative;
          display:flex;flex-direction:column;align-items:center;gap:2px;
          margin-bottom:24px;
          animation:fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        .greeting-hero .gh-glow{
          position:absolute;top:-30px;left:50%;transform:translateX(-50%);
          width:260px;height:140px;
          background:radial-gradient(ellipse,var(--gold-soft) 0%,transparent 70%);
          filter:blur(10px);pointer-events:none;z-index:-1;
          animation:ghPulse 3.5s ease-in-out infinite;
        }
        .greeting-hero .gh-emoji{
          font-size:46px;line-height:1;display:inline-block;
          filter:drop-shadow(0 6px 16px rgba(200,148,56,0.35));
          animation:ghFloat 3s ease-in-out infinite;
        }
        .greeting-hero .gh-text{
          font-family:'Playfair Display',serif;
          font-size:clamp(30px,5.4vw,46px);
          font-weight:700;letter-spacing:0.3px;line-height:1.15;
          background:linear-gradient(100deg,var(--gold-h) 0%,var(--gold) 25%,var(--shimmer-hi) 50%,var(--gold) 75%,var(--gold-h) 100%);
          background-size:250% auto;-webkit-background-clip:text;background-clip:text;color:transparent;
          animation:ghShimmer 4s linear infinite;
        }
        @keyframes ghFloat{0%,100%{transform:translateY(0) rotate(-4deg);}50%{transform:translateY(-9px) rotate(4deg);}}
        @keyframes ghShimmer{0%{background-position:0% center;}100%{background-position:250% center;}}
        @keyframes ghPulse{0%,100%{opacity:0.6;transform:translateX(-50%) scale(1);}50%{opacity:1;transform:translateX(-50%) scale(1.15);}}
        @media(max-width:600px){.greeting-hero .gh-emoji{font-size:34px;}}

        .hero-logo-wrap{
          position:relative;display:flex;align-items:center;justify-content:center;
          width:264px;height:264px;margin:32px auto 28px;
          animation:fadeUp 0.8s 0.05s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-logo-wire{
          position:absolute;top:-105px;left:50%;transform:translateX(-50%);
          width:2px;height:108px;
          background:linear-gradient(to bottom,transparent,rgba(200,148,56,0.3) 25%,rgba(200,148,56,0.85) 90%,#C89438 100%);
          box-shadow:0 0 8px rgba(200,148,56,0.5);
          z-index:2;pointer-events:none;
        }
        .hero-logo-wire::after{
          content:'';position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
          width:8px;height:8px;border-radius:50%;background:#C89438;
          box-shadow:0 0 10px rgba(200,148,56,0.9);
        }
        .hero-logo-glow{position:absolute;inset:-36px;border-radius:50%;background:radial-gradient(circle,rgba(200,148,56,0.25) 0%,rgba(200,148,56,0.08) 50%,transparent 72%);filter:blur(10px);}
        .hero-logo-outer-ring{position:absolute;inset:-24px;border-radius:50%;border:1px dotted rgba(200,148,56,0.30);animation:spinSlow 70s linear infinite reverse;}
        .hero-logo-ring{position:absolute;inset:-10px;border-radius:50%;border:1.5px dashed var(--border-h);box-shadow:0 0 16px rgba(200,148,56,0.18);animation:spinSlow 45s linear infinite;}
        .hero-logo{
          position:relative;width:240px;height:240px;object-fit:contain;
          display:block;flex-shrink:0;
          filter:drop-shadow(0 16px 36px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(200,148,56,0.22));
          animation:logoBreathe 5s ease-in-out infinite;
        }
        @keyframes logoBreathe{0%,100%{transform:scale(1);}50%{transform:scale(1.025);}}
        .steam{position:absolute;top:-6px;left:50%;width:3px;height:26px;border-radius:3px;background:linear-gradient(to top,transparent,var(--steam));transform:translateX(-50%);}
        .steam.s1{animation:steamRise 3.2s ease-in-out infinite;left:44%;}
        .steam.s2{animation:steamRise 3.2s ease-in-out infinite 1.1s;left:50%;}
        .steam.s3{animation:steamRise 3.2s ease-in-out infinite 2.1s;left:56%;}

        .hero-eyebrow{
          display:inline-flex;align-items:center;gap:10px;
          font-size:11px;letter-spacing:3.5px;text-transform:uppercase;
          color:var(--gold);margin-bottom:20px;
          animation:fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-eyebrow::before,.hero-eyebrow::after{content:'';width:28px;height:1px;background:var(--gold);opacity:0.5;}

        .hero-table-chip{
          position:relative;overflow:hidden;
          display:none;align-items:center;
          background:var(--card);
          border:1px solid var(--border-h);
          border-radius:50px;padding:7px 20px 7px 7px;
          margin:0 auto 26px;width:fit-content;
          box-shadow:var(--shadow);
          animation:fadeUp 0.8s 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-table-chip.show{display:inline-flex;}
        .hero-table-chip::after{
          content:'';position:absolute;top:0;left:0;width:34%;height:100%;
          background:linear-gradient(120deg,transparent,rgba(255,255,255,0.16),transparent);
          animation:chipShine 4s ease-in-out infinite;pointer-events:none;
        }
        .hero-table-chip .htc-badge{
          display:flex;align-items:center;justify-content:center;
          width:36px;height:36px;flex-shrink:0;border-radius:50%;
          background:linear-gradient(135deg,var(--gold-h),var(--gold));color:#fff;
          box-shadow:0 3px 10px rgba(200,148,56,0.4);margin-right:12px;
        }
        .hero-table-chip .htc-info{
          display:flex;flex-direction:column;line-height:1.25;
          padding-right:14px;margin-right:12px;border-right:1px dashed var(--border-h);
        }
        .hero-table-chip .htc-eyebrow{font-size:9.5px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);}
        .hero-table-chip .htc-num-row{display:flex;align-items:center;gap:7px;}
        .hero-table-chip .htc-num{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--gold);}
        .hero-table-chip .ready-badge{
          display:inline-flex;align-items:center;
          font-size:8.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;
          color:var(--gold);background:var(--gold-soft);border:1px solid var(--border-h);
          border-radius:10px;padding:2px 8px;white-space:nowrap;
        }
        .hero-table-chip .htc-live{
          display:flex;align-items:center;gap:6px;
          font-size:10.5px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#4CAF6D;
        }
        .hero-table-chip .dot{position:relative;width:7px;height:7px;border-radius:50%;background:#4CAF6D;flex-shrink:0;animation:tableDotBlink 1.6s steps(1) infinite;}
        .hero-table-chip .dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;background:rgba(76,175,109,0.35);animation:tableDotPing 1.6s ease-out infinite;}
        @keyframes tableDotBlink{0%,45%{opacity:1;}50%,95%{opacity:0.35;}100%{opacity:1;}}
        @keyframes tableDotPing{0%{transform:scale(0.6);opacity:0.7;}75%,100%{transform:scale(1.8);opacity:0;}}
        @keyframes chipShine{0%,15%{transform:translateX(-160%) skewX(-20deg);}45%,100%{transform:translateX(320%) skewX(-20deg);}}

        .hero-title{
          font-family:'Playfair Display',serif;
          font-size:clamp(38px,7vw,68px);
          line-height:1.1;letter-spacing:-1px;
          margin-bottom:18px;
          animation:fadeUp 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-title em{color:var(--gold);font-style:italic;}
        .hero-tagline{
          display:flex;align-items:center;justify-content:center;gap:16px;
          font-family:'Playfair Display',serif;font-style:italic;font-weight:600;
          font-size:clamp(19px,2.8vw,25px);color:var(--gold);
          letter-spacing:0.4px;margin-bottom:24px;
          text-shadow:0 2px 18px var(--gold-soft);
          animation:fadeUp 0.8s 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-tagline::before,.hero-tagline::after{
          content:'';width:34px;height:1px;flex-shrink:0;
          background:linear-gradient(90deg,transparent,var(--gold-h));
        }
        .hero-tagline::after{background:linear-gradient(90deg,var(--gold-h),transparent);}
        @media(max-width:600px){.hero-tagline::before,.hero-tagline::after{width:18px;}}
        .hero-sub{
          font-size:clamp(15px,2.5vw,17px);color:var(--muted);
          line-height:1.85;max-width:500px;margin:0 auto 38px;font-weight:300;
          animation:fadeUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hero-ctas{
          display:flex;align-items:center;justify-content:center;
          animation:fadeUp 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .btn-hero-primary{
          position:relative;overflow:hidden;
          padding:19px 44px;
          background:linear-gradient(135deg,var(--gold-h),var(--gold));
          color:#fff;
          border:none;border-radius:50px;font-size:16.5px;font-weight:600;
          font-family:'Playfair Display',serif;cursor:pointer;
          transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s cubic-bezier(0.16,1,0.3,1);
          box-shadow:0 10px 30px rgba(200,148,56,0.4);
          text-decoration:none;display:inline-flex;align-items:center;gap:12px;
        }
        .btn-hero-primary::after{
          content:'';position:absolute;top:0;left:0;width:30%;height:100%;
          background:linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent);
          animation:chipShine 3.2s ease-in-out infinite;pointer-events:none;
        }
        .btn-hero-primary .bhp-icon{font-size:14px;opacity:0.9;transition:transform 0.35s ease;}
        .btn-hero-primary .bhp-arrow{transition:transform 0.25s;display:inline-block;}
        .btn-hero-primary:hover{transform:translateY(-3px) scale(1.035);box-shadow:0 18px 42px rgba(200,148,56,0.55);}
        .btn-hero-primary:hover .bhp-arrow{transform:translateX(4px);}
        .btn-hero-primary:hover .bhp-icon{transform:rotate(-8deg);}
        .btn-hero-primary:active{transform:translateY(-1px) scale(1.01);}
        .bhp-ripple{
          position:absolute;border-radius:50%;background:rgba(255,255,255,0.55);
          transform:scale(0);pointer-events:none;animation:bhpRippleAnim 0.6s ease-out forwards;
        }
        @keyframes bhpRippleAnim{to{transform:scale(2.6);opacity:0;}}
        .track-order-wrap{display:flex;justify-content:center;margin-top:14px;animation:fadeUp 0.8s 0.45s cubic-bezier(0.16,1,0.3,1) both;}
        .btn-track-order{
          position:relative;overflow:hidden;
          display:inline-flex;align-items:center;gap:9px;
          padding:12px 28px;border-radius:50px;
          background:var(--card);border:1.5px solid var(--border-h);color:var(--gold);
          font-size:14px;font-weight:600;text-decoration:none;
          box-shadow:var(--shadow);transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s ease,border-color 0.25s ease,background-color 0.25s ease;
        }
        .btn-track-order:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);border-color:var(--gold);background:var(--bg2);}
        .btn-track-order .tob-dot{width:7px;height:7px;border-radius:50%;background:#4CAF6D;box-shadow:0 0 0 3px rgba(76,175,109,0.22);animation:tableDotBlink 1.6s steps(1) infinite;}
        .btn-track-order .tob-arrow{transition:transform 0.25s;display:inline-block;}
        .btn-track-order:hover .tob-arrow{transform:translateX(3px);}
        .hero-stats{
          display:flex;align-items:center;justify-content:center;gap:36px;
          margin-top:58px;padding-top:38px;
          border-top:1px solid var(--border);
          animation:fadeUp 0.8s 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        .h-stat-num{font-family:'Playfair Display',serif;font-size:26px;color:var(--gold);}
        .h-stat-lbl{font-size:10.5px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:3px;}
        .h-stat-div{width:1px;height:34px;background:var(--border);}
        .scroll-cue{
          position:absolute;bottom:22px;left:50%;
          display:flex;flex-direction:column;align-items:center;gap:6px;
          color:var(--muted);font-size:10px;letter-spacing:2px;text-transform:uppercase;
          opacity:.7;animation:fadeIn 1.2s 1s both,scrollCueBounce 2.4s ease-in-out 1.2s infinite;
        }
        .scroll-cue .arrow{width:9px;height:9px;border-right:1px solid var(--muted);border-bottom:1px solid var(--muted);transform:rotate(45deg);animation:floatY 1.8s ease-in-out infinite;}
        @keyframes scrollCueBounce{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-50%) translateY(6px);}}

        /* ── SECTION COMMON ───────────────────────────────────── */
        .section{padding:100px 40px;}
        .section-inner{max-width:1120px;margin:0 auto;}
        .section-eyebrow{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:12px;}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(30px,5vw,46px);line-height:1.15;margin-bottom:16px;}
        .section-title em{color:var(--gold);font-style:italic;}
        .section-sub{font-size:15px;color:var(--muted);line-height:1.85;max-width:540px;font-weight:300;}
        .section-divider{width:48px;height:2px;background:linear-gradient(to right,var(--gold),transparent);margin:20px 0 0;}
        .section-head{margin-bottom:48px;}
        .section-head.center{text-align:center;}
        .section-head.center .section-sub{margin:0 auto;}
        .section-head.center .section-divider{margin:20px auto 0;}

        /* ── SPECIALS / POPULAR ───────────────────────────────── */
        .specials{background:var(--bg2);position:relative;}
        .tbs-badge{
          display:inline-flex;align-items:center;gap:6px;
          background:var(--card);border:1px solid var(--border-h);color:var(--gold);
          font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;
          padding:6px 16px;border-radius:20px;box-shadow:var(--shadow);margin-bottom:14px;
          animation:fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        .tbs-badge .tbs-ic{font-size:13px;animation:ghFloat 3s ease-in-out infinite;}
        .best-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;}
        .best-card{
          background:var(--card);border:1px solid var(--border);border-radius:20px;
          padding:26px 22px 24px;text-align:center;position:relative;
          transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s cubic-bezier(0.16,1,0.3,1),border-color 0.35s ease;cursor:pointer;
          text-decoration:none;color:inherit;display:block;box-shadow:var(--shadow);
          will-change:transform;
        }
        .best-card:hover{border-color:var(--border-h);transform:translateY(-9px) scale(1.015);box-shadow:var(--shadow-lg);}
        .best-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;border-radius:20px;padding:4px 16px;font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 14px rgba(200,148,56,0.35);}
        .best-emoji{margin:12px 0 16px;display:flex;justify-content:center;}
        .best-emoji img{width:88px;height:88px;object-fit:cover;border-radius:50%;border:3px solid var(--bg2);box-shadow:0 8px 20px rgba(0,0,0,0.18);transition:transform 0.3s;}
        .best-card:hover .best-emoji img{transform:scale(1.06) rotate(-2deg);}
        .best-name{font-family:'Playfair Display',serif;font-size:18px;margin-bottom:6px;}
        .best-desc{font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:14px;min-height:38px;}
        .best-price{font-size:19px;font-weight:700;color:var(--gold);}
        
        /* RESPONSIVE */
        @media(max-width:900px){
          .best-grid{grid-template-columns:repeat(2,1fr);}
          nav{padding:0 20px;}
          .nav-links{display:none;}
          .section{padding:72px 20px;}
          .hero{padding:110px 20px 60px;}
        }
        @media(max-width:600px){
          .best-grid{grid-template-columns:1fr;}
          .hero-stats{flex-direction:column;gap:18px;}
          .h-stat-div{display:none;}
          .hero-logo-wrap{width:200px;height:200px;}
          .hero-logo{width:178px;height:178px;}
        }
      `}</style>

      {/* NAV */}
      <nav>
        <Link className="nav-brand" href="/">
          <img className="nav-brand-img" src="/logo.png" alt="Coffee-r Attokahon" />
          <span><em>Coffee-r</em> Attokahon</span>
        </Link>
        <div className="nav-links">
        </div>
        <div className="nav-right">
          <span className="theme-label" id="themeLabel">
            <span className="tl-ic" id="themeLabelIcon">{theme === 'dark' ? '🌙' : '✨'}</span>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme"></button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="coffee-stain cs1"></div>
        <div className="coffee-stain cs2"></div>
        <div className="coffee-ring-mark crm1"></div>
        <div className="coffee-ring-mark crm2"></div>

        <div className="deco bean b1"><svg viewBox="0 0 24 24" width="34" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.85"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>
        <div className="deco bean b2"><svg viewBox="0 0 24 24" width="24" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.7"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>
        <div className="deco bean b3"><svg viewBox="0 0 24 24" width="28" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.75"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>
        <div className="deco bean b4"><svg viewBox="0 0 24 24" width="38" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.65"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>
        <div className="deco bean b5"><svg viewBox="0 0 24 24" width="18" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.6"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>
        <div className="deco bean b6"><svg viewBox="0 0 24 24" width="16" fill="var(--gold)"><path d="M12 2C7 2 3 6 3 11c0 5.5 4.5 11 9 11s9-5.5 9-11c0-5-4-9-9-9z" opacity="0.6"/><path d="M12 4c-3 4-3 12 0 16" stroke="var(--bg)" strokeWidth="1.3" fill="none"/></svg></div>

        <div className="deco cup c1"><svg viewBox="0 0 24 24" width="30" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c-.5 1 .5 1.5 0 2.5M12 3c-.5 1 .5 1.5 0 2.5"/></svg></div>
        <div className="deco cup c2"><svg viewBox="0 0 24 24" width="26" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c-.5 1 .5 1.5 0 2.5M12 3c-.5 1 .5 1.5 0 2.5"/></svg></div>
        <div className="deco cup c3"><svg viewBox="0 0 24 24" width="22" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/></svg></div>

        <div className="deco steam st1"><svg viewBox="0 0 24 24" width="20" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 22c-2-3 2-4 0-8M12 22c-2-3 2-4 0-8M16 22c-2-3 2-4 0-8"/></svg></div>

        <div className="deco leaf lf1"><svg viewBox="0 0 24 24" width="26" fill="var(--gold)"><path d="M12 2C7 6 4 12 6 18c4 2 10 0 12-6 2-6-2-10-6-10z" opacity="0.7"/><path d="M8 18C10 12 12 8 16 4" stroke="var(--bg)" strokeWidth="1.2" fill="none"/></svg></div>
        <div className="deco leaf lf2"><svg viewBox="0 0 24 24" width="20" fill="var(--gold)"><path d="M12 2C7 6 4 12 6 18c4 2 10 0 12-6 2-6-2-10-6-10z" opacity="0.7"/><path d="M8 18C10 12 12 8 16 4" stroke="var(--bg)" strokeWidth="1.2" fill="none"/></svg></div>

        <div className="deco pastry ps1"><svg viewBox="0 0 24 24" width="28" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15c1-7 7-11 12-9 3.5 1.5 5 5 3.5 8-1 2-3 2.5-3.5 1.5-.5 2.5-3 4-5.5 3 .5-2-.5-2.5-1.5-1.5-2 1-4 .5-5-2z"/></svg></div>

        <div className="deco sparkle sp1"><svg viewBox="0 0 24 24" width="11" fill="var(--gold)"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg></div>
        <div className="deco sparkle sp2"><svg viewBox="0 0 24 24" width="9" fill="var(--gold)"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg></div>
        <div className="deco sparkle sp3"><svg viewBox="0 0 24 24" width="8" fill="var(--gold)"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg></div>
        <div className="deco sparkle sp4"><svg viewBox="0 0 24 24" width="10" fill="var(--gold)"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg></div>

        <div className="hero-content">
          <div className="greeting-hero">
            <span className="gh-glow"></span>
            <span className="gh-emoji">{greeting.emoji}</span>
            <span className="gh-text">{greeting.text}</span>
          </div>

          <div className="hero-logo-wrap">
            <div className="hero-logo-wire"></div>
            <div className="hero-logo-glow"></div>
            <div className="hero-logo-outer-ring"></div>
            <div className="hero-logo-ring"></div>
            <span className="steam s1"></span><span className="steam s2"></span><span className="steam s3"></span>
            <img className="hero-logo" src="/logo.png" alt="Coffee-r Attokahon" />
          </div>

          <div className="hero-eyebrow">Artisan Coffee &amp; Cuisine</div>
          <h1 className="hero-title">Welcome to<br /><em>Coffee-r Attokahon</em></h1>
          <div className="hero-tagline">Where Every Cup Tells a Story</div>

          <div className={`hero-table-chip ${tableNum ? 'show' : ''}`} id="heroTableChip">
            <span className="htc-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="3"/><path d="M5 13v6M19 13v6M3 10l1.5-5h15L21 10"/></svg>
            </span>
            <span className="htc-info">
              <span className="htc-eyebrow">Now Serving</span>
              <span className="htc-num-row">
                <span className="htc-num">Table {tableNum ? String(tableNum).padStart(2, '0') : ''}</span>
                <span className="ready-badge">Ready to Order</span>
              </span>
            </span>
            <span className="htc-live"><span className="dot"></span>Live</span>
          </div>

          <p className="hero-sub">Handcrafted coffees, seasonal flavors, and food made with intention — served in a space designed for moments that matter. Your table is ready whenever you are.</p>

          <div className="hero-ctas">
            <Link className="btn-hero-primary" id="browseBtn" href={tableNum ? `/order?table=${tableNum}` : '/order'} onClick={handleRipple}>
              <span className="bhp-icon">☰</span> Browse Full Menu <span className="bhp-arrow">→</span>
            </Link>
          </div>

          <div className="track-order-wrap" id="trackOrderWrap">
            <Link className="btn-track-order" id="trackOrderBtn" href={tableNum ? `/track?table=${tableNum}` : '/track'} onClick={handleRipple}>
              <span className="tob-dot"></span> Track Your Order <span className="tob-arrow">→</span>
            </Link>
          </div>

          <div className="hero-stats">
            <div><div className="h-stat-num">20+</div><div className="h-stat-lbl">Menu Items</div></div>
            <div className="h-stat-div"></div>
            <div><div className="h-stat-num">100%</div><div className="h-stat-lbl">Fresh Daily</div></div>
            <div className="h-stat-div"></div>
            <div><div className="h-stat-num">4.9★</div><div className="h-stat-lbl">Guest Rating</div></div>
          </div>
        </div>

        <div className="scroll-cue"><span>Scroll</span><span className="arrow"></span></div>
      </section>

      {/* POPULAR PICKS */}
      <section className="section specials" id="specials">
        <div className="section-inner">
          <div className="section-head center">
            <div className="section-eyebrow">Today's Specials</div>
            <span className="tbs-badge"><span className="tbs-ic">🏆</span>Today's Best Seller — Caramel Latte</span>
            <h2 className="section-title">Fan <em>Favorites</em></h2>
            <p className="section-sub">A few crowd-pleasers our guests keep coming back for — the full menu has plenty more waiting for you.</p>
            <div className="section-divider"></div>
          </div>
          <div className="best-grid">
            <Link className="best-card fade-target" href={tableNum ? `/order?table=${tableNum}` : '/order'}>
              <div className="best-badge">Best Seller</div>
              <div className="best-emoji"><img src="/images/product-coffee.png" alt="Caramel Latte" /></div>
              <div className="best-name">Caramel Latte</div>
              <div className="best-desc">Smooth espresso with house caramel drizzle.</div>
              <div className="best-price">৳140</div>
            </Link>
            <Link className="best-card fade-target" href={tableNum ? `/order?table=${tableNum}` : '/order'}>
              <div className="best-badge">Popular</div>
              <div className="best-emoji"><img src="/images/product-tea.png" alt="Cappuccino" /></div>
              <div className="best-name">Cappuccino</div>
              <div className="best-desc">Espresso with velvety steamed milk foam.</div>
              <div className="best-price">৳120</div>
            </Link>
            <Link className="best-card fade-target" href={tableNum ? `/order?table=${tableNum}` : '/order'}>
              <div className="best-badge">Chef's Pick</div>
              <div className="best-emoji"><img src="/images/product-cheesecake.png" alt="Cheesecake" /></div>
              <div className="best-name">Cheesecake</div>
              <div className="best-desc">New York style with seasonal berry compote.</div>
              <div className="best-price">৳190</div>
            </Link>
            <Link className="best-card fade-target" href={tableNum ? `/order?table=${tableNum}` : '/order'}>
              <div className="best-badge">Hearty</div>
              <div className="best-emoji"><img src="/images/product-sandwich.png" alt="Club Sandwich" /></div>
              <div className="best-name">Club Sandwich</div>
              <div className="best-desc">Chicken, lettuce, tomato, toasted bread.</div>
              <div className="best-price">৳180</div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
