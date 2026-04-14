import React from "react";
import { SCREEN } from "../constants";
import { currency } from "../utils";

export default function ItemSelectScreen({ selectedCategory, visibleItems, handleSelectItem, setScreen }) {
  return (
    <section className="cashier-panel">
      <div className="panel-actions">
        <button className="secondary-action" onClick={() => setScreen(SCREEN.HOME)}>Back</button>
      </div>
      <h2>{selectedCategory || "All Items"}</h2>
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
  );
}
