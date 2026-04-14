import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import "./CashierScreen.css";

import { SCREEN, API_BASE } from "./constants";
import { useCashierData } from "./hooks/useCashierData";

import CashierHeader from "./components/CashierHeader";
import HomeScreen from "./components/HomeScreen";
import ItemSelectScreen from "./components/ItemSelectScreen";
import SelectionStep from "./components/SelectionStep";
import ToppingsStep from "./components/ToppingsStep";
import CheckoutScreen from "./components/CheckoutScreen";
import TipScreen from "./components/TipScreen";
import FinalTotalScreen from "./components/FinalTotalScreen";
import ConfirmationScreen from "./components/ConfirmationScreen";

export default function CashierPOS() {
  const navigate = useNavigate();
  const { user, token, logout, isManager } = useAuth();

  // ── Screen / navigation state ──────────────────────────────────────
  const [screen, setScreenState] = useState(SCREEN.HOME);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);

  // ── Order build state ──────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState([]);
  const [nextItemId, setNextItemId] = useState(1);
  const [orderNumber, setOrderNumber] = useState(1001);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Customize flow state ───────────────────────────────────────────
  const [currentItem, setCurrentItem] = useState(null);
  const [previousScreen, setPreviousScreen] = useState(SCREEN.HOME);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState("");

  // ── Payment / tip state ────────────────────────────────────────────
  const [tipAmount, setTipAmount] = useState(0);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTipValue, setCustomTipValue] = useState("");

  // ── Completed order state ──────────────────────────────────────────
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [completedOrderTotal, setCompletedOrderTotal] = useState(0);
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState("");

  // ── Data fetching ──────────────────────────────────────────────────
  const {
    menuItems,
    categories,
    sugarOptions,
    iceOptions,
    toppingOptions,
    sizeOptions,
    todayOrders,
    setTodayOrders,
    completedOrders,
    setCompletedOrders,
  } = useCashierData({ token });

  // ── Derived values ─────────────────────────────────────────────────
  const mostCommonItems = useMemo(() => menuItems.slice(0, 9), [menuItems]);
  const visibleItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);
  const orderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price, 0),
    [orderItems],
  );

  // ── Screen setter (also manages category for ITEM_SELECT) ──────────
  function setScreen(nextScreen, category) {
    if (nextScreen === SCREEN.ITEM_SELECT && category !== undefined) {
      setSelectedCategory(category);
    }
    setScreenState(nextScreen);
  }

  // ── Customize flow handlers ────────────────────────────────────────
  function clearSelectionState() {
    setSelectedSize(null);
    setSelectedSugar(null);
    setSelectedIce(null);
    setSelectedToppings([]);
    setComments("");
  }

  function handleSelectItem(item, sourceScreen) {
    setCurrentItem(item);
    setPreviousScreen(sourceScreen);
    clearSelectionState();
    setScreenState(sizeOptions.length > 0 ? SCREEN.SIZE : SCREEN.SUGAR);
  }

  function toggleTopping(topping) {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.id === topping.id);
      if (exists) return prev.filter((t) => t.id !== topping.id);
      return [...prev, topping];
    });
  }

  function finalizeItem() {
    if (!currentItem) return;
    const totalPrice =
      currentItem.cost +
      (selectedSize?.cost || 0) +
      (selectedSugar?.cost || 0) +
      (selectedIce?.cost || 0) +
      selectedToppings.reduce((sum, t) => sum + t.cost, 0);
    const modificationIds = [
      selectedSize?.id,
      selectedSugar?.id,
      selectedIce?.id,
      ...selectedToppings.map((t) => t.id),
    ].filter(Boolean);
    const item = {
      id: nextItemId,
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sizeName: selectedSize?.name || null,
      sugarLevel: selectedSugar?.name || null,
      iceLevel: selectedIce?.name || null,
      toppingNames: selectedToppings.map((t) => t.name),
      comments: comments.trim(),
      modificationIds,
    };
    setOrderItems((prev) => [...prev, item]);
    setNextItemId((prev) => prev + 1);
    clearSelectionState();
    setCurrentItem(null);
    setScreenState(SCREEN.HOME);
  }

  function removeOrderItem(itemId) {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  // ── Payment handlers ───────────────────────────────────────────────
  function handlePaymentSelection(method) {
    if (method === "Card" || method === "Gift Card") {
      setPendingPaymentMethod(method);
      setShowCustomTip(false);
      setCustomTipValue("");
      setScreenState(SCREEN.TIP);
    } else {
      setTipAmount(0);
      completeOrder(method);
    }
  }

  function handleTipSelection(amount) {
    setTipAmount(amount);
    setScreenState(SCREEN.FINAL_TOTAL);
  }

  function completeOrder(paymentMethod) {
    async function submitOrder() {
      try {
        const employeeId = Number(user?.employee_id);
        if (!Number.isInteger(employeeId) || employeeId <= 0) {
          setStatusMessage("Unable to identify logged-in employee. Please sign in again.");
          return;
        }
        const orderPayload = {
          employee_id: employeeId,
          payment_type: paymentMethod.toUpperCase(),
          items: orderItems.map((item) => ({
            menu_item_id: item.menuItemId,
            quantity: 1,
            modification_ids: item.modificationIds || [],
            comments: item.comments || "",
          })),
        };
        console.log("Submitting order:", orderPayload);
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/cashier/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(orderPayload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Order submission failed:", errorData);
          throw new Error(errorData.error || "Order submission failed");
        }
        const result = await response.json();
        const completedOrder = result.order?.order_id || orderNumber;
        setCompletedOrderId(completedOrder);
        setCompletedOrderTotal(orderTotal + tipAmount);
        setCompletedPaymentMethod(paymentMethod);
        setTodayOrders((prev) => [...prev, { id: completedOrder, items: orderItems.map((i) => i.name) }]);
        setScreenState(SCREEN.CONFIRMATION);
        setOrderNumber((prev) => prev + 1);
      } catch (error) {
        console.error("Order submission error:", error);
        setStatusMessage("Failed to submit order. Please try again.");
      }
    }
    submitOrder();
  }

  function startNewOrder() {
    setOrderItems([]);
    setCurrentItem(null);
    clearSelectionState();
    setCompletedOrderId(null);
    setCompletedOrderTotal(0);
    setCompletedPaymentMethod("");
    setTipAmount(0);
    setPendingPaymentMethod(null);
    setShowCustomTip(false);
    setCustomTipValue("");
    setScreenState(SCREEN.HOME);
  }

  // ── Today's orders status toggle ───────────────────────────────────
  async function handleToggleOrderStatus(orderId) {
    const isCompleted = completedOrders.has(orderId);
    const newStatus = isCompleted ? "In Progress" : "Completed";
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCompletedOrders((prev) => {
          const next = new Set(prev);
          if (next.has(orderId)) next.delete(orderId);
          else next.add(orderId);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to update order status", err);
    }
  }

  console.log("Current User Data:", user);

  function handleExit() {
    if (isManager) {
      navigate("/employee", { replace: true });
      return;
    }
    logout();
    localStorage.removeItem("role");
    localStorage.removeItem("employee");
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/login/employee", { replace: true });
  }

  return (
    <div className="cashier-page">
      <div className="cashier-shell">
        <CashierHeader
          screen={screen}
          ordersDropdownOpen={ordersDropdownOpen}
          setOrdersDropdownOpen={setOrdersDropdownOpen}
          todayOrders={todayOrders}
          completedOrders={completedOrders}
          onToggleOrderStatus={handleToggleOrderStatus}
          user={user}
          handleExit={handleExit}
        />

        {screen === SCREEN.HOME && (
          <HomeScreen
            categories={categories}
            mostCommonItems={mostCommonItems}
            orderItems={orderItems}
            orderTotal={orderTotal}
            handleSelectItem={handleSelectItem}
            removeOrderItem={removeOrderItem}
            setScreen={setScreen}
            setStatusMessage={setStatusMessage}
          />
        )}

        {screen === SCREEN.ITEM_SELECT && (
          <ItemSelectScreen
            selectedCategory={selectedCategory}
            visibleItems={visibleItems}
            handleSelectItem={handleSelectItem}
            setScreen={setScreen}
          />
        )}

        {screen === SCREEN.SIZE && (
          <SelectionStep
            title="Select Size"
            options={sizeOptions}
            selectedId={selectedSize?.id}
            onSelect={setSelectedSize}
            onBack={() => { clearSelectionState(); setScreenState(previousScreen); }}
            onNext={() => setScreenState(SCREEN.SUGAR)}
          />
        )}

        {screen === SCREEN.SUGAR && (
          <SelectionStep
            title="Select Sugar Level"
            options={sugarOptions}
            selectedId={selectedSugar?.id}
            onSelect={setSelectedSugar}
            onBack={() => {
              if (sizeOptions.length > 0) {
                setScreenState(SCREEN.SIZE);
              } else {
                clearSelectionState();
                setScreenState(previousScreen);
              }
            }}
            onNext={() => setScreenState(SCREEN.ICE)}
          />
        )}

        {screen === SCREEN.ICE && (
          <SelectionStep
            title="Select Ice Level"
            options={iceOptions}
            selectedId={selectedIce?.id}
            onSelect={setSelectedIce}
            onBack={() => setScreenState(SCREEN.SUGAR)}
            onNext={() => setScreenState(SCREEN.TOPPINGS)}
          />
        )}

        {screen === SCREEN.TOPPINGS && (
          <ToppingsStep
            toppingOptions={toppingOptions}
            selectedToppings={selectedToppings}
            toggleTopping={toggleTopping}
            comments={comments}
            setComments={setComments}
            setScreen={setScreenState}
            finalizeItem={finalizeItem}
          />
        )}

        {screen === SCREEN.CHECKOUT && (
          <CheckoutScreen
            orderItems={orderItems}
            orderTotal={orderTotal}
            setScreen={setScreenState}
            handlePaymentSelection={handlePaymentSelection}
          />
        )}

        {screen === SCREEN.TIP && (
          <TipScreen
            orderTotal={orderTotal}
            showCustomTip={showCustomTip}
            setShowCustomTip={setShowCustomTip}
            customTipValue={customTipValue}
            setCustomTipValue={setCustomTipValue}
            handleTipSelection={handleTipSelection}
            setScreen={setScreenState}
          />
        )}

        {screen === SCREEN.FINAL_TOTAL && (
          <FinalTotalScreen
            orderTotal={orderTotal}
            tipAmount={tipAmount}
            pendingPaymentMethod={pendingPaymentMethod}
            setScreen={setScreenState}
            completeOrder={completeOrder}
          />
        )}

        {screen === SCREEN.CONFIRMATION && (
          <ConfirmationScreen
            completedOrderId={completedOrderId}
            completedOrderTotal={completedOrderTotal}
            completedPaymentMethod={completedPaymentMethod}
            startNewOrder={startNewOrder}
          />
        )}
      </div>
    </div>
  );
}
