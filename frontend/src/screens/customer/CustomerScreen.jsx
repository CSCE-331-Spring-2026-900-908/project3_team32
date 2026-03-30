import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerScreen.css';

const MENU_ITEMS = [
  { id: 1, name: 'Classic Milk Tea', cost: 4.5, category: 'Milk Tea' },
  { id: 2, name: 'Brown Sugar Milk Tea', cost: 5.25, category: 'Milk Tea' },
  { id: 3, name: 'Strawberry Fruit Tea', cost: 4.95, category: 'Fruit Tea' },
  { id: 4, name: 'Mango Fruit Tea', cost: 4.95, category: 'Fruit Tea' },
  { id: 5, name: 'Taro Smoothie', cost: 5.75, category: 'Smoothies' },
  { id: 6, name: 'Mango Smoothie', cost: 5.75, category: 'Smoothies' },
  { id: 7, name: 'Matcha Latte', cost: 5.5, category: 'Lattes' },
  { id: 8, name: 'Thai Tea Latte', cost: 5.25, category: 'Lattes' },
  { id: 9, name: 'Wintermelon Special', cost: 5.95, category: 'Seasonal' },
  { id: 10, name: 'Jasmine Milk Tea', cost: 4.75, category: 'Milk Tea' },
  { id: 11, name: 'Peach Green Tea', cost: 4.85, category: 'Fruit Tea' },
  { id: 12, name: 'Coffee Latte', cost: 5.35, category: 'Lattes' },
];

const SUGAR_OPTIONS = [
  { id: 1, name: '0% Sugar', cost: 0 },
  { id: 2, name: '25% Sugar', cost: 0 },
  { id: 3, name: '50% Sugar', cost: 0 },
  { id: 4, name: '75% Sugar', cost: 0 },
  { id: 5, name: '100% Sugar', cost: 0 },
  { id: 6, name: 'Extra Sugar', cost: 0.25 },
];

const ICE_OPTIONS = [
  { id: 7, name: 'No Ice', cost: 0 },
  { id: 8, name: 'Less Ice', cost: 0 },
  { id: 9, name: 'Regular Ice', cost: 0 },
  { id: 10, name: 'Extra Ice', cost: 0 },
];

const TOPPING_OPTIONS = [
  { id: 11, name: 'Boba', cost: 0.75 },
  { id: 12, name: 'Pudding', cost: 0.75 },
  { id: 13, name: 'Grass Jelly', cost: 0.75 },
  { id: 14, name: 'Aloe Vera', cost: 0.75 },
  { id: 15, name: 'Lychee Jelly', cost: 0.75 },
  { id: 16, name: 'Red Bean', cost: 0.75 },
  { id: 17, name: 'Cheese Foam', cost: 1.0 },
];

const CATEGORIES = ['All', 'Milk Tea', 'Fruit Tea', 'Smoothies', 'Lattes', 'Seasonal'];

const SCREEN = {
  MENU: 'MENU',
  CUSTOMIZE: 'CUSTOMIZE',
  CART: 'CART',
  CHECKOUT: 'CHECKOUT',
  CONFIRMATION: 'CONFIRMATION',
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

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

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

    const item = {
      id: Date.now(),
      name: currentItem.name,
      price: totalPrice,
      sugarLevel: selectedSugar?.name || 'Regular',
      iceLevel: selectedIce?.name || 'Regular',
      toppingNames: selectedToppings.map((t) => t.name),
      comments: comments.trim(),
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
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    setOrderNumber(orderNum);
    setScreen(SCREEN.CONFIRMATION);
    setTimeout(() => {
      setCart([]);
      setOrderNumber(null);
      setScreen(SCREEN.MENU);
    }, 5000);
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
          {/* Category Tabs */}
          <div className="category-tabs">
            {CATEGORIES.map((cat) => (
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
                {SUGAR_OPTIONS.map((option) => (
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
                {ICE_OPTIONS.map((option) => (
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
                {TOPPING_OPTIONS.map((option) => {
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

      {/* Confirmation Screen */}
      {screen === SCREEN.CONFIRMATION && (
        <div className="customer-content confirmation-screen">
          <div className="confirmation-icon">✓</div>
          <h2>Order Confirmed!</h2>
          <div className="order-number">Order #{orderNumber}</div>
          <p>Please proceed to the counter to pick up your order</p>
          <p className="redirect-message">Returning to menu...</p>
        </div>
      )}
    </div>
  );
}
