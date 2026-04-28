import React from "react";
import { FiArrowLeft } from "react-icons/fi";
import { SCREEN } from "../constants";

export default function TipRequestScreen({ setScreen, onRequestTip, onSkipTip }) {
  return (
    <section className="cashier-panel checkout-panel">
      <div className="checkout-header">
        <button className="cancel-checkout-btn" onClick={() => setScreen(SCREEN.CHECKOUT)}>
          <FiArrowLeft /> Back
        </button>
        <h2>Request Tip?</h2>
      </div>

      <div className="checkout-order-summary" style={{ padding: "30px", textAlign: "center" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Ask customer for tip</h3>
        <p style={{ margin: 0, color: "#6c757d", fontSize: "1.05rem" }}>
          Cashier chooses whether to show the tip selection screen.
        </p>
      </div>

      <div className="checkout-grid">
        <button className="payment-method-btn" onClick={onRequestTip}>
          Yes, Request Tip
        </button>
        <button className="payment-method-btn" onClick={onSkipTip}>
          No Tip
        </button>
      </div>
    </section>
  );
}
