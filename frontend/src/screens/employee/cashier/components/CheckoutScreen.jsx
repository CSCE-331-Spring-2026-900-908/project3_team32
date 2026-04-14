import React from "react";
import { FiArrowLeft, FiCreditCard, FiDollarSign, FiGift } from "react-icons/fi";
import { SCREEN } from "../constants";
import { currency, buildDisplayLines } from "../utils";

export default function CheckoutScreen({ orderItems, orderTotal, setScreen, handlePaymentSelection }) {
  return (
    <section className="cashier-panel checkout-panel">
      <div className="checkout-header">
        <button className="cancel-checkout-btn" onClick={() => setScreen(SCREEN.HOME)}>
          <FiArrowLeft /> Cancel Order
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
                <div key={line} className="checkout-item-detail">{line}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="checkout-summary">
        <div className="summary-label">Order Total</div>
        <div className="checkout-total">{currency(orderTotal)}</div>
        <div className="summary-items">
          {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="payment-section">
        <h3>Select Payment Method</h3>
        <div className="checkout-grid">
          <button className="payment-method-btn" onClick={() => handlePaymentSelection("Card")}>
            <FiCreditCard className="payment-icon" />
            <span className="payment-label">Card</span>
          </button>
          <button className="payment-method-btn" onClick={() => handlePaymentSelection("Cash")}>
            <FiDollarSign className="payment-icon" />
            <span className="payment-label">Cash</span>
          </button>
          <button className="payment-method-btn" onClick={() => handlePaymentSelection("Gift Card")}>
            <FiGift className="payment-icon" />
            <span className="payment-label">Gift Card</span>
          </button>
        </div>
      </div>
    </section>
  );
}
