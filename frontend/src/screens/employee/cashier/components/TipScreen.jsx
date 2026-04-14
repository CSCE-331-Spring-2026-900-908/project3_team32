import React from "react";
import { SCREEN } from "../constants";
import { currency } from "../utils";

export default function TipScreen({
  orderTotal,
  showCustomTip,
  setShowCustomTip,
  customTipValue,
  setCustomTipValue,
  handleTipSelection,
  setScreen,
}) {
  return (
    <div className="tip-overlay">
      <div className="tip-modal">
        <h2>Select Tip Amount</h2>

        {!showCustomTip ? (
          <div className="tip-options">
            <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.2)}>
              20%
              <span className="tip-amount-label">{currency(orderTotal * 0.2)}</span>
            </button>
            <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.25)}>
              25%
              <span className="tip-amount-label">{currency(orderTotal * 0.25)}</span>
            </button>
            <button className="tip-button" onClick={() => handleTipSelection(orderTotal * 0.3)}>
              30%
              <span className="tip-amount-label">{currency(orderTotal * 0.3)}</span>
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
                style={{ padding: "20px", fontSize: "1.5rem", flex: 1 }}
                onClick={() => setShowCustomTip(false)}
              >
                Back
              </button>
              <button
                className="primary-action"
                style={{ padding: "20px", fontSize: "1.5rem", flex: 2, background: "#8b4513", color: "white", border: "none" }}
                onClick={() => handleTipSelection(Number(customTipValue) || 0)}
              >
                Confirm Tip
              </button>
            </div>
          </div>
        )}

        <button className="tip-cancel-btn" onClick={() => setScreen(SCREEN.CHECKOUT)}>
          Cancel Payment
        </button>
      </div>
    </div>
  );
}
