import { FiX, FiCheck, FiCheckCircle, FiCoffee, FiCalendar, FiClock, FiCreditCard, FiDollarSign } from "react-icons/fi";
import { currency } from "../utils";

export default function OrderConfirmation({
  showConfirmation,
  setShowConfirmation,
  orderNumber,
  orderStatus,
  setTrackedOrderId,
  setOrderNumber,
  setOrderStatus,
  ordersModalOpen,
  setOrdersModalOpen,
  customerOrders,
  isMagnified,
}) {
  return (
    <>
      {showConfirmation && (
        <div
          id={isMagnified ? "magnified-confirmation" : "real-confirmation"}
          className="order-confirmation-notification"
          style={isMagnified ? { transform: "none", left: 0, top: 0 } : {}}
        >
          <div className="confirmation-content">
            <button
              className="confirmation-close-btn"
              onClick={() => {
                setShowConfirmation(false);
                setOrderNumber(null);
                setTrackedOrderId(null);
                setOrderStatus(null);
              }}
            >
              <FiX />
            </button>
            <div className="confirmation-checkmark">
              {orderStatus === "Completed" ? <FiCheckCircle /> : <FiCheck />}
            </div>
            <div className="confirmation-text">
              <h3>{orderStatus === "Completed" ? "Order Ready!" : "Order Received!"}</h3>
              <p>Order Number: #{orderNumber}</p>
              <p className="confirmation-subtitle">
                {orderStatus === "Completed"
                  ? "Please pick up your order!"
                  : "Status: " + (orderStatus || "In Progress")}
              </p>
            </div>
          </div>
        </div>
      )}

      {ordersModalOpen && (
        <div
          id={isMagnified ? "magnified-orders-modal" : "real-orders-modal"}
          className="orders-modal-overlay"
          onClick={isMagnified ? undefined : () => setOrdersModalOpen(false)}
          style={isMagnified ? { position: "absolute" } : {}}
        >
          <div className="orders-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="orders-modal-header">
              <h2 className="orders-modal-title">My Orders</h2>
              <button
                className="customize-modal-close"
                onClick={isMagnified ? undefined : () => setOrdersModalOpen(false)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="orders-modal-body">
              {customerOrders.length === 0 ? (
                <div className="orders-empty">
                  <div className="orders-empty-icon"><FiCoffee /></div>
                  <p className="orders-empty-msg">No orders yet</p>
                  <p className="orders-empty-sub">Your completed orders will appear here.</p>
                </div>
              ) : (
                customerOrders.map((order) => {
                  const date = new Date(order.order_date);
                  const isRecent = Date.now() - date.getTime() < 30 * 60 * 1000;
                  const status = order.status || (isRecent ? "In Progress" : "Completed");
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce((s, i) => s + (i.quantity || 1), 0)
                    : null;
                  return (
                    <div key={order.order_id} className="order-history-card">
                      <div className="order-history-top">
                        <div className="order-history-id">Order #{order.order_id}</div>
                        <span className={`order-status-chip order-status-${status === "Completed" ? "done" : "progress"}`}>
                          {status}
                        </span>
                      </div>

                      <div className="order-history-meta">
                        <span>
                          <FiCalendar />{" "}
                          {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span>
                          <FiClock />{" "}
                          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {order.payment_type && (
                          <span>
                            {order.payment_type === "CARD" ? <FiCreditCard /> : <FiDollarSign />} {order.payment_type}
                          </span>
                        )}
                        {itemCount !== null && (
                          <span><FiCoffee /> {itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                        )}
                      </div>

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="order-history-items">
                          {order.items.map((item) => (
                            <div key={item.order_item_id} className="order-history-item-row">
                              <span className="order-history-item-qty">{item.quantity}×</span>
                              <span className="order-history-item-name">{item.name}</span>
                              <span className="order-history-item-price">
                                {currency(Number(item.item_price) * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="order-history-total">
                        <span>Total</span>
                        <span>{currency(Number(order.total_cost))}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
