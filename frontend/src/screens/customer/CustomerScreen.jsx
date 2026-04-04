import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SCREEN = {
  MENU: 'MENU',
  CUSTOMIZE: 'CUSTOMIZE',
  CART: 'CART',
  CHECKOUT: 'CHECKOUT',
};

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function buildDisplayLines(item) {
  const lines = [];
  if (item.sugarLevel) lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel) lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length) lines.push(`Toppings: ${item.toppingNames.join(', ')}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}

export default function CustomerScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(SCREEN.MENU);
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
  
  // API data
  const [menuItems, setMenuItems] = useState([]);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All']);

  // Load menu items and modifications on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Fetch menu items
        const menuRes = await fetch(`${API_BASE}/menu/items`);
        const menuData = await menuRes.json();
        const items = menuData.menuItems || menuData.items || [];
        setMenuItems(items.map(item => ({
          id: item.menu_item_id,
          name: item.name,
          cost: Number(item.cost),
          category: item.category || 'Other'
        })));
        
        // Extract unique categories
        const uniqueCategories = [...new Set(items.map(item => item.category || 'Other'))];
        setCategories(['All', ...uniqueCategories]);
        
        // Fetch modifications
        const modRes = await fetch(`${API_BASE}/cashier/modifications`);
        const modData = await modRes.json();
        
        setSugarOptions((modData.sugar || []).map(m => ({
          id: m.modification_type_id,
          name: m.name,
          cost: Number(m.cost)
        })));
        
        setIceOptions((modData.ice || []).map(m => ({
          id: m.modification_type_id,
          name: m.name,
          cost: Number(m.cost)
        })));
        
        setToppingOptions((modData.toppings || []).map(m => ({
          id: m.modification_type_id,
          name: m.name,
          cost: Number(m.cost)
        })));
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart]
  );

  const cartCount = cart.length;

  function clearCustomization() {
    setSelectedSugar(null);
    setSelectedIce(null);
    setSelectedToppings([]);
    setComments('');
    setCustomizeStep(1);
  }

  function handleSelectItem(item) {
    setCurrentItem(item);
    clearCustomization();
    setScreen(SCREEN.CUSTOMIZE);
  }

  function toggleTopping(topping) {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.id === topping.id);
      if (exists) return prev.filter((t) => t.id !== topping.id);
      return [...prev, topping];
    });
  }

  function addToCart() {
    if (!currentItem) return;

    const totalPrice =
      currentItem.cost +
      (selectedSugar?.cost || 0) +
      (selectedIce?.cost || 0) +
      selectedToppings.reduce((sum, t) => sum + t.cost, 0);

    const modificationIds = [
      selectedSugar?.id,
      selectedIce?.id,
      ...selectedToppings.map(t => t.id)
    ].filter(Boolean);

    const item = {
      id: Date.now(),
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sugarLevel: selectedSugar?.name || 'Regular',
      iceLevel: selectedIce?.name || 'Regular',
      toppingNames: selectedToppings.map((t) => t.name),
      comments: comments.trim(),
      modificationIds
    };

    setCart((prev) => [...prev, item]);
    clearCustomization();
    setCurrentItem(null);
    setScreen(SCREEN.MENU);
    setShowCart(true);
    setTimeout(() => setShowCart(false), 2000);
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function completeOrder() {
    async function submitOrder() {
      try {
        const orderPayload = {
          employee_id: 1, // Use employee ID 1 for customer kiosk orders
          payment_type: 'CARD',
          items: cart.map(item => ({
            menu_item_id: item.menuItemId,
            quantity: 1,
            modification_ids: item.modificationIds || [],
            comments: item.comments || ''
          }))
        };
        
        console.log('Submitting order:', orderPayload); // Debug log
        
        const response = await fetch(`${API_BASE}/cashier/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Order submission failed:', errorData);
          throw new Error(errorData.error || 'Order submission failed');
        }
        
        const result = await response.json();
        const orderNum = result.order?.order_id || Math.floor(1000 + Math.random() * 9000);
        
        // Clear cart and go back to menu
        setCart([]);
        setOrderNumber(orderNum);
        setScreen(SCREEN.MENU);
        setShowConfirmation(true);
        
        // Hide confirmation after 5 seconds
        setTimeout(() => {
          setShowConfirmation(false);
          setOrderNumber(null);
        }, 5000);
      } catch (error) {
        console.error('Order submission error:', error);
        alert(`Failed to submit order: ${error.message}. Please try again or see a cashier.`);
      }
    }
    
    submitOrder();
  }

  return (
    <div className="customer-page">
      {/* Header */}
      <header className="customer-header">
        <div className="header-content">
          <h1>Team 32's Boba Bar</h1>
          <button className="exit-btn" onClick={() => navigate('/')}>
            Exit
          </button>
        </div>
      </header>

      {/* Order Confirmation Notification */}
      {showConfirmation && (
        <div className="order-confirmation-notification">
          <div className="confirmation-content">
            <div className="confirmation-checkmark">✓</div>
            <div className="confirmation-text">
              <h3>Order Confirmed!</h3>
              <p>Order #{orderNumber}</p>
              <p className="confirmation-subtitle">Please proceed to the counter to pick up your order</p>
            </div>
          </div>
        </div>
      )}

      {/* Cart Badge */}
      {screen === SCREEN.MENU && cartCount > 0 && (
        <button className="cart-badge" onClick={() => setScreen(SCREEN.CART)}>
          <span className="cart-icon">🛒</span>
          <span className="cart-count">{cartCount}</span>
          <span className="cart-total">{currency(cartTotal)}</span>
        </button>
      )}

      {/* Menu Screen */}
      {screen === SCREEN.MENU && (
        <div className="customer-content">
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading menu...</div>}
          
          {!loading && (
            <>
              {/* Category Tabs */}
              <div className="category-tabs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu Grid */}
              <div className="menu-grid">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    className="menu-item-card"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{currency(item.cost)}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Customize Screen */}
      {screen === SCREEN.CUSTOMIZE && currentItem && (
        <div className="customer-content customize-screen">
          <div className="customize-header">
            <h2>{currentItem.name}</h2>
            <div className="customize-progress">Step {customizeStep} of 3</div>
          </div>

          {customizeStep === 1 && (
            <div className="customize-section">
              <h3>Choose Sugar Level</h3>
              <div className="option-grid">
                {sugarOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`option-btn ${selectedSugar?.id === option.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSugar(option)}
                  >
                    <div>{option.name}</div>
                    {option.cost > 0 && <div className="option-cost">+{currency(option.cost)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {customizeStep === 2 && (
            <div className="customize-section">
              <h3>Choose Ice Level</h3>
              <div className="option-grid">
                {iceOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`option-btn ${selectedIce?.id === option.id ? 'selected' : ''}`}
                    onClick={() => setSelectedIce(option)}
                  >
                    <div>{option.name}</div>
                    {option.cost > 0 && <div className="option-cost">+{currency(option.cost)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {customizeStep === 3 && (
            <div className="customize-section">
              <h3>Add Toppings (Optional)</h3>
              <div className="option-grid">
                {toppingOptions.map((option) => {
                  const isSelected = selectedToppings.some((t) => t.id === option.id);
                  return (
                    <button
                      key={option.id}
                      className={`option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleTopping(option)}
                    >
                      <div>{option.name}</div>
                      <div className="option-cost">+{currency(option.cost)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="comments-section">
                <label>Special Instructions (Optional)</label>
                <input
                  type="text"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g., less sweet, extra ice"
                  className="comments-input"
                />
              </div>
            </div>
          )}

          <div className="customize-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                if (customizeStep === 1) {
                  clearCustomization();
                  setCurrentItem(null);
                  setScreen(SCREEN.MENU);
                } else {
                  setCustomizeStep(customizeStep - 1);
                }
              }}
            >
              {customizeStep === 1 ? 'Cancel' : 'Back'}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (customizeStep === 3) {
                  addToCart();
                } else {
                  setCustomizeStep(customizeStep + 1);
                }
              }}
            >
              {customizeStep === 3 ? 'Add to Cart' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Cart Screen */}
      {screen === SCREEN.CART && (
        <div className="customer-content cart-screen">
          <h2>Your Cart</h2>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <button className="btn-primary" onClick={() => setScreen(SCREEN.MENU)}>
                Browse Menu
              </button>
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
                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        ✕
                      </button>
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
                <span>Total:</span>
                <span>{currency(cartTotal)}</span>
              </div>

              <div className="cart-actions">
                <button className="btn-secondary" onClick={() => setScreen(SCREEN.MENU)}>
                  Add More Items
                </button>
                <button className="btn-primary" onClick={() => setScreen(SCREEN.CHECKOUT)}>
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Checkout Screen */}
      {screen === SCREEN.CHECKOUT && (
        <div className="customer-content checkout-screen">
          <h2>Checkout</h2>

          <div className="checkout-summary">
            <div className="summary-row">
              <span>Items:</span>
              <span>{cartCount}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>{currency(cartTotal)}</span>
            </div>
          </div>

          <div className="payment-methods">
            <h3>Select Payment Method</h3>
            <button className="payment-btn" onClick={completeOrder}>
              💳 Credit/Debit Card
            </button>
            <button className="payment-btn" onClick={completeOrder}>
              📱 Mobile Payment
            </button>
            <button className="payment-btn" onClick={completeOrder}>
              🎁 Gift Card
            </button>
          </div>

          <button className="btn-secondary full-width" onClick={() => setScreen(SCREEN.CART)}>
            Back to Cart
          </button>
        </div>
      )}
    </div>
  );
}
