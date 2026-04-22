import React from "react";
import { FiCheck } from "react-icons/fi";
import { currency } from "../utils";

export default function ConfirmationScreen({ completedOrderId, completedOrderTotal, completedPaymentMethod, startNewOrder }) {
  return (
    <div className="confirmation-overlay">
      <div className="confirmation-modal">
        <div className="confirmation-icon"><FiCheck /></div>
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
        <button className="confirmation-btn" onClick={startNewOrder}>Start New Order</button>
      </div>
    </div>
  );
}
