import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiDollarSign, FiGift } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext.jsx';
import './CashierScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SCREEN = {
  HOME: 'HOME',
  ITEM_SELECT: 'MENU ITEMS',
  SIZE: 'SIZE',
  SUGAR: 'SUGAR LEVEL',
  ICE: 'ICE LEVEL',
  TOPPINGS: 'TOPPINGS',
  CHECKOUT: 'CHECKOUT',
  TIP: 'TIP',              
  FINAL_TOTAL: 'FINAL_TOTAL', 
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
  const { user, token, logout, isManager } = useAuth();
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
  const [tipAmount, setTipAmount] = useState(0);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTipValue, setCustomTipValue] = useState('');
  const [todayOrders, setTodayOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState(new Set());
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);
  
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
        
        const CATEGORY_ORDER = ['Milk Tea', 'Fruit Tea', 'Fresh Brew', 'Matcha', 'Ice Blended', 'Specialty'];
        const rawCategories = [...new Set(items.map(item => item.category || 'Other'))];
        const sortedCategories = [
          ...CATEGORY_ORDER.filter(c => rawCategories.includes(c)),
          ...rawCategories.filter(c => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories(sortedCategories);
        
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

  useEffect(() => {
    async function loadTodayOrders() {
      try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/cashier/orders/today`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const orders = data.orders || data || [];
        setTodayOrders(orders.map(order => ({
          id: order.order_id,
          items: (order.items || []).map(i => i.name || i.menu_item_name || `Item ${i.menu_item_id}`),
        })));
      } catch {
        // silently fail — dropdown will just be empty until an order is placed
      }
    }
    loadTodayOrders();
  }, [token]);

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

  function handlePaymentSelection(method) {
    if (method === 'Card' || method === 'Gift Card') {
      setPendingPaymentMethod(method);
      setShowCustomTip(false);
      setCustomTipValue('');
      setScreen(SCREEN.TIP);
    } else {
      setTipAmount(0);
      completeOrder(method);
    }
  }

  function handleTipSelection(amount) {
    setTipAmount(amount);
    setScreen(SCREEN.FINAL_TOTAL);
  }

  function completeOrder(paymentMethod) {
    async function submitOrder() {
      try {
        const employeeId = Number(user?.employee_id);
        if (!Number.isInteger(employeeId) || employeeId <= 0) {
          setStatusMessage('Unable to identify logged-in employee. Please sign in again.');
          return;
        }

        const orderPayload = {
          employee_id: employeeId,
          payment_type: paymentMethod.toUpperCase(),
          items: orderItems.map(item => ({
            menu_item_id: item.menuItemId,
            quantity: 1,
            modification_ids: item.modificationIds || [],
            comments: item.comments || ''
          }))
        };
        
        console.log('Submitting order:', orderPayload); // Debug log

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/cashier/orders`, {
          method: 'POST',
          headers,
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
        setCompletedOrderTotal(orderTotal + tipAmount);
        setCompletedPaymentMethod(paymentMethod);

        // Add to today's orders dropdown
        setTodayOrders(prev => [...prev, {
          id: completedOrder,
          items: orderItems.map(i => i.name),
        }]);
        
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
    setTipAmount(0);
    setPendingPaymentMethod(null);
    setShowCustomTip(false);
    setCustomTipValue('');
    setScreen(SCREEN.HOME);
  }

  console.log("Current User Data:", user);
  function handleExit() {
    if (isManager) {
      navigate('/employee', { replace: true });
      return;
    }

    logout();
    localStorage.removeItem('role');
    localStorage.removeItem('employee');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/login/employee', { replace: true });
  }

  return (
    <div className="cashier-page">
      <div className="cashier-shell">
        <header className="cashier-header">
          <div className="header-left">
            <h1>Cashier</h1>
          </div>

          <div className="header-right">
            <div className="today-orders-wrapper">
              <button
                className="today-orders-btn"
                onClick={() => setOrdersDropdownOpen(o => !o)}
                aria-expanded={ordersDropdownOpen}
              >
                Today's Orders
                <span className={`today-orders-caret${ordersDropdownOpen ? ' open' : ''}`}>▾</span>
              </button>

              {ordersDropdownOpen && (
                <div className="today-orders-dropdown">
                  {todayOrders.length === 0 ? (
                    <div className="today-orders-empty">No orders placed today yet.</div>
                  ) : (
                    todayOrders.map(order => (
                      <div key={order.id} className={`today-order-entry${completedOrders.has(order.id) ? ' completed' : ''}`}>
                        <div className="today-order-main">
                          <div className="today-order-info">
                            <span className="today-order-number">Order #{order.id}</span>
                            <ul className="today-order-items">
                              {order.items.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <label className="today-order-check" title="Mark as completed">
                            <input
                              type="checkbox"
                              checked={completedOrders.has(order.id)}
                              onChange={() => {
                                setCompletedOrders(prev => {
                                  const next = new Set(prev);
                                  if (next.has(order.id)) next.delete(order.id);
                                  else next.add(order.id);
                                  return next;
                                });
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="cashier-pill">{screen}</div>

            {user && (
              <div className="cashier-user-block">
                <span className="cashier-user-label">Signed In As</span>
                <span className="cashier-user-name">{user.name || 'Brian Qiu'}</span>
                <span className="cashier-user-role">{user.position || user.role || 'Cashier'}</span>
              </div>
            )}
            <button
              className="cashier-exit-button"
              onClick={handleExit}
            >
              Exit
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
                <button className="payment-method-btn" onClick={() => handlePaymentSelection('Card')}>
                  <FiCreditCard className="payment-icon" />
                  <span className="payment-label">Card</span>
                </button>
                <button className="payment-method-btn" onClick={() => handlePaymentSelection('Cash')}>
                  <FiDollarSign className="payment-icon" />
                  <span className="payment-label">Cash</span>
                </button>
                <button className="payment-method-btn" onClick={() => handlePaymentSelection('Gift Card')}>
                  <FiGift className="payment-icon" />
                  <span className="payment-label">Gift Card</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === SCREEN.TIP && (
          <div className="tip-overlay">
            <div className="tip-modal">
              <h2>Select Tip Amount</h2>
              
              {!showCustomTip ? (
                <div className="tip-options">
                  <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.20)}>
                    20%
                    <span className="tip-amount-label">{currency(orderTotal * 0.20)}</span>
                  </button>
                  <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.25)}>
                    25%
                    <span className="tip-amount-label">{currency(orderTotal * 0.25)}</span>
                  </button>
                  <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.30)}>
                    30%
                    <span className="tip-amount-label">{currency(orderTotal * 0.30)}</span>
                  </button>
                  <button className="tip-button" onClick={() => setShowCustomTip(true)}>
                    Custom
                    <span className="tip-amount-label">Enter Custom Amount</span>
                  </button>
                </div>
              ) : (
                <div className="custom-tip-container">
                  <div className="custom-tip-input-wrapper">
                    <span className="custom-tip-currency">$</span>
                    <input
                      type="number"
                      className="custom-tip-input"
                      value={customTipValue}
                      onChange={(e) => setCustomTipValue(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                  <div className="custom-tip-actions">
                    <button 
                      className="secondary-action" 
                      style={{ padding: '20px', fontSize: '1.5rem', flex: 1 }} 
                      onClick={() => setShowCustomTip(false)}
                    >
                      Back
                    </button>
                    <button 
                      className="primary-action" 
                      style={{ padding: '20px', fontSize: '1.5rem', flex: 2, background: '#8b4513', color: 'white', border: 'none' }} 
                      onClick={() => handleTipSelection(Number(customTipValue) || 0)}
                    >
                      Confirm Tip
                    </button>
                  </div>
                </div>
              )}

              <button className="tip-cancel-btn" onClick={() => setScreen(SCREEN.CHECKOUT)}>Cancel Payment</button>
            </div>
          </div>
        )}

        {screen === SCREEN.FINAL_TOTAL && (
          <section className="cashier-panel checkout-panel">
             <div className="checkout-header">
                <button className="cancel-checkout-btn" onClick={() => setScreen(SCREEN.TIP)}>Back</button>
                <h2>Final Total</h2>
             </div>
             <div className="checkout-order-summary" style={{ padding: '30px' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', color: '#495057' }}>
                  <span>Subtotal:</span>
                  <span>{currency(orderTotal)}</span>
                </div>
                <div style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', color: '#495057' }}>
                  <span>Tip:</span>
                  <span>{currency(tipAmount)}</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', borderTop: '2px solid #dee2e6', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', color: '#8b4513' }}>
                  <span>Total:</span>
                  <span>{currency(orderTotal + tipAmount)}</span>
                </div>
             </div>
             <button 
                className="payment-method-btn" 
                style={{ width: '100%', padding: '24px', fontSize: '1.5rem', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px', background: '#8b4513', color: 'white', borderColor: '#8b4513' }} 
                onClick={() => completeOrder(pendingPaymentMethod)}
             >
                <FiCreditCard size={32} />
                <span>Tap to Pay {currency(orderTotal + tipAmount)}</span>
             </button>
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