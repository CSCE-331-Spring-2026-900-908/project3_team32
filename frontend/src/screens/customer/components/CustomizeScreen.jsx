import React from "react";
import { FiArrowLeft, FiCheck, FiCoffee, FiDroplet, FiWind, FiList } from "react-icons/fi";
import { currency } from "../utils";

export default function CustomizeScreen({
  currentItem,
  selectedSugar,
  setSelectedSugar,
  selectedIce,
  setSelectedIce,
  selectedToppings,
  toggleTopping,
  comments,
  setComments,
  handleCancelCustomization,
  saveCustomizedItem,
  editingCartItemId,
  sugarOptions,
  iceOptions,
  toppingOptions,
}) {
  const livePrice =
    currentItem.cost +
    (selectedSugar?.cost || 0) +
    (selectedIce?.cost || 0) +
    selectedToppings.reduce((sum, t) => sum + t.cost, 0);

  return (
    <div className="customize-fullpage customize-fullpage-single">
      <div className="customize-top-bar">
        <button className="kiosk-back-btn" onClick={handleCancelCustomization}><FiArrowLeft /> Back</button>
        <div className="customize-item-summary">
          <span className="customize-item-name">{currentItem.name}</span>
          <span className="customize-item-price">{currency(livePrice)}</span>
        </div>
      </div>

      <div className="customize-single-content">
        <div className="customize-single-left">
          <div className="customize-sections-grid">
            <section className="customize-section-card">
              <h2 className="customize-step-title customize-step-title-left">Sugar</h2>
              <div className="customize-option-grid customize-option-grid-compact">
                {sugarOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={`customize-option-card${selectedSugar?.id === opt.id ? " selected" : ""}`}
                    onClick={() => setSelectedSugar(opt)}
                  >
                    <span className="customize-option-name">{opt.name}</span>
                    {opt.cost > 0 && <span className="customize-option-cost">+{currency(opt.cost)}</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="customize-section-card">
              <h2 className="customize-step-title customize-step-title-left">Ice</h2>
              <div className="customize-option-grid customize-option-grid-compact">
                {iceOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={`customize-option-card${selectedIce?.id === opt.id ? " selected" : ""}`}
                    onClick={() => setSelectedIce(opt)}
                  >
                    <span className="customize-option-name">{opt.name}</span>
                    {opt.cost > 0 && <span className="customize-option-cost">+{currency(opt.cost)}</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="customize-section-card customize-section-card-wide">
              <h2 className="customize-step-title customize-step-title-left">Toppings</h2>
              <p className="customize-step-subtitle customize-step-subtitle-left">Select as many as you like</p>
              <div className="customize-option-grid customize-option-grid-compact">
                {toppingOptions.map((opt) => {
                  const isSelected = selectedToppings.some((t) => t.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      className={`customize-option-card${isSelected ? " selected" : ""}`}
                      onClick={() => toggleTopping(opt)}
                    >
                      <span className="customize-option-name">{opt.name}</span>
                      {opt.cost > 0 && <span className="customize-option-cost">+{currency(opt.cost)}</span>}
                      {isSelected && <span className="customize-option-check"><FiCheck /></span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="customize-section-card customize-section-card-wide">
              <h2 className="customize-step-title customize-step-title-left">Special Instructions</h2>
              <input
                type="text"
                className="comments-input"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g., Extra shaken, half boba..."
              />
            </section>
          </div>
        </div>

        <aside className="customize-single-right">
          <div className="customize-side-total-top">
            <span className="customize-side-total-label">Total</span>
            <span className="customize-side-total-value">{currency(livePrice)}</span>
          </div>

          <div className="customize-review customize-review-compact">
            <div className="customize-review-header">
              <span className="customize-review-header-icon"><FiCoffee /></span>
              <div className="customize-review-header-text">
                <h3>{currentItem.name}</h3>
                <p>Base price: {currency(currentItem.cost)}</p>
              </div>
            </div>

            <div className="customize-review-body">
              <div className="customize-review-row">
                <span className="customize-review-label">
                  <span className="customize-review-label-icon"><FiDroplet /></span> Sugar
                </span>
                <span className="customize-review-value">
                  {selectedSugar?.name || "Default"}
                  {selectedSugar?.cost > 0 && (
                    <span className="customize-review-value-cost">+{currency(selectedSugar.cost)}</span>
                  )}
                </span>
              </div>
              <div className="customize-review-row">
                <span className="customize-review-label">
                  <span className="customize-review-label-icon"><FiWind /></span> Ice
                </span>
                <span className="customize-review-value">
                  {selectedIce?.name || "Default"}
                  {selectedIce?.cost > 0 && (
                    <span className="customize-review-value-cost">+{currency(selectedIce.cost)}</span>
                  )}
                </span>
              </div>

              {selectedToppings.length > 0 ? (
                <div className="customize-review-section">
                  <div className="customize-review-section-title">Toppings</div>
                  <div className="customize-review-toppings">
                    {selectedToppings.map((t) => (
                      <span key={t.id} className="customize-review-topping-chip">
                        {t.name}
                        {t.cost > 0 && <span className="customize-review-topping-cost">+{currency(t.cost)}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="customize-review-row">
                  <span className="customize-review-label">
                    <span className="customize-review-label-icon"><FiList /></span> Toppings
                  </span>
                  <span className="customize-review-value">None</span>
                </div>
              )}
            </div>

            <div className="customize-review-breakdown">
              <div className="customize-review-breakdown-row">
                <span>Base</span><span>{currency(currentItem.cost)}</span>
              </div>
              {selectedSugar?.cost > 0 && (
                <div className="customize-review-breakdown-row">
                  <span>{selectedSugar.name}</span><span>+{currency(selectedSugar.cost)}</span>
                </div>
              )}
              {selectedIce?.cost > 0 && (
                <div className="customize-review-breakdown-row">
                  <span>{selectedIce.name}</span><span>+{currency(selectedIce.cost)}</span>
                </div>
              )}
              {selectedToppings.filter((t) => t.cost > 0).map((t) => (
                <div key={t.id} className="customize-review-breakdown-row">
                  <span>{t.name}</span><span>+{currency(t.cost)}</span>
                </div>
              ))}
            </div>

            <div className="customize-review-total">
              <span className="customize-review-total-label">Total</span>
              <span className="customize-review-total-price">{currency(livePrice)}</span>
            </div>
          </div>

          <button className="customize-nav-btn customize-nav-add customize-single-add" onClick={saveCustomizedItem}>
            {editingCartItemId ? "Save Changes" : "Add to Order"}
          </button>
        </aside>
      </div>
    </div>
  );
}
