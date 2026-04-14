import React from "react";
import { FiChevronDown } from "react-icons/fi";

export default function CashierHeader({
  screen,
  ordersDropdownOpen,
  setOrdersDropdownOpen,
  todayOrders,
  completedOrders,
  onToggleOrderStatus,
  user,
  handleExit,
}) {
  return (
    <header className="cashier-header">
      <div className="header-left">
        <h1>Cashier</h1>
      </div>

      <div className="header-right">
        <div className="today-orders-wrapper">
          <button
            className="today-orders-btn"
            onClick={() => setOrdersDropdownOpen((o) => !o)}
            aria-expanded={ordersDropdownOpen}
          >
            Today's Orders
            <FiChevronDown className={`today-orders-caret${ordersDropdownOpen ? " open" : ""}`} />
          </button>

          {ordersDropdownOpen && (
            <div className="today-orders-dropdown">
              {todayOrders.length === 0 ? (
                <div className="today-orders-empty">No orders placed today yet.</div>
              ) : (
                todayOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`today-order-entry${completedOrders.has(order.id) ? " completed" : ""}`}
                  >
                    <div className="today-order-main">
                      <div className="today-order-info">
                        <span className="today-order-number">Order #{order.id}</span>
                        <ul className="today-order-items">
                          {order.items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                      <label className="today-order-check" title="Mark as completed">
                        <input
                          type="checkbox"
                          checked={completedOrders.has(order.id)}
                          onChange={() => onToggleOrderStatus(order.id)}
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
            <span className="cashier-user-name">{user.name || "Brian Qiu"}</span>
            <span className="cashier-user-role">{user.position || user.role || "Cashier"}</span>
          </div>
        )}
        <button className="cashier-exit-button" onClick={handleExit}>Exit</button>
      </div>
    </header>
  );
}
