import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './CustomerScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';

const LANGUAGE_CODE_ALIASES = { iw: 'he', jw: 'jv' };

const SCREEN = { MENU: 'MENU', CUSTOMIZE: 'CUSTOMIZE', CART: 'CART', CHECKOUT: 'CHECKOUT' };

function currency(value) { return `$${value.toFixed(2)}`; }

function buildDisplayLines(item) {
  const lines = [];
  if (item.sugarLevel && item.sugarLevel !== 'Regular') lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel && item.iceLevel !== 'Regular') lines.push(`Ice: ${item.iceLevel}`);
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
  const { user, logout } = useAuth();
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierZoom, setMagnifierZoom] = useState(2);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);

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
  
  // Ref for magnifier scroll tracking
  const mousePosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const translateContainerId = useMemo(() => `google_translate_${Math.random().toString(36).substring(7)}`, []);

  useEffect(() => { magnifierZoomRef.current = magnifierZoom; }, [magnifierZoom]);

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
        const CATEGORY_ORDER = ['Milk Tea', 'Fruit Tea', 'Fresh Brew', 'Matcha', 'Ice Blended', 'Specialty'];
        const rawCategories = [...new Set(items.map(item => item.category || 'Other'))];
        const sortedCategories = [
          ...CATEGORY_ORDER.filter(c => rawCategories.includes(c)),
          ...rawCategories.filter(c => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories(['All', ...sortedCategories]);
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

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = `${textScale}%`;
    return () => { root.style.fontSize = prev; };
  }, [textScale]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrastEnabled) {
      root.style.filter = 'grayscale(100%) contrast(250%) brightness(95%)';
    } else {
      root.style.filter = '';
    }
    return () => { root.style.filter = ''; };
  }, [highContrastEnabled]);

  // The "click outside to close" useEffect has been completely removed to lock the menu open.

  useEffect(() => {
    if (!magnifierEnabled) return;
    
    function updateMagnifier() {
      const mag = magnifierRef.current;
      const inner = lensInnerRef.current;
      if (!mag || !inner) return;

      const { x, y } = mousePosRef.current;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const z = magnifierZoomRef.current;

      const lensSize = 350; 
      const half = lensSize / 2;

      mag.style.left = `${x}px`;
      mag.style.top = `${y}px`;
      mag.style.width = `${lensSize}px`;
      mag.style.height = `${lensSize}px`;

      inner.style.transform = `scale(${z})`;
      inner.style.left = `${-(x + scrollX) * z + half}px`;
      inner.style.top = `${-(y + scrollY) * z + half}px`;

      const syncFixedElement = (realId, magId) => {
        const realEl = document.getElementById(realId);
        const magEl = document.getElementById(magId);
        if (realEl && magEl) {
          const rect = realEl.getBoundingClientRect();
          magEl.style.top = `${rect.top + scrollY}px`;
          magEl.style.left = `${rect.left + scrollX}px`;
          magEl.style.width = `${rect.width}px`;
          magEl.style.height = `${rect.height}px`;
        }
      };

      syncFixedElement('real-cart-badge', 'magnified-cart-badge');
      syncFixedElement('real-confirmation', 'magnified-confirmation');
    }

    function handleMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      updateMagnifier();
    }

    function handleScroll() {
      updateMagnifier();
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    updateMagnifier(); 

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [magnifierEnabled]);


  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return menuItems;
    return menuItems.filter(item => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const cartCount = cart.length;

  function clearCustomization() {
    setSelectedSugar(null); setSelectedIce(null);
    setSelectedToppings([]); setComments(''); setCustomizeStep(1);
  }
  
  function handleSelectItem(item) {
    setCurrentItem(item); clearCustomization(); setScreen(SCREEN.CUSTOMIZE);
  }

  function toggleTopping(topping) {
    setSelectedToppings(prev => {
      const exists = prev.some(t => t.id === topping.id);
      if (exists) return prev.filter(t => t.id !== topping.id);
      return [...prev, topping];
    });
  }

  function addToCart() {
    if (!currentItem) return;
    const totalPrice = currentItem.cost + (selectedSugar?.cost || 0) + (selectedIce?.cost || 0) + selectedToppings.reduce((sum, t) => sum + t.cost, 0);
    const modificationIds = [selectedSugar?.id, selectedIce?.id, ...selectedToppings.map(t => t.id)].filter(Boolean);
    const item = {
      id: Date.now(), menuItemId: currentItem.id, name: currentItem.name, price: totalPrice,
      sugarLevel: selectedSugar?.name || 'Regular', iceLevel: selectedIce?.name || 'Regular',
      toppingNames: selectedToppings.map(t => t.name), comments: comments.trim(), modificationIds
    };
    setCart(prev => [...prev, item]);
    clearCustomization(); setCurrentItem(null); setScreen(SCREEN.MENU);
  }

  function removeFromCart(itemId) { 
    setCart(prev => prev.filter(item => item.id !== itemId)); 
  }

  function completeOrder(paymentType) {
    async function submitOrder() {
      try {
        const orderPayload = {
          employee_id: 1, payment_type: paymentType,
          items: cart.map(item => ({ menu_item_id: item.menuItemId, quantity: 1, modification_ids: item.modificationIds || [], comments: item.comments || '' }))
        };
        const response = await fetch(`${API_BASE}/cashier/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) });
        if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Order submission failed'); }
        const result = await response.json();
        const orderNum = result.order?.order_id || Math.floor(1000 + Math.random() * 9000);
        setCart([]); setOrderNumber(orderNum); setScreen(SCREEN.MENU); setShowConfirmation(true);
        setTimeout(() => { setShowConfirmation(false); setOrderNumber(null); }, 5000);
      } catch (error) {
        console.error('Order submission error:', error);
        alert(`Failed to submit order: ${error.message}. Please try again or see a cashier.`);
      }
    }
    submitOrder();
  }

  const textSizePercent = ((textScale - 85) / (140 - 85)) * 100;
  const zoomPercent = ((magnifierZoom - 1.5) / (4 - 1.5)) * 100;

  const renderAppContent = (isMagnified = false) => (
    <>
      <header className="customer-header">
        <div className="header-content">
          <h1>Team 32's Boba Bar</h1>
          <div className="header-actions">

            <div className="accessibility-wrapper" ref={isMagnified ? null : accessibilityPanelRef}>
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
                <section className="a11y-section">
                  <div className="a11y-section-header">
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

                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">Language</span>
                  </div>
                  <div id={isMagnified ? undefined : translateContainerId} className="google-translate-widget" />
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header" style={{ marginBottom: 0 }}>
                    <span className="a11y-section-title">Contrast (B&W)</span>
                    <button className={`a11y-toggle${highContrastEnabled ? ' on' : ' off'}`} onClick={() => setHighContrastEnabled(v => !v)}>
                      {highContrastEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header">
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

            {user && (
              <div className="customer-user-badge">
                {user.picture ? (
                  <img src={user.picture} alt="" className="customer-user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="customer-user-avatar customer-user-avatar-fallback">
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="customer-user-name">{user.name || user.email}</span>
              </div>
            )}
            <button className="exit-btn" onClick={() => { logout(); navigate('/login/customer'); }}>Exit</button>
          </div>
        </div>
      </header>

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

          {screen === SCREEN.CUSTOMIZE && currentItem && (
            <div className="customer-content customize-screen">
              <div className="customize-header">
                <h2>Customize: {currentItem.name}</h2>
                <span className="customize-progress">Step {customizeStep} of 2</span>
              </div>

              {customizeStep === 1 ? (
                <>
                  <div className="customize-section">
                    <h3>Sugar Level</h3>
                    <div className="option-grid">
                      {sugarOptions.map(opt => (
                        <button key={opt.id} className={`option-btn ${selectedSugar?.id === opt.id ? 'selected' : ''}`} onClick={() => setSelectedSugar(opt)}>
                          {opt.name}
                          {opt.cost > 0 && <div className="option-cost">+{currency(opt.cost)}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="customize-section">
                    <h3>Ice Level</h3>
                    <div className="option-grid">
                      {iceOptions.map(opt => (
                        <button key={opt.id} className={`option-btn ${selectedIce?.id === opt.id ? 'selected' : ''}`} onClick={() => setSelectedIce(opt)}>
                          {opt.name}
                          {opt.cost > 0 && <div className="option-cost">+{currency(opt.cost)}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="customize-actions">
                    <button className="btn-secondary" onClick={() => setScreen(SCREEN.MENU)}>Cancel</button>
                    <button className="btn-primary" onClick={() => setCustomizeStep(2)}>Next: Toppings</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="customize-section">
                    <h3>Toppings</h3>
                    <div className="option-grid">
                      {toppingOptions.map(opt => {
                        const isSelected = selectedToppings.some(t => t.id === opt.id);
                        return (
                          <button key={opt.id} className={`option-btn ${isSelected ? 'selected' : ''}`} onClick={() => toggleTopping(opt)}>
                            {opt.name}
                            {opt.cost > 0 && <div className="option-cost">+{currency(opt.cost)}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="comments-section">
                    <label>Special Instructions</label>
                    <input type="text" className="comments-input" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="e.g., Extra shaken, half boba..." />
                  </div>
                  <div className="customize-actions">
                    <button className="btn-secondary" onClick={() => setCustomizeStep(1)}>Back</button>
                    <button className="btn-primary" onClick={addToCart}>
                      Add to Cart - {currency(currentItem.cost + (selectedSugar?.cost || 0) + (selectedIce?.cost || 0) + selectedToppings.reduce((sum, t) => sum + t.cost, 0))}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {screen === SCREEN.CART && (
            <div className="customer-content cart-screen">
              <h2>Your Order</h2>
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <p>Your cart is empty.</p>
                  <button className="btn-primary" onClick={() => setScreen(SCREEN.MENU)}>Back to Menu</button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map((item, index) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-header">
                          <span className="cart-item-number">{index + 1}.</span>
                          <span className="cart-item-name">{item.name}</span>
                          <span className="cart-item-price">{currency(item.price)}</span>
                          <button className="remove-btn" onClick={() => removeFromCart(item.id)}>×</button>
                        </div>
                        <div className="cart-item-details">
                          {buildDisplayLines(item).map((line, i) => (
                            <div key={i} className="cart-item-detail">{line}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="cart-total">
                    <span>Total</span>
                    <span>{currency(cartTotal)}</span>
                  </div>
                  <div className="cart-actions">
                    <button className="btn-secondary" onClick={() => setScreen(SCREEN.MENU)}>Add More Items</button>
                    <button className="btn-primary" onClick={() => setScreen(SCREEN.CHECKOUT)}>Proceed to Checkout</button>
                  </div>
                </>
              )}
            </div>
          )}

          {screen === SCREEN.CHECKOUT && (
            <div className="customer-content checkout-screen">
              <h2>Checkout</h2>
              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Items ({cartCount})</span>
                  <span>{currency(cartTotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (8.25%)</span>
                  <span>{currency(cartTotal * 0.0825)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{currency(cartTotal * 1.0825)}</span>
                </div>
              </div>
              <div className="payment-methods">
                <h3>Select Payment Method</h3>
                <button className="payment-btn" onClick={() => completeOrder('CARD')}>💳 Pay with Card</button>
                <button className="payment-btn" onClick={() => { alert('Please see cashier to pay with cash.'); completeOrder('CASH'); }}>💵 Pay with Cash</button>
              </div>
              <div className="cart-actions">
                <button className="btn-secondary full-width" onClick={() => setScreen(SCREEN.CART)}>Back to Cart</button>
              </div>
            </div>
          )}
      </div>

      {showConfirmation && (
        <div 
          id={isMagnified ? 'magnified-confirmation' : 'real-confirmation'}
          className="order-confirmation-notification"
          style={isMagnified ? { transform: 'none', left: 0, top: 0 } : {}}
        >
          <div className="confirmation-content">
            <div className="confirmation-checkmark">✓</div>
            <div className="confirmation-text">
              <h3>Order Received!</h3>
              <p>Order Number: #{orderNumber}</p>
              <p className="confirmation-subtitle">Please wait for your number to be called.</p>
            </div>
          </div>
        </div>
      )}

      {screen !== SCREEN.CART && screen !== SCREEN.CHECKOUT && cartCount > 0 && (
        <button 
          id={isMagnified ? 'magnified-cart-badge' : 'real-cart-badge'}
          className="cart-badge" 
          onClick={() => setScreen(SCREEN.CART)}
          style={isMagnified ? { bottom: 'auto', right: 'auto', margin: 0 } : {}}
        >
          <span className="cart-icon">🛒</span>
          <span className="cart-count">{cartCount}</span>
          <span>{currency(cartTotal)}</span>
        </button>
      )}
    </>
  );

  return (
    <div className="customer-page">
      {renderAppContent(false)}

      {magnifierEnabled && (
        <div ref={magnifierRef} className="magnifier-v1">
          <div ref={lensInnerRef} className="magnified-content">
            {renderAppContent(true)}
          </div>
          <div className="magnifier-badge">{magnifierZoom}×</div>
        </div>
      )}
    </div>
  );
}
