import { FiArrowLeft, FiShoppingCart, FiHeart, FiX, FiCheck } from "react-icons/fi";
import { SCREEN } from "../constants";
import { currency, buildDisplayLines } from "../utils";

export default function CartScreen({
  cart,
  user,
  menuItems,
  setScreen,
  removeFromCart,
  updateCartQuantity,
  startEditCartItem,
  getFavoriteMatch,
  handleToggleFavorite,
  rewardsStatus,
  rewardsTone,
  cartTotal,
  discountAmount,
  discountedSubtotal,
  previousYearPoints,
  pointsFromCurrentOrder,
  pointsToNextTier,
  tierProgressPercent,
}) {
  return (
    <div className="customer-content cart-screen">
      <div className="kiosk-back-row">
        <button className="kiosk-back-btn" onClick={() => setScreen(SCREEN.MENU)}><FiArrowLeft /> Back to Menu</button>
      </div>
      <h2>Your Cart</h2>

      {cart.length === 0 ? (
        <div className="cart-empty-state">
          <div className="cart-panel-empty-icon"><FiShoppingCart /></div>
          <p className="cart-panel-empty-msg">Your cart is empty</p>
          <p className="cart-panel-empty-sub">Tap any drink to get started</p>
          <button className="btn-secondary" onClick={() => setScreen(SCREEN.MENU)}>Browse Menu</button>
        </div>
      ) : (
        <>
          {!user?.guest && (
            <div className={`rewards-summary rewards-tone-${rewardsTone}`}>
              <div className="rewards-line">
                <span>Rewards</span>
                <span className={`rewards-tier-badge rewards-tier-${rewardsTone}`}>
                  {rewardsStatus.tier}
                  {rewardsStatus.discountRate > 0 ? ` (${Math.round(rewardsStatus.discountRate * 100)}% off)` : ""}
                </span>
              </div>
              {rewardsStatus.note && (
                <div className="rewards-note rewards-note-employee">{rewardsStatus.note}</div>
              )}
              {rewardsStatus.tier === "Employee" ? (
                <div className="tier-visual-row">
                  <span className="tier-chip tier-chip-employee active">Employee Only</span>
                </div>
              ) : (
                <div className="tier-visual-row">
                  <span className={`tier-chip ${["Gold", "Platinum", "Diamond"].includes(rewardsStatus.tier) ? "active" : ""}`}>Gold</span>
                  <span className={`tier-chip ${["Platinum", "Diamond"].includes(rewardsStatus.tier) ? "active" : ""}`}>Platinum</span>
                  <span className={`tier-chip ${rewardsStatus.tier === "Diamond" ? "active" : ""}`}>Diamond</span>
                </div>
              )}
              <div className="rewards-progress">
                <div className="rewards-progress-fill" style={{ width: `${tierProgressPercent}%` }} />
              </div>
              <div className="rewards-line"><span>Points (12 mo)</span><span>{previousYearPoints}</span></div>
              <div className="rewards-line"><span>From this order</span><span>+{pointsFromCurrentOrder}</span></div>
              {rewardsStatus.nextTierAt && (
                <div className="rewards-line"><span>To next tier</span><span>{pointsToNextTier}</span></div>
              )}
              {!rewardsStatus.nextTierAt && (
                <div className="rewards-line"><span>Progress</span><span>Top tier <FiCheck /></span></div>
              )}
            </div>
          )}

          <div className="cart-items-list">
            {cart.map((item, index) => {
              const menuRef = menuItems.find((m) => m.id === item.menuItemId) || {
                id: item.menuItemId, name: item.name, cost: item.price, category: "",
              };
              const isFav = !!getFavoriteMatch(menuRef, item);
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-header">
                    <span className="cart-item-number">{index + 1}.</span>
                    <span className="cart-item-name">{item.name}</span>
                    {!user?.guest && (
                      <button
                        className={`cart-fav-btn${isFav ? " cart-fav-btn--active" : ""}`}
                        onClick={(e) => handleToggleFavorite(menuRef, item, e)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        {isFav ? <><FiHeart style={{ fill: "currentColor" }} /> Saved</> : <><FiHeart /> Save</>}
                      </button>
                    )}
                    <span className="cart-item-price">{currency(item.price * (item.quantity || 1))}</span>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}><FiX /></button>
                  </div>
                  <div className="cart-item-controls">
                    <span className="cart-item-unit-price">Each: {currency(item.price)}</span>
                    <div className="qty-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateCartQuantity(item.id, (item.quantity || 1) - 1)}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-value">{item.quantity || 1}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateCartQuantity(item.id, (item.quantity || 1) + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button className="cart-edit-btn" onClick={() => startEditCartItem(item)}>Edit</button>
                  </div>
                  <div className="cart-item-details">
                    {buildDisplayLines(item).map((line, i) => (
                      <div key={i} className="cart-item-detail">{line}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-totals">
            <div className="cart-total-line">
              <span>{rewardsStatus.discountRate > 0 ? "Subtotal" : "Total"}</span>
              <span>{currency(cartTotal)}</span>
            </div>
            {rewardsStatus.discountRate > 0 && (
              <>
                <div className="cart-total-line">
                  <span>Discount ({Math.round(rewardsStatus.discountRate * 100)}%)</span>
                  <span>-{currency(discountAmount)}</span>
                </div>
                <div className="cart-total-line cart-total-line-final">
                  <span>Discounted Total</span>
                  <span>{currency(discountedSubtotal)}</span>
                </div>
              </>
            )}
          </div>
          <button className="btn-primary full-width" onClick={() => setScreen(SCREEN.CHECKOUT)}>
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
}
