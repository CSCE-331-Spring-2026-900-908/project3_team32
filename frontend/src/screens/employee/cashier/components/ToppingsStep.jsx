import React from "react";
import { SCREEN } from "../constants";
import { currency } from "../utils";

export default function ToppingsStep({
  toppingOptions,
  selectedToppings,
  toggleTopping,
  comments,
  setComments,
  setScreen,
  finalizeItem,
}) {
  return (
    <section className="cashier-panel">
      <h2>Select Toppings</h2>
      <div className="option-grid">
        {toppingOptions.map((option) => {
          const active = selectedToppings.some((t) => t.id === option.id);
          return (
            <button
              key={option.id}
              className={`option-button ${active ? "active" : ""}`}
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
          onChange={(e) => setComments(e.target.value)}
          placeholder="Ex: less sweet, no straw"
        />
      </label>

      <div className="panel-actions">
        <button className="secondary-action" onClick={() => setScreen(SCREEN.ICE)}>Back</button>
        <button className="primary-action" onClick={finalizeItem}>Add to Order</button>
      </div>
    </section>
  );
}
