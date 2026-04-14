import { useEffect } from "react";
import { API_BASE } from "../constants";

export function useOrderTracking({
  trackedOrderId,
  orderStatus,
  setOrderStatus,
  setShowConfirmation,
  setOrderNumber,
  setTrackedOrderId,
}) {
  useEffect(() => {
    if (!trackedOrderId) return;
    if (orderStatus === "Completed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${trackedOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data?.status) {
            setOrderStatus(data.status);
            if (data.status === "Completed") {
              setShowConfirmation(true);
              setTimeout(() => {
                setShowConfirmation(false);
                setOrderNumber(null);
                setTrackedOrderId(null);
                setOrderStatus(null);
              }, 8000);
            }
          }
        }
      } catch {
        // silently fail, keep polling
      }
    }, 500);

    return () => clearInterval(interval);
  }, [trackedOrderId, orderStatus, setOrderStatus, setShowConfirmation, setOrderNumber, setTrackedOrderId]);
}
