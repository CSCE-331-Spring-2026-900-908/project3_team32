import React, { useMemo, useState } from 'react';
import './CashierPOS.css';

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

const GROUPS = ['Milk Tea', 'Fruit Tea', 'Smoothies', 'Lattes', 'Seasonal'];
const SCREEN = {
  HOME: 'HOME',
  ITEM_SELECT: 'ITEM_SELECT',
  SUGAR: 'SUGAR',
  ICE: 'ICE',
  TOPPINGS: 'TOPPINGS',
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

export default function CashierPOS() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [previousScreen, setPreviousScreen] = useState(SCREEN.HOME);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState('');
  const [orderNumber, setOrderNumber] = useState(1001);
  const [statusMessage, setStatusMessage] = useState('');

  const mostCommonItems = useMemo(() => MENU_ITEMS.slice(0, 9), []);
  const visibleItems = useMemo(() => {
    if (!selectedCategory) return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const orderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price, 0),
    [orderItems]
  );

  function clearSelectionState() {
    setSelectedSugar(null);
    setSelectedIce(null);
    setSelectedToppings([]);
    setComments('');
  }

  function handleSelectItem(item, sourceScreen) {
    setCurrentItem(item);
    setPreviousScreen(sourceScreen);
    clearSelectionState();
    setScreen(SCREEN.SUGAR);
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
      (selectedSugar?.cost || 0) +
      (selectedIce?.cost || 0) +
      selectedToppings.reduce((sum, topping) => sum + topping.cost, 0);

    const item = {
      name: currentItem.name,
      price: totalPrice,
      sugarLevel: selectedSugar?.name || null,
      iceLevel: selectedIce?.name || null,
      toppingNames: selectedToppings.map((topping) => topping.name),
      comments: comments.trim(),
    };

    setOrderItems((prev) => [...prev, item]);
    clearSelectionState();
    setCurrentItem(null);
    setScreen(SCREEN.HOME);
    setStatusMessage(`${item.name} added to order.`);
  }

  function completeOrder(paymentMethod) {
    const completedOrder = orderNumber;
    setOrderNumber((prev) => prev + 1);
    setOrderItems([]);
    setCurrentItem(null);
    clearSelectionState();
    setScreen(SCREEN.HOME);
    setStatusMessage(`Order #${completedOrder} completed — ${paymentMethod} — ${currency(orderTotal)}`);
  }

  return (
    <div className="cashier-page">
      <div className="cashier-shell">
        <header className="cashier-header">
          <div>
            <h1>Cashier POS</h1>
            <p>Render-ready React cashier flow for Team 32</p>
          </div>
          <div className="cashier-pill">{screen}</div>
        </header>

        {statusMessage && <div className="cashier-status">{statusMessage}</div>}

        {screen === SCREEN.HOME && (
          <div className="cashier-grid">
            <section className="cashier-panel">
              <h2>Menu Categories</h2>
              <div className="category-grid">
                {GROUPS.map((group) => (
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
                    <div key={`${item.name}-${index}`} className="order-item">
                      <div className="order-topline">
                        <strong>{index + 1}. {item.name}</strong>
                        <span>{currency(item.price)}</span>
                      </div>
                      {buildDisplayLines(item).map((line) => (
                        <div key={line} className="order-detail">{line}</div>
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
              <button className="secondary-action" onClick={() => setScreen(SCREEN.HOME)}>Back</button>
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

        {screen === SCREEN.SUGAR && (
          <SelectionStep
            title="Select Sugar Level"
            options={SUGAR_OPTIONS}
            selectedId={selectedSugar?.id}
            onSelect={setSelectedSugar}
            onBack={() => {
              clearSelectionState();
              setScreen(previousScreen);
            }}
            onNext={() => setScreen(SCREEN.ICE)}
          />
        )}

        {screen === SCREEN.ICE && (
          <SelectionStep
            title="Select Ice Level"
            options={ICE_OPTIONS}
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
              {TOPPING_OPTIONS.map((option) => {
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
              <button className="secondary-action" onClick={() => setScreen(SCREEN.ICE)}>Back</button>
              <button className="primary-action" onClick={finalizeItem}>Add to Order</button>
            </div>
          </section>
        )}

        {screen === SCREEN.CHECKOUT && (
          <section className="cashier-panel checkout-panel">
            <h2>Checkout</h2>
            <div className="checkout-total">COST: {currency(orderTotal)}</div>
            <div className="checkout-grid">
              <button className="primary-action" onClick={() => completeOrder('Card')}>Card</button>
              <button className="primary-action" onClick={() => completeOrder('Cash')}>Cash</button>
              <button className="primary-action" onClick={() => completeOrder('Gift Card')}>Gift Card</button>
            </div>
            <div className="panel-actions">
              <button className="secondary-action" onClick={() => setScreen(SCREEN.HOME)}>Cancel</button>
            </div>
          </section>
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
        <button className="secondary-action" onClick={onBack}>Back</button>
        <button className="primary-action" onClick={onNext}>Next</button>
      </div>
    </section>
  );
}
