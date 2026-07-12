'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';

const MENU_ITEMS = [
  { id:'1', name:'Espresso',       cat:'Coffee',    price:80,  emoji:'☕', desc:'Rich double shot, bold and intense.' },
  { id:'2', name:'Cappuccino',     cat:'Coffee',    price:120, emoji:'🥛', desc:'Espresso with velvety steamed milk foam.' },
  { id:'3', name:'Caramel Latte',  cat:'Coffee',    price:140, emoji:'🍵', desc:'Smooth latte with house caramel drizzle.' },
  { id:'4', name:'Cold Brew',      cat:'Coffee',    price:150, emoji:'🧊', desc:'Slow-steeped, refreshing cold coffee.' },
  { id:'5', name:'Iced Mocha',     cat:'Coffee',    price:155, emoji:'🍫', desc:'Espresso, chocolate, cold milk over ice.' },
  { id:'6', name:'Matcha Latte',   cat:'Specialty', price:145, emoji:'🍃', desc:'Ceremonial matcha blended with oat milk.' },
  { id:'7', name:'Mango Smoothie', cat:'Specialty', price:130, emoji:'🥭', desc:'Fresh mango blended with yogurt and honey.' },
  { id:'8', name:'Croissant',      cat:'Food',      price:100, emoji:'🥐', desc:'Buttery and flaky, baked fresh every morning.' },
  { id:'9', name:'Club Sandwich',  cat:'Food',      price:180, emoji:'🥪', desc:'Chicken, lettuce, tomato, toasted bread.' },
  { id:'10',name:'Cheesecake',     cat:'Dessert',   price:190, emoji:'🍰', desc:'New York style with seasonal berry compote.' },
  { id:'11',name:'Avocado Toast',  cat:'Food',      price:160, emoji:'🥑', desc:'Sourdough, smashed avocado, chilli flakes.' },
  { id:'12',name:'Blueberry Muffin',cat:'Dessert',  price:90,  emoji:'🧁', desc:'Soft muffin loaded with blueberries.' },
];

export default function HomePage() {
  const { toggleTheme, products } = useApp();
  const displayProducts = products && products.length > 0 ? products : MENU_ITEMS;

  const [activeCat, setActiveCat] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scannedTable, setScannedTable] = useState(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('table')) {
        setScannedTable(params.get('table'));
      }
    }
  }, []);

  const cats = ['all', ...new Set(displayProducts.map(p => p.cat))];
  const filtered = activeCat === 'all' ? displayProducts : displayProducts.filter(p => p.cat === activeCat);
  const show = filtered.slice(0, 8);

  return (
    <>
      <style>{`
        nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(26,20,16,0.90);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);height:62px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;transition:var(--transition-theme);}
        [data-theme="light"] nav{background:rgba(240,232,216,0.90);}
        .nav-brand{font-family:var(--font-playfair),'Playfair Display',serif;font-size:20px;text-decoration:none;color:var(--text);}
        .nav-brand em{color:var(--gold);font-style:normal;}
        .nav-links{display:flex;align-items:center;gap:28px;}
        .nav-links a{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.2s;letter-spacing:0.3px;}
        .nav-links a:hover{color:var(--gold);}
        .nav-right{display:flex;align-items:center;gap:12px;}
        .btn-order-nav{padding:8px 20px;background:var(--gold);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s;text-decoration:none;display:inline-block;}
        .btn-order-nav:hover{background:var(--gold-h);}
        .nav-hamburger{display:none;background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--muted);cursor:pointer;font-size:16px;line-height:1;}
        .nav-hamburger[aria-expanded="true"]{border-color:var(--gold);color:var(--gold);}

        .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:80px 40px 60px;}
        .hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(200,148,56,0.12) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 90% 100%,rgba(200,148,56,0.08) 0%,transparent 60%);z-index:0;}
        .hero-ring{position:absolute;border-radius:50%;border:1px solid rgba(200,148,56,0.06);pointer-events:none;}
        .hero-ring.r1{width:600px;height:600px;top:50%;left:50%;transform:translate(-50%,-50%);}
        .hero-ring.r2{width:900px;height:900px;top:50%;left:50%;transform:translate(-50%,-50%);border-color:rgba(200,148,56,0.03);}
        .hero-content{position:relative;z-index:1;text-align:center;max-width:680px;}
        .hero-logo-wrap{width:clamp(170px,24vw,270px);height:clamp(170px,24vw,270px);margin:0 auto 24px;border-radius:50%;overflow:hidden;border:1px solid rgba(200,148,56,0.35);box-shadow:0 18px 54px rgba(0,0,0,0.28),0 0 0 8px rgba(200,148,56,0.06);background:var(--card);animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both;}
        .hero-logo-img{width:100%;height:100%;object-fit:cover;object-position:center;transform:scale(1.08);}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:var(--gold);margin-bottom:28px;animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both;}
        .hero-eyebrow::before,.hero-eyebrow::after{content:'';width:28px;height:1px;background:var(--gold);opacity:0.5;}
        .hero-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:clamp(46px,8vw,84px);line-height:1.05;letter-spacing:-1px;margin-bottom:22px;animation:fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both;}
        .hero-title em{color:var(--gold);font-style:italic;}
        .hero-sub{font-size:clamp(15px,2.5vw,18px);color:var(--muted);line-height:1.8;max-width:480px;margin:0 auto 40px;font-weight:300;animation:fadeUp 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both;}
        .hero-ctas{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;animation:fadeUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both;}
        .btn-hero-primary{padding:16px 36px;background:var(--gold);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;font-family:var(--font-playfair),'Playfair Display',serif;cursor:pointer;transition:background 0.2s,transform 0.15s;box-shadow:0 4px 24px rgba(200,148,56,0.30);text-decoration:none;display:inline-block;}
        .btn-hero-primary:hover{background:var(--gold-h);transform:translateY(-2px);}
        .btn-hero-ghost{padding:15px 32px;background:none;color:var(--text-2);border:1px solid var(--border-h);border-radius:14px;font-size:15px;cursor:pointer;transition:all 0.2s;text-decoration:none;display:inline-block;}
        .btn-hero-ghost:hover{border-color:var(--gold);color:var(--gold);}
        .hero-stats{display:flex;align-items:center;justify-content:center;gap:32px;margin-top:56px;padding-top:40px;border-top:1px solid var(--border);animation:fadeUp 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) both;}
        .h-stat-num{font-family:var(--font-playfair),'Playfair Display',serif;font-size:28px;color:var(--gold);}
        .h-stat-lbl{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:2px;}
        .h-stat-div{width:1px;height:36px;background:var(--border);}

        .section{padding:96px 40px;}
        .section-inner{max-width:1100px;margin:0 auto;}
        .section-eyebrow{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:12px;}
        .section-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:clamp(30px,5vw,48px);line-height:1.15;margin-bottom:16px;}
        .section-title em{color:var(--gold);font-style:italic;}
        .section-sub{font-size:15px;color:var(--muted);line-height:1.8;max-width:520px;font-weight:300;}
        .section-divider{width:48px;height:2px;background:linear-gradient(to right,var(--gold),transparent);margin:20px 0 40px;}

        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
        .about-text .section-sub{max-width:100%;}
        .about-values{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:32px;}
        .value-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;}
        .value-icon{font-size:22px;margin-bottom:8px;}
        .value-title{font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:4px;}
        .value-desc{font-size:12px;color:var(--muted);line-height:1.6;}
        .about-visual{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:40px;text-align:center;position:relative;overflow:hidden;}
        .about-visual-inner{position:relative;z-index:1;}
        .about-visual-logo{font-family:var(--font-playfair),'Playfair Display',serif;font-size:52px;margin-bottom:12px;}
        .about-visual-logo em{color:var(--gold);font-style:normal;}
        .about-visual-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--muted);}
        .about-visual-glow{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(200,148,56,0.10) 0%,transparent 70%);}
        .about-visual-ring{position:absolute;border-radius:50%;border:1px solid rgba(200,148,56,0.08);top:50%;left:50%;transform:translate(-50%,-50%);}
        .about-visual-ring.r1{width:160px;height:160px;}
        .about-visual-ring.r2{width:260px;height:260px;}
        .about-visual-ring.r3{width:360px;height:360px;}
        .about-since{margin-top:28px;padding-top:20px;border-top:1px solid var(--border);}
        .about-since-num{font-family:var(--font-playfair),'Playfair Display',serif;font-size:38px;color:var(--gold);}
        .about-since-lbl{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;}

        .menu-section{background:var(--bg2);}
        .menu-cats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px;}
        .menu-cat-pill{padding:7px 18px;border-radius:20px;border:1px solid var(--border);background:none;font-size:13px;cursor:pointer;color:var(--muted);transition:all 0.18s;}
        .menu-cat-pill.active{background:var(--gold);color:#fff;border-color:var(--gold);font-weight:600;}
        .menu-cat-pill:hover:not(.active){border-color:var(--border-h);color:var(--text);}
        .menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:32px;}
        .menu-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;transition:all 0.2s;box-shadow:var(--shadow);}
        .menu-card:hover{border-color:var(--border-h);transform:translateY(-3px);}
        .mc-emoji{font-size:36px;margin-bottom:12px;}
        .mc-name{font-size:15px;font-weight:600;color:var(--text);margin-bottom:3px;}
        .mc-cat{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px;}
        .mc-desc{font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px;flex:1;}
        .mc-price{font-size:16px;font-weight:700;color:var(--gold);}
        .menu-cta{text-align:center;padding-top:8px;}
        .btn-full-menu{display:inline-block;padding:14px 40px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;text-decoration:none;}
        .btn-full-menu:hover{background:var(--gold-h);}

        .best-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .best-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:28px 24px;text-align:center;position:relative;transition:all 0.2s;}
        .best-card:hover{border-color:var(--border-h);transform:translateY(-3px);}
        .best-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;border-radius:20px;padding:3px 14px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;}
        .best-emoji{font-size:44px;margin:10px 0 14px;}
        .best-name{font-family:var(--font-playfair),'Playfair Display',serif;font-size:18px;margin-bottom:6px;}
        .best-desc{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px;}
        .best-price{font-size:20px;font-weight:700;color:var(--gold);}

        .exp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .exp-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px 24px;}
        .exp-icon{font-size:28px;margin-bottom:14px;}
        .exp-title{font-family:var(--font-playfair),'Playfair Display',serif;font-size:18px;margin-bottom:8px;}
        .exp-desc{font-size:13px;color:var(--muted);line-height:1.7;}

        .gallery-section{background:var(--bg2);}
        .gallery-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:auto auto;gap:12px;}
        .gallery-item{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:56px;aspect-ratio:1;transition:transform 0.2s;cursor:default;}
        .gallery-item:hover{transform:scale(1.02);}
        .gallery-item.wide{grid-column:span 2;}
        .gallery-item.tall{grid-row:span 2;font-size:72px;}

        .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .contact-info-items{display:flex;flex-direction:column;gap:20px;margin-top:8px;}
        .ci-item{display:flex;gap:16px;align-items:flex-start;}
        .ci-icon{width:42px;height:42px;background:var(--pill-bg);border:1px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .ci-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:3px;}
        .ci-value{font-size:14px;color:var(--text-2);}
        .hours-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:16px;}
        .hours-row{display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;}
        .hours-day{color:var(--muted);}
        .hours-time{color:var(--text-2);font-weight:500;}
        .map-placeholder{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:40px;text-align:center;aspect-ratio:4/3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
        .map-icon{font-size:48px;}

        footer{background:var(--bg2);border-top:1px solid var(--border);padding:48px 40px 32px;}
        .footer-inner{max-width:1100px;margin:0 auto;}
        .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px;}
        .footer-brand-logo{font-family:var(--font-playfair),'Playfair Display',serif;font-size:26px;margin-bottom:8px;}
        .footer-brand-logo em{color:var(--gold);font-style:normal;}
        .footer-brand-desc{font-size:13px;color:var(--muted);line-height:1.7;max-width:220px;}
        .footer-col h5{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:14px;}
        .footer-col a{display:block;font-size:13px;color:var(--muted);text-decoration:none;margin-bottom:8px;transition:color 0.2s;}
        .footer-col a:hover{color:var(--gold);}
        .footer-bottom{border-top:1px solid var(--border);padding-top:24px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted);}

        @media(max-width:900px){
          .about-grid,.contact-grid{grid-template-columns:1fr;}
          .best-grid,.exp-grid{grid-template-columns:repeat(2,1fr);}
          .gallery-grid{grid-template-columns:repeat(2,1fr);}
          .gallery-item.wide,.gallery-item.tall{grid-column:span 1;grid-row:span 1;}
          .footer-grid{grid-template-columns:1fr 1fr;}
          nav{padding:0 20px;}
          .nav-links{display:none;}
          .nav-links.mobile-open{display:flex;position:absolute;top:62px;left:16px;right:16px;flex-direction:column;align-items:stretch;gap:0;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:8px;box-shadow:var(--shadow);}
          .nav-links.mobile-open a{padding:13px 14px;border-radius:10px;color:var(--text-2);}
          .nav-links.mobile-open a:hover{background:var(--hover-bg);color:var(--gold);}
          .nav-hamburger{display:block;}
          .section{padding:64px 20px;}
          .hero{padding:100px 20px 60px;}
          .hero-logo-wrap{margin-bottom:20px;}
        }
        @media(max-width:600px){
          .best-grid,.exp-grid,.footer-grid{grid-template-columns:1fr;}
          .hero-stats{flex-direction:column;gap:20px;}
          .h-stat-div{display:none;}
          .about-values{grid-template-columns:1fr;}
          .gallery-grid{grid-template-columns:repeat(2,1fr);}
          .hero-logo-wrap{width:160px;height:160px;}
        }
      `}</style>

      {/* NAV */}
      <nav>
        <Link className="nav-brand" href="/"><em>Coffee-r</em> Attokahon</Link>
        <div className={`nav-links${mobileOpen ? ' mobile-open' : ''}`}>
          <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
          <a href="#menu" onClick={() => setMobileOpen(false)}>Menu</a>
          <a href="#experience" onClick={() => setMobileOpen(false)}>Experience</a>
          <a href="#contact" onClick={() => setMobileOpen(false)}>Contact</a>
        </div>
        <div className="nav-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" />
          <Link className="btn-order-nav" href="/order">Order Online →</Link>
          <button
            className="nav-hamburger"
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            ☰
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-ring r1" />
        <div className="hero-ring r2" />
        <div className="hero-content">
          <div className="hero-logo-wrap">
            <Image
              className="hero-logo-img"
              src="/hero-logo.png"
              alt="Coffee-r Attokahon Eight Chapters logo"
              width={2816}
              height={1536}
              priority
              sizes="(max-width: 600px) 160px, (max-width: 900px) 24vw, 270px"
            />
          </div>
          <div className="hero-eyebrow">Artisan Coffee &amp; Cuisine</div>
          <h1 className="hero-title">Where Every Cup<br />Tells a <em>Story</em></h1>
          <p className="hero-sub">Handcrafted coffees, seasonal flavors, and food made with intention — served in a space designed for moments that matter.</p>
          {scannedTable && (
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--gold)', 
              marginBottom: '32px',
              padding: '12px 24px',
              background: 'rgba(200,148,56,0.1)',
              border: '1px solid rgba(200,148,56,0.3)',
              borderRadius: '12px',
              display: 'inline-block',
              animation: 'fadeUp 0.8s 0.25s cubic-bezier(0.16,1,0.3,1) both'
            }}>
              Your Table number is {scannedTable}
            </div>
          )}
          <div className="hero-ctas">
            <Link className="btn-hero-primary" href={`/order${scannedTable ? `?table=${scannedTable}` : ''}`}>Order at Your Table →</Link>
            <a className="btn-hero-ghost" href="#menu">Explore Our Menu</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="h-stat-num">12+</div>
              <div className="h-stat-lbl">Coffee Origins</div>
            </div>
            <div className="h-stat-div" />
            <div>
              <div className="h-stat-num">40+</div>
              <div className="h-stat-lbl">Menu Items</div>
            </div>
            <div className="h-stat-div" />
            <div>
              <div className="h-stat-num">☕</div>
              <div className="h-stat-lbl">Daily Fresh</div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="section-inner">
          <div className="about-grid">
            <div className="about-text">
              <div className="section-eyebrow">Our Story</div>
              <h2 className="section-title">Born from a love of<br /><em>exceptional</em> coffee</h2>
              <div className="section-divider" />
              <p className="section-sub">Coffee-r Attokahon began with a single pour-over and a belief that great coffee deserves unhurried attention. Every bean is sourced with care, every drink made with intention, and every visit designed to feel like a pause worth taking.</p>
              <div className="about-values">
                {[
                  { icon:'🌱', title:'Ethically Sourced', desc:'Direct trade with farms that prioritize sustainability and fair pay.' },
                  { icon:'🔥', title:'In-House Roasted', desc:'Beans roasted weekly to peak freshness, never shipped stale.' },
                  { icon:'🧑‍🍳', title:'Made to Order', desc:'Every item prepared fresh when you order, not before.' },
                  { icon:'☕', title:'Barista Trained', desc:'Our team trains extensively so your cup is always consistent.' },
                ].map((v, i) => (
                  <div className="value-card" key={i}>
                    <div className="value-icon">{v.icon}</div>
                    <div className="value-title">{v.title}</div>
                    <div className="value-desc">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-visual">
              <div className="about-visual-glow" />
              <div className="about-visual-ring r1" />
              <div className="about-visual-ring r2" />
              <div className="about-visual-ring r3" />
              <div className="about-visual-inner">
                <div className="about-visual-logo"><em>Coffee-r</em><br />Attokahon</div>
                <div className="about-visual-tag">Est. 2018 &nbsp;·&nbsp; Pabna, BD</div>
                <div className="about-since">
                  <div className="about-since-num">6+</div>
                  <div className="about-since-lbl">Years Serving Pabna</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MENU PREVIEW */}
      <section className="section menu-section" id="menu">
        <div className="section-inner">
          <div className="section-eyebrow">Our Menu</div>
          <h2 className="section-title">Crafted for every <em>craving</em></h2>
          <div className="section-divider" />
          <div className="menu-cats">
            {cats.map(c => (
              <button key={c} className={`menu-cat-pill${c === activeCat ? ' active' : ''}`}
                onClick={() => setActiveCat(c)}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="menu-grid">
            {show.map(p => (
              <div className="menu-card" key={p.id}>
                <div className="mc-emoji">{p.emoji}</div>
                <div className="mc-name">{p.name}</div>
                <div className="mc-cat">{p.cat}</div>
                <div className="mc-desc">{p.desc}</div>
                <div className="mc-price">৳{p.price}</div>
              </div>
            ))}
          </div>
          <div className="menu-cta">
            <Link className="btn-full-menu" href="/order">See Full Menu &amp; Order →</Link>
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="section" id="bestsellers">
        <div className="section-inner">
          <div className="section-eyebrow">Fan Favourites</div>
          <h2 className="section-title">Our <em>best sellers</em></h2>
          <div className="section-divider" />
          <div className="best-grid">
            <div className="best-card">
              <div className="best-badge">⭐ #1 Best Seller</div>
              <div className="best-emoji">🍫</div>
              <div className="best-name">Iced Mocha</div>
              <p className="best-desc">Espresso meets chocolate and cold milk over a mountain of ice — addictive from the first sip.</p>
              <div className="best-price">৳155</div>
            </div>
            <div className="best-card">
              <div className="best-badge">☕ Staff Pick</div>
              <div className="best-emoji">🥛</div>
              <div className="best-name">Cappuccino</div>
              <p className="best-desc">The classic. Espresso, velvety steamed milk, and a foam crown that takes years to perfect.</p>
              <div className="best-price">৳120</div>
            </div>
            <div className="best-card">
              <div className="best-badge">🍃 Seasonal</div>
              <div className="best-emoji">🍃</div>
              <div className="best-name">Matcha Latte</div>
              <p className="best-desc">Ceremonial grade matcha whisked with oat milk — earthy, smooth, and beautifully green.</p>
              <div className="best-price">৳145</div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="section" id="experience" style={{ background:'var(--bg2)' }}>
        <div className="section-inner">
          <div className="section-eyebrow">The Experience</div>
          <h2 className="section-title">More than coffee,<br />it&apos;s a <em>ritual</em></h2>
          <div className="section-divider" />
          <div className="exp-grid">
            {[
              { icon:'📱', title:'Scan & Order', desc:"Scan the QR on your table and order directly from your phone — no waving, no waiting for a waiter." },
              { icon:'⚡', title:'Live Kitchen Updates', desc:"Watch your order move from confirmed to ready in real time. No more wondering where your food is." },
              { icon:'💳', title:'Instant Payment', desc:"Pay instantly with bKash, Nagad, or Rocket. Receive a digital invoice the moment it's done." },
              { icon:'🌙', title:'Curated Atmosphere', desc:"Warm lighting, carefully chosen music, and interiors that invite you to slow down and stay awhile." },
              { icon:'🎯', title:'Zero Compromise', desc:"Every drink leaves our bar only when it meets the standard. Consistency is non-negotiable here." },
              { icon:'🌿', title:'Seasonal Specials', desc:"Our menu evolves with the seasons. Come back for limited offerings you won't find anywhere else." },
            ].map((e, i) => (
              <div className="exp-card" key={i}>
                <div className="exp-icon">{e.icon}</div>
                <div className="exp-title">{e.title}</div>
                <p className="exp-desc">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section gallery-section">
        <div className="section-inner">
          <div className="section-eyebrow">Atmosphere</div>
          <h2 className="section-title">A <em>space</em> to linger in</h2>
          <div className="section-divider" />
          <div className="gallery-grid">
            <div className="gallery-item">☕</div>
            <div className="gallery-item wide" style={{ fontSize:'36px', flexDirection:'column', gap:'8px' }}>
              <span style={{ fontSize:'52px' }}>🫘</span>
              <span style={{ fontFamily:'var(--font-playfair)', fontSize:'16px', color:'var(--gold)' }}>Single Origin</span>
            </div>
            <div className="gallery-item">🥐</div>
            <div className="gallery-item tall" style={{ fontSize:'48px', flexDirection:'column', gap:'10px' }}>
              <span style={{ fontSize:'64px' }}>🍃</span>
              <span style={{ fontFamily:'var(--font-playfair)', fontSize:'14px', color:'var(--gold)', textAlign:'center' }}>Matcha Season</span>
            </div>
            <div className="gallery-item">🍰</div>
            <div className="gallery-item">🧊</div>
            <div className="gallery-item">🥑</div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="section-inner">
          <div className="contact-grid">
            <div>
              <div className="section-eyebrow">Find Us</div>
              <h2 className="section-title">Come say <em>hello</em></h2>
              <div className="section-divider" />
              <div className="contact-info-items">
                <div className="ci-item">
                  <div className="ci-icon">📍</div>
                  <div>
                    <div className="ci-label">Address</div>
                    <div className="ci-value">House 12, Road 7, Pabna<br />Pabna 6600, Bangladesh</div>
                  </div>
                </div>
                <div className="ci-item">
                  <div className="ci-icon">📞</div>
                  <div>
                    <div className="ci-label">Phone</div>
                    <div className="ci-value">+880 1712-345678</div>
                  </div>
                </div>
                <div className="ci-item">
                  <div className="ci-icon">✉️</div>
                  <div>
                    <div className="ci-label">Email</div>
                    <div className="ci-value">hello@coffeer-attokahon.com</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:'28px' }}>
                <div className="section-eyebrow" style={{ marginBottom:'10px' }}>Opening Hours</div>
                <div className="hours-grid">
                  <div className="hours-row"><span className="hours-day">Mon – Fri</span><span className="hours-time">8am – 11pm</span></div>
                  <div className="hours-row"><span className="hours-day">Saturday</span><span className="hours-time">9am – 12am</span></div>
                  <div className="hours-row"><span className="hours-day">Sunday</span><span className="hours-time">9am – 10pm</span></div>
                  <div className="hours-row"><span className="hours-day">Holidays</span><span className="hours-time">10am – 9pm</span></div>
                </div>
              </div>
            </div>
            <div>
              <div className="map-placeholder">
                <div className="map-icon">🗺️</div>
                <h4 style={{ fontFamily:'var(--font-playfair)', fontSize:'18px', marginBottom:'4px' }}>Rajapur, Pabna</h4>
                <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:'1.6' }}>House 12, Road 7<br />Near Rajapur Lake</p>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer"
                  style={{ marginTop:'16px', display:'inline-block', padding:'10px 24px', background:'var(--gold)', color:'#fff', borderRadius:'10px', textDecoration:'none', fontSize:'13px', fontWeight:'600' }}>
                  Open in Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-logo"><em>Coffee-r</em> Attokahon</div>
              <p className="footer-brand-desc">A premium café experience built on quality, craft, and the belief that great coffee makes every moment better.</p>
            </div>
            <div className="footer-col">
              <h5>Order</h5>
              <Link href="/order">Menu</Link>
              <Link href="/order">Order Online</Link>
              <Link href="/billing">My Invoice</Link>
            </div>
            <div className="footer-col">
              <h5>Venue</h5>
              <a href="#about">About Us</a>
              <a href="#experience">Experience</a>
              <a href="#contact">Find Us</a>
            </div>
            <div className="footer-col">
              <h5>Staff</h5>
              <Link href="/admin">Admin Panel</Link>
              <Link href="/qr-print">QR Generator</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Coffee-r Attokahon. All rights reserved.</span>
            <span style={{ color:'var(--gold)' }}>☕ Crafted with care in Pabna, Bangladesh</span>
          </div>
        </div>
      </footer>
    </>
  );
}
