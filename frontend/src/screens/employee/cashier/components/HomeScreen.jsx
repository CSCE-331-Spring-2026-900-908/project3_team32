import React from "react";
import { FiX } from "react-icons/fi";
import { SCREEN } from "../constants";
import { currency, buildDisplayLines } from "../utils";

export default function HomeScreen({
  categories,
  mostCommonItems,
  orderItems,
  orderTotal,
  handleSelectItem,
  removeOrderItem,
  setScreen,
  setStatusMessage,
}) {
  return (
    <div className="cashier-grid">
      {/* ── Left panel: category grid + most common items ── */}
      <section className="cashier-panel">
        <h2>Menu Categories</h2>
        <div className="category-grid">
          {categories.map((group) => (
            <button
              key={group}
              className="category-button"
              onClick={() => setScreen(SCREEN.ITEM_SELECT, group)}
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

      {/* ── Right panel: order sidebar ── */}
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
                      <FiX />
                    </button>
                  </div>
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
              setStatusMessage("Add at least one item before checkout.");
              return;
            }
            setScreen(SCREEN.CHECKOUT);
          }}
        >
          Begin Checkout
        </button>
      </aside>
    </div>
  );
}
