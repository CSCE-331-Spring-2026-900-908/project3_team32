import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiDollarSign, FiGift } from 'react-icons/fi';
import './CashierScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SCREEN = {
  HOME: 'HOME',
  ITEM_SELECT: 'ITEM_SELECT',
  SIZE: 'SIZE',
  SUGAR: 'SUGAR',
  ICE: 'ICE',
  TOPPINGS: 'TOPPINGS',
  CHECKOUT: 'CHECKOUT',
  CONFIRMATION: 'CONFIRMATION',
};

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function buildDisplayLines(item) {
  const lines = [];
  if (item.sizeName) lines.push(`Size: ${item.sizeName}`);
  if (item.sugarLevel) lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel) lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length) lines.push(`Toppings: ${item.toppingNames.join(', ')}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}

export default function CashierPOS() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [previousScreen, setPreviousScreen] = useState(SCREEN.HOME);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState('');
  const [orderNumber, setOrderNumber] = useState(1001);
  const [statusMessage, setStatusMessage] = useState('');
  const [nextItemId, setNextItemId] = useState(1);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [completedOrderTotal, setCompletedOrderTotal] = useState(0);
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState('');
  
  // API data
  const [menuItems, setMenuItems] = useState([]);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

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
        setCategories(uniqueCategories);
        
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
        
        setSizeOptions((modData.sizes || []).map(m => ({
          id: m.modification_type_id,
          name: m.name,
          cost: Number(m.cost)
        })));
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setStatusMessage('Failed to load menu data. Please refresh.');
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const mostCommonItems = useMemo(() => menuItems.slice(0, 9), [menuItems]);
  const visibleItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const orderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price, 0),
    [orderItems]
  );

  function clearSelectionState() {
    setSelectedSize(null);
    setSelectedSugar(null);
    setSelectedIce(null);
    setSelectedToppings([]);
    setComments('');
  }

  function handleSelectItem(item, sourceScreen) {
    setCurrentItem(item);
    setPreviousScreen(sourceScreen);
    clearSelectionState();
    setScreen(sizeOptions.length > 0 ? SCREEN.SIZE : SCREEN.SUGAR);
  }

  function toggleTopping(topping) {
    setSelectedToppings((prev) => {
      const exists = prev.some((value) => value.id === topping.id);
      if (exists) return prev.filter((value) => value.id !== topping.id);
      return [...prev, topping];
    });
  }

  function finalizeItem() {
    if (!currentItem) return;

    const totalPrice =
      currentItem.cost +
      (selectedSize?.cost || 0) +
      (selectedSugar?.cost || 0) +
      (selectedIce?.cost || 0) +
      selectedToppings.reduce((sum, topping) => sum + topping.cost, 0);

    const modificationIds = [
      selectedSize?.id,
      selectedSugar?.id,
      selectedIce?.id,
      ...selectedToppings.map(t => t.id)
    ].filter(Boolean);

    const item = {
      id: nextItemId,
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sizeName: selectedSize?.name || null,
      sugarLevel: selectedSugar?.name || null,
      iceLevel: selectedIce?.name || null,
      toppingNames: selectedToppings.map((topping) => topping.name),
      comments: comments.trim(),
      modificationIds
    };

    setOrderItems((prev) => [...prev, item]);
    setNextItemId((prev) => prev + 1);
    clearSelectionState();
    setCurrentItem(null);
    setScreen(SCREEN.HOME);
  }

  function removeOrderItem(itemId) {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function completeOrder(paymentMethod) {
    async function submitOrder() {
      try {
        const orderPayload = {
          employee_id: 1, // TODO: Get from logged-in employee
          payment_type: paymentMethod.toUpperCase(),
          items: orderItems.map(item => ({
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
        const completedOrder = result.order?.order_id || orderNumber;
        
        // Store order details for confirmation screen
        setCompletedOrderId(completedOrder);
        setCompletedOrderTotal(orderTotal);
        setCompletedPaymentMethod(paymentMethod);
        
        // Show confirmation screen
        setScreen(SCREEN.CONFIRMATION);
        
        setOrderNumber((prev) => prev + 1);
      } catch (error) {
        console.error('Order submission error:', error);
        setStatusMessage('Failed to submit order. Please try again.');
      }
    }
    
    submitOrder();
  }

  function startNewOrder() {
    setOrderItems([]);
    setCurrentItem(null);
    clearSelectionState();
    setCompletedOrderId(null);
    setCompletedOrderTotal(0);
    setCompletedPaymentMethod('');
    setScreen(SCREEN.HOME);
  }

  return (
    <div className="cashier-page">
      <div className="cashier-shell">
        <header className="cashier-header">
          <div>
            <h1>Cashier</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="cashier-pill">{screen}</div>
            <button
              className="secondary-action"
              onClick={() => {
                localStorage.removeItem('role');
                localStorage.removeItem('employee');
                localStorage.removeItem('user');
                sessionStorage.clear();
                navigate('/login/employee');
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {screen === SCREEN.HOME && (
          <div className="cashier-grid">
            <section className="cashier-panel">
              <h2>Menu Categories</h2>
              <div className="category-grid">
                {categories.map((group) => (
                  <button
                    key={group}
                    className="category-button"
                    onClick={() => {
                      setSelectedCategory(group);
                      setScreen(SCREEN.ITEM_SELECT);
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <h2>Most Common Items</h2>
              <div className="common-grid">
                {mostCommonItems.map((item) => (
                  <button
                    key={item.id}
                    className="menu-card"
                    onClick={() => handleSelectItem(item, SCREEN.HOME)}
                  >
                    <strong>{item.name}</strong>
                    <span>{currency(item.cost)}</span>
                  </button>
                ))}
              </div>
            </section>

            <aside className="cashier-panel order-panel">
              <h2>Order Items List</h2>
              <div className="order-list">
                {orderItems.length === 0 ? (
                  <div className="empty-state">No items added yet.</div>
                ) : (
                  orderItems.map((item, index) => (
                    <div key={item.id} className="order-item">
                      <div className="order-topline">
                        <strong>{index + 1}. {item.name}</strong>
                        <div className="order-item-actions">
                          <span>{currency(item.price)}</span>
                          <button 
                            className="remove-order-item-btn"
                            onClick={() => removeOrderItem(item.id)}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {buildDisplayLines(item).map((line) => (
                        <div key={line} className="order-detail">
                          {line}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <div className="order-total">Total: {currency(orderTotal)}</div>
              <button
                className="primary-action"
                onClick={() => {
                  if (orderItems.length === 0) {
                    setStatusMessage('Add at least one item before checkout.');
                    return;
                  }
                  setScreen(SCREEN.CHECKOUT);
                }}
              >
                Begin Checkout
              </button>
            </aside>
          </div>
        )}

        {screen === SCREEN.ITEM_SELECT && (
          <section className="cashier-panel">
            <div className="panel-actions">
              <button className="secondary-action" onClick={() => setScreen(SCREEN.HOME)}>
                Back
              </button>
            </div>
            <h2>{selectedCategory || 'All Items'}</h2>
            <div className="item-grid">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  className="menu-card large"
                  onClick={() => handleSelectItem(item, SCREEN.ITEM_SELECT)}
                >
                  <strong>{item.name}</strong>
                  <span>{currency(item.cost)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === SCREEN.SIZE && (
          <SelectionStep
            title="Select Size"
            options={sizeOptions}
            selectedId={selectedSize?.id}
            onSelect={setSelectedSize}
            onBack={() => {
              clearSelectionState();
              setScreen(previousScreen);
            }}
            onNext={() => setScreen(SCREEN.SUGAR)}
          />
        )}

        {screen === SCREEN.SUGAR && (
          <SelectionStep
            title="Select Sugar Level"
            options={sugarOptions}
            selectedId={selectedSugar?.id}
            onSelect={setSelectedSugar}
            onBack={() => {
              if (sizeOptions.length > 0) {
                setScreen(SCREEN.SIZE);
              } else {
                clearSelectionState();
                setScreen(previousScreen);
              }
            }}
            onNext={() => setScreen(SCREEN.ICE)}
          />
        )}

        {screen === SCREEN.ICE && (
          <SelectionStep
            title="Select Ice Level"
            options={iceOptions}
            selectedId={selectedIce?.id}
            onSelect={setSelectedIce}
            onBack={() => setScreen(SCREEN.SUGAR)}
            onNext={() => setScreen(SCREEN.TOPPINGS)}
          />
        )}

        {screen === SCREEN.TOPPINGS && (
          <section className="cashier-panel">
            <h2>Select Toppings</h2>
            <div className="option-grid">
              {toppingOptions.map((option) => {
                const active = selectedToppings.some((value) => value.id === option.id);
                return (
                  <button
                    key={option.id}
                    className={`option-button ${active ? 'active' : ''}`}
                    onClick={() => toggleTopping(option)}
                  >
                    <strong>{option.name}</strong>
                    <span>+{currency(option.cost)}</span>
                  </button>
                );
              })}
            </div>

            <label className="comment-box">
              <span>Special Instructions</span>
              <input
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder="Ex: less sweet, no straw"
              />
            </label>

            <div className="panel-actions">
              <button className="secondary-action" onClick={() => setScreen(SCREEN.ICE)}>
                Back
              </button>
              <button className="primary-action" onClick={finalizeItem}>
                Add to Order
              </button>
            </div>
          </section>
        )}

        {screen === SCREEN.CHECKOUT && (
          <section className="cashier-panel checkout-panel">
            <div className="checkout-header">
              <button className="cancel-checkout-btn" onClick={() => setScreen(SCREEN.HOME)}>
                ← Cancel Order
              </button>
              <h2>Complete Payment</h2>
            </div>
            
            {/* Order Summary */}
            <div className="checkout-order-summary">
              <h3>Order Summary</h3>
              <div className="checkout-order-list">
                {orderItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="checkout-order-item">
                    <div className="checkout-item-header">
                      <strong>{index + 1}. {item.name}</strong>
                      <span>{currency(item.price)}</span>
                    </div>
                    {buildDisplayLines(item).map((line) => (
                      <div key={line} className="checkout-item-detail">
                        {line}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="checkout-summary">
              <div className="summary-label">Order Total</div>
              <div className="checkout-total">{currency(orderTotal)}</div>
              <div className="summary-items">{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="payment-section">
              <h3>Select Payment Method</h3>
              <div className="checkout-grid">
                <button className="payment-method-btn" onClick={() => completeOrder('Card')}>
                  <FiCreditCard className="payment-icon" />
                  <span className="payment-label">Card</span>
                </button>
                <button className="payment-method-btn" onClick={() => completeOrder('Cash')}>
                  <FiDollarSign className="payment-icon" />
                  <span className="payment-label">Cash</span>
                </button>
                <button className="payment-method-btn" onClick={() => completeOrder('Gift Card')}>
                  <FiGift className="payment-icon" />
                  <span className="payment-label">Gift Card</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === SCREEN.CONFIRMATION && (
          <div className="confirmation-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-icon">✓</div>
              
              <h2 className="confirmation-title">Order Complete</h2>
              
              <div className="confirmation-details">
                <div className="confirmation-row">
                  <span className="confirmation-label">Order Number</span>
                  <span className="confirmation-value">#{completedOrderId}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Total</span>
                  <span className="confirmation-value">{currency(completedOrderTotal)}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Payment</span>
                  <span className="confirmation-value">{completedPaymentMethod}</span>
                </div>
              </div>

              <button className="confirmation-btn" onClick={startNewOrder}>
                Start New Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionStep({ title, options, selectedId, onSelect, onBack, onNext }) {
  return (
    <section className="cashier-panel">
      <h2>{title}</h2>
      <div className="option-grid">
        {options.map((option) => (
          <button
            key={option.id}
            className={`option-button ${selectedId === option.id ? 'active' : ''}`}
            onClick={() => onSelect(option)}
          >
            <strong>{option.name}</strong>
            {option.cost > 0 && <span>+{currency(option.cost)}</span>}
          </button>
        ))}
      </div>
      <div className="panel-actions">
        <button className="secondary-action" onClick={onBack}>
          Back
        </button>
        <button className="primary-action" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}
