import React from "react";
import { FiArrowLeft, FiCreditCard } from "react-icons/fi";
import { SCREEN } from "../constants";
import { currency } from "../utils";

export default function FinalTotalScreen({ orderTotal, tipAmount, pendingPaymentMethod, setScreen, completeOrder }) {
  return (
    <section className="cashier-panel checkout-panel">
      <div className="checkout-header">
        <button className="cancel-checkout-btn" onClick={() => setScreen(SCREEN.TIP)}><FiArrowLeft /> Back</button>
        <h2>Final Total</h2>
      </div>

      <div className="checkout-order-summary" style={{ padding: "30px" }}>
        <div style={{ fontSize: "1.25rem", marginBottom: "15px", display: "flex", justifyContent: "space-between", color: "#495057" }}>
          <span>Subtotal:</span>
          <span>{currency(orderTotal)}</span>
        </div>
        <div style={{ fontSize: "1.25rem", marginBottom: "20px", display: "flex", justifyContent: "space-between", color: "#495057" }}>
          <span>Tip:</span>
          <span>{currency(tipAmount)}</span>
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: "800", borderTop: "2px solid #dee2e6", paddingTop: "20px", display: "flex", justifyContent: "space-between", color: "#8b4513" }}>
          <span>Total:</span>
          <span>{currency(orderTotal + tipAmount)}</span>
        </div>
      </div>

      <button
        className="payment-method-btn"
        style={{ width: "100%", padding: "24px", fontSize: "1.5rem", marginTop: "20px", display: "flex", justifyContent: "center", gap: "15px", background: "#8b4513", color: "white", borderColor: "#8b4513" }}
        onClick={() => completeOrder(pendingPaymentMethod)}
      >
        <FiCreditCard size={32} />
        <span>Tap to Pay {currency(orderTotal + tipAmount)}</span>
      </button>
    </section>
  );
}
