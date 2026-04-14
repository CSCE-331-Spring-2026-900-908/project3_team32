import React from "react";
import { currency } from "../utils";

export default function SelectionStep({ title, options, selectedId, onSelect, onBack, onNext }) {
  return (
    <section className="cashier-panel">
      <h2>{title}</h2>
      <div className="option-grid">
        {options.map((option) => (
          <button
            key={option.id}
            className={`option-button ${selectedId === option.id ? "active" : ""}`}
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
