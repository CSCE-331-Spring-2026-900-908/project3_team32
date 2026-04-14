import { FiArrowLeft, FiCreditCard, FiDollarSign } from "react-icons/fi";
import { SCREEN } from "../constants";
import { currency } from "../utils";

export default function CheckoutScreen({
  setScreen,
  cartCount,
  cartTotal,
  rewardsStatus,
  discountAmount,
  checkoutTax,
  checkoutTotal,
  completeOrder,
}) {
  return (
    <div className="customer-content checkout-screen">
      <div className="kiosk-back-row">
        <button className="kiosk-back-btn" onClick={() => setScreen(SCREEN.MENU)}><FiArrowLeft /> Back to Menu</button>
      </div>
      <h2>Checkout</h2>
      <div className="checkout-summary">
        <div className="summary-row">
          <span>Items ({cartCount})</span>
          <span>{currency(cartTotal)}</span>
        </div>
        {rewardsStatus.discountRate > 0 && (
          <div className="summary-row">
            <span>Rewards Discount ({Math.round(rewardsStatus.discountRate * 100)}%)</span>
            <span>-{currency(discountAmount)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Tax (8.25%)</span>
          <span>{currency(checkoutTax)}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>{currency(checkoutTotal)}</span>
        </div>
      </div>
      <div className="payment-methods">
        <h3>Select Payment Method</h3>
        <button className="payment-btn" onClick={() => completeOrder("CARD")}>
          <FiCreditCard /> Pay with Card
        </button>
        <button
          className="payment-btn"
          onClick={() => {
            alert("Please see cashier to pay with cash.");
            completeOrder("CASH");
          }}
        >
          <FiDollarSign /> Pay with Cash
        </button>
      </div>
    </div>
  );
}
