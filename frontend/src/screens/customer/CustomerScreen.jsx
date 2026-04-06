import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import './CustomerScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';

const LANGUAGE_CODE_ALIASES = { iw: 'he', jw: 'jv' };

const SCREEN = { MENU: 'MENU', CUSTOMIZE: 'CUSTOMIZE', CART: 'CART', CHECKOUT: 'CHECKOUT' };

function currency(value) { return `$${value.toFixed(2)}`; }

function buildDisplayLines(item) {
  const lines = [];
  if (item.sugarLevel) lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel) lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length) lines.push(`Toppings: ${item.toppingNames.join(', ')}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}

function toNativeLanguageName(languageCode, fallback) {
  if (!languageCode) return fallback;
  const [baseCode] = languageCode.split('-');
  const normalizedBaseCode = LANGUAGE_CODE_ALIASES[baseCode] || baseCode;
  const normalizedLocale = languageCode.replace(baseCode, normalizedBaseCode);
  try {
    const displayNames = new Intl.DisplayNames([normalizedLocale], { type: 'language' });
    return displayNames.of(normalizedBaseCode) || fallback;
  } catch { return fallback; }
}

export default function CustomerScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(SCREEN.MENU);
  const [textScale, setTextScale] = useState(100);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [customizeStep, setCustomizeStep] = useState(1);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState('');
  const [orderNumber, setOrderNumber] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Accessibility panel state
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierZoom, setMagnifierZoom] = useState(2);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);

  // API data
  const [menuItems, setMenuItems] = useState([]);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All']);

  const magnifierRef = useRef(null);
  const lensInnerRef = useRef(null);
  const magnifierZoomRef = useRef(magnifierZoom);
  const accessibilityPanelRef = useRef(null);

  const translateContainerId = useMemo(() => `google_translate_${Math.random().toString(36).substring(7)}`, []);

  useEffect(() => { magnifierZoomRef.current = magnifierZoom; }, [magnifierZoom]);

  // --- Data loading ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const menuRes = await fetch(`${API_BASE}/menu/items`);
        const menuData = await menuRes.json();
        const items = menuData.menuItems || menuData.items || [];
        setMenuItems(items.map(item => ({
          id: item.menu_item_id, name: item.name,
          cost: Number(item.cost), category: item.category || 'Other'
        })));
        const uniqueCategories = [...new Set(items.map(item => item.category || 'Other'))];
        setCategories(['All', ...uniqueCategories]);
        const modRes = await fetch(`${API_BASE}/cashier/modifications`);
        const modData = await modRes.json();
        setSugarOptions((modData.sugar || []).map(m => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setIceOptions((modData.ice || []).map(m => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setToppingOptions((modData.toppings || []).map(m => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- Google Translate ---
  useEffect(() => {
    let labelInterval = null;

    function initializeGoogleTranslate() {
      if (!window.google?.translate) return;
      
      const container = document.getElementById(translateContainerId);
      if (!container || container.childElementCount > 0) return;

      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          translateContainerId
        );
      } catch (error) {
        console.error('Google Translate init error:', error);
      }

      let attempts = 0;
      labelInterval = window.setInterval(() => {
        attempts += 1;
        const select = document.querySelector(`#${translateContainerId} select.goog-te-combo`);
        let updated = false;

        if (select) {
          Array.from(select.options).forEach((option) => {
            const code = option.value;
            if (!code) { option.text = 'English'; return; }
            const newText = toNativeLanguageName(code, option.text);
            if (option.text !== newText) {
              option.text = newText;
              updated = true;
            }
          });
        }
        if (updated || attempts >= 50) {
          window.clearInterval(labelInterval);
          labelInterval = null;
        }
      }, 150);
    }

    window.googleTranslateElementInit = initializeGoogleTranslate;

    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (labelInterval) window.clearInterval(labelInterval);
      const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
      if (existingScript) existingScript.remove();
      if (window.google && window.google.translate) {
        delete window.google.translate;
      }
      const injectedElements = document.querySelectorAll('.skiptranslate, iframe.goog-te-menu-frame, #goog-gt-tt');
      injectedElements.forEach(el => el.remove());
    };
  }, [translateContainerId]);

  // --- Text scale ---
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = `${textScale}%`;
    return () => { root.style.fontSize = prev; };
  }, [textScale]);

  // --- High Contrast (Global) ---
  useEffect(() => {
    const root = document.documentElement;
    if (highContrastEnabled) {
      root.style.filter = 'grayscale(100%) contrast(120%) brightness(95%)';
    } else {
      root.style.filter = '';
    }
    return () => { root.style.filter = ''; };
  }, [highContrastEnabled]);

  // --- Close accessibility dropdown on outside click ---
  useEffect(() => {
    if (!accessibilityOpen) return;
    function handleOutside(e) {
      if (accessibilityPanelRef.current && !accessibilityPanelRef.current.contains(e.target)) {
        setAccessibilityOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [accessibilityOpen]);

  // --- Magnifier: PERFECT ALIGNMENT MATH ---
  useEffect(() => {
    if (!magnifierEnabled) return;
    function handleMouseMove(e) {
      const mag = magnifierRef.current;
      const inner = lensInnerRef.current;
      if (!mag || !inner) return;
      
      const lw = Math.round(window.innerWidth / 2.5);
      const lh = Math.round(window.innerHeight / 2.5);
      const z = magnifierZoomRef.current;

      mag.style.left = `${e.clientX - lw / 2}px`;
      mag.style.top = `${e.clientY - lh / 2}px`;

      inner.style.left = `${(lw / 2) - 4}px`; 
      inner.style.top = `${(lh / 2) - 4}px`;

      const pageX = e.clientX + window.scrollX;
      const pageY = e.clientY + window.scrollY;
      
      inner.style.transformOrigin = '0 0';
      inner.style.transform = `scale(${z}) translate(${-pageX}px, ${-pageY}px)`;
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [magnifierEnabled]);

  // --- Magnifier: HTML2CANVAS SNAPSHOT ENGINE ---
  useEffect(() => {
    if (!magnifierEnabled) return;
    
    let isDrawing = false; 

    async function updateSnapshot() {
      if (isDrawing) return;
      const pageEl = document.querySelector('.customer-page');
      const inner = lensInnerRef.current;
      const magOverlay = magnifierRef.current;
      if (!pageEl || !inner || !magOverlay) return;

      isDrawing = true;

      try {
        // We let html2canvas naturally detect device scale (Retina) for a sharper image
        const canvas = await html2canvas(pageEl, {
          logging: false,
          useCORS: true,
          scale: window.devicePixelRatio || 1, 
          backgroundColor: '#fef3e2'
        });

        const filters = highContrastEnabled 
          ? `grayscale(100%) contrast(120%) brightness(95%)` 
          : `contrast(110%)`;

        canvas.style.filter = filters;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        
        // CRITICAL STRETCH FIX: 
        // Bind the CSS sizing strictly to the page's layout dimensions (offsetWidth/offsetHeight).
        // This decouples the CSS sizing from the high-res physical canvas pixels.
        canvas.style.width = `${pageEl.offsetWidth}px`;
        canvas.style.height = `${pageEl.offsetHeight}px`;
        
        canvas.style.pointerEvents = 'none'; 

        inner.appendChild(canvas);
        while (inner.childNodes.length > 1) {
          inner.removeChild(inner.firstChild);
        }
      } catch (err) {
        console.error('Magnifier snapshot failed:', err);
      }
      isDrawing = false;
    }

    updateSnapshot();
    const interval = setInterval(updateSnapshot, 350);
    return () => clearInterval(interval);
  }, [magnifierEnabled, highContrastEnabled, accessibilityOpen]); // Added accessibilityOpen so it forces a snapshot when menu opens

  // --- Cart helpers ---
  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return menuItems;
    return menuItems.filter(item => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  function clearCustomization() {
    setSelectedSugar(null); setSelectedIce(null);
    setSelectedToppings([]); setComments(''); setCustomizeStep(1);
  }
  function handleSelectItem(item) {
    setCurrentItem(item); clearCustomization(); setScreen(SCREEN.CUSTOMIZE);
  }
  
  const lensW = typeof window !== 'undefined' ? Math.round(window.innerWidth / 2.5) : 400;
  const lensH = typeof window !== 'undefined' ? Math.round(window.innerHeight / 2.5) : 300;

  const textSizePercent = ((textScale - 85) / (140 - 85)) * 100;
  const zoomPercent = ((magnifierZoom - 1.5) / (4 - 1.5)) * 100;

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div className="header-content">
          <h1>Team 32's Boba Bar</h1>
          <div className="header-actions">

            <div className="accessibility-wrapper" ref={accessibilityPanelRef}>
              <button
                className="accessibility-toggle-btn"
                onClick={() => setAccessibilityOpen(o => !o)}
                aria-expanded={accessibilityOpen}
                aria-haspopup="true"
              >
                <img 
                  src="https://uxwing.com/wp-content/themes/uxwing/download/web-app-development/accessibility-icon.png" 
                  alt="Accessibility" 
                />
                <span>Accessibility</span>
                <span className={`a11y-caret${accessibilityOpen ? ' open' : ''}`}>▾</span>
              </button>

              <div 
                className={`accessibility-panel ${accessibilityOpen ? 'open' : ''}`} 
                style={{ padding: '1.5rem' }}
              >
                {/* Text Size */}
                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-icon"></span>
                    <span className="a11y-section-title">Text Size</span>
                    <span className="a11y-section-value">{textScale}%</span>
                  </div>
                  <input type="range" min="85" max="140" step="5"
                    value={textScale} onChange={e => setTextScale(Number(e.target.value))}
                    className="a11y-slider"
                    style={{ background: `linear-gradient(to right, #8b4513 ${textSizePercent}%, #e5d4b8 ${textSizePercent}%)` }} 
                  />
                </section>

                <div className="a11y-divider" />

                {/* Language */}
                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-icon"></span>
                    <span className="a11y-section-title">Language</span>
                  </div>
                  <div id={translateContainerId} className="google-translate-widget" />
                </section>

                <div className="a11y-divider" />

                {/* Contrast */}
                <section className="a11y-section">
                  <div className="a11y-section-header" style={{ marginBottom: 0 }}>
                    <span className="a11y-section-icon"></span>
                    <span className="a11y-section-title">Contrast (B&W)</span>
                    <button className={`a11y-toggle${highContrastEnabled ? ' on' : ' off'}`} onClick={() => setHighContrastEnabled(v => !v)}>
                      {highContrastEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </section>

                <div className="a11y-divider" />

                {/* Magnifier */}
                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-icon"></span>
                    <span className="a11y-section-title">Magnifier</span>
                    <button className={`a11y-toggle${magnifierEnabled ? ' on' : ' off'}`} onClick={() => setMagnifierEnabled(v => !v)}>
                      {magnifierEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {magnifierEnabled && (
                    <div className="magnifier-controls">
                      <label className="a11y-control-label">Zoom &nbsp;<strong>{magnifierZoom}×</strong></label>
                      <input type="range" min="1.5" max="4" step="0.5"
                        value={magnifierZoom} onChange={e => setMagnifierZoom(Number(e.target.value))}
                        className="a11y-slider"
                        style={{ background: `linear-gradient(to right, #8b4513 ${zoomPercent}%, #e5d4b8 ${zoomPercent}%)` }}
                      />
                    </div>
                  )}
                </section>
              </div>
            </div>

            <button className="exit-btn" onClick={() => navigate('/')}>Exit</button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="customer-content-wrapper">
          {screen === SCREEN.MENU && (
            <div className="customer-content">
                <div className="category-tabs">
                    {categories.map(cat => (
                        <button key={cat} className={`category-tab${selectedCategory === cat ? ' active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
                    ))}
                </div>
                <div className="menu-grid">
                    {visibleItems.map(item => (
                        <button key={item.id} className="menu-item-card" onClick={() => handleSelectItem(item)}>
                            <div className="item-name">{item.name}</div>
                            <div className="item-price">{currency(item.cost)}</div>
                        </button>
                    ))}
                </div>
            </div>
          )}
      </div>

      {/* Magnifier Lens Overlay */}
      {magnifierEnabled && (
        <div
          ref={magnifierRef}
          className="magnifier-overlay"
          data-html2canvas-ignore="true" 
          style={{
            position: 'fixed',
            width: `${lensW}px`,
            height: `${lensH}px`,
            overflow: 'hidden',
            borderRadius: '16px',
            border: '4px solid #8b4513',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
            zIndex: 9998,
            pointerEvents: 'none',
            background: '#fff',
            left: 0,
            top: 0,
          }}
        >
          <div ref={lensInnerRef} style={{ position: 'absolute', pointerEvents: 'none' }} />
          <div className="magnifier-badge"> {magnifierZoom}×</div>
        </div>
      )}
    </div>
  );
}