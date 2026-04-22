import React from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiCoffee, FiDroplet, FiWind, FiList } from "react-icons/fi";
import { currency } from "../utils";

export default function CustomizeScreen({
  currentItem,
  customizeStep,
  setCustomizeStep,
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
    <div className="customize-fullpage">
      <div className="customize-top-bar">
        <button className="kiosk-back-btn" onClick={handleCancelCustomization}><FiArrowLeft /> Back</button>
        <div className="customize-item-summary">
          <span className="customize-item-name">{currentItem.name}</span>
          <span className="customize-item-price">{currency(livePrice)}</span>
        </div>
      </div>

      <div className="customize-progress">
        {["Sugar", "Ice", "Toppings", "Review"].map((label, i) => (
          <div
            key={label}
            className={`customize-progress-step${customizeStep === i + 1 ? " active" : ""}${customizeStep > i + 1 ? " done" : ""}`}
            onClick={() => setCustomizeStep(i + 1)}
          >
            <div className="customize-progress-dot">{customizeStep > i + 1 ? <FiCheck /> : i + 1}</div>
            <span className="customize-progress-label">{label}</span>
          </div>
        ))}
        <div className="customize-progress-line" />
      </div>

      <div className="customize-step-content">
        {customizeStep === 1 && (
          <div className="customize-step">
            <h2 className="customize-step-title">Choose Sugar Level</h2>
            <div className="customize-option-grid">
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
          </div>
        )}

        {customizeStep === 2 && (
          <div className="customize-step">
            <h2 className="customize-step-title">Choose Ice Level</h2>
            <div className="customize-option-grid">
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
          </div>
        )}

        {customizeStep === 3 && (
          <div className="customize-step">
            <h2 className="customize-step-title">Choose Toppings</h2>
            <p className="customize-step-subtitle">Select as many as you like</p>
            <div className="customize-option-grid">
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
          </div>
        )}

        {customizeStep === 4 && (
          <div className="customize-step">
            <h2 className="customize-step-title">Review Your Order</h2>
            <div className="customize-review">
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
                    <span className="customize-review-label-icon"><FiDroplet /></span> Sugar Level
                  </span>
                  <span className="customize-review-value">
                    {selectedSugar?.name || "None"}
                    {selectedSugar?.cost > 0 && (
                      <span className="customize-review-value-cost">+{currency(selectedSugar.cost)}</span>
                    )}
                  </span>
                </div>
                <div className="customize-review-row">
                  <span className="customize-review-label">
                    <span className="customize-review-label-icon"><FiWind /></span> Ice Level
                  </span>
                  <span className="customize-review-value">
                    {selectedIce?.name || "None"}
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

              <div className="customize-review-comments">
                <label>Special Instructions</label>
                <input
                  type="text"
                  className="comments-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g., Extra shaken, half boba..."
                />
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
          </div>
        )}
      </div>

      <div className="customize-nav">
        {customizeStep > 1 && (
          <button className="customize-nav-btn customize-nav-back" onClick={() => setCustomizeStep((s) => s - 1)}>
            <FiArrowLeft /> Previous
          </button>
        )}
        <div className="customize-nav-spacer" />
        {customizeStep < 4 ? (
          <button className="customize-nav-btn customize-nav-next" onClick={() => setCustomizeStep((s) => s + 1)}>
            Next <FiArrowRight />
          </button>
        ) : (
          <button className="customize-nav-btn customize-nav-add" onClick={saveCustomizedItem}>
            {editingCartItemId ? "Save Changes" : "Add to Order"}
          </button>
        )}
      </div>
    </div>
  );
}
