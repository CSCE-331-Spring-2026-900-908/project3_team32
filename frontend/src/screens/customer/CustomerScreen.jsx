import React, { useMemo, useRef, useEffect, useState } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./styles/CustomerBase.css";
import "./styles/Menu.css";
import "./styles/Cart.css";
import "./styles/Customize.css";
import "./styles/Accessibility.css";
import "./styles/Orders.css";

import {
  SCREEN,
  API_BASE,
  TAX_RATE,
  REWARDS_WINDOW_MS,
  GOLD_POINTS_THRESHOLD,
  PLATINUM_POINTS_THRESHOLD,
} from "./constants";
import { pointsFromAmount, getRewardsStatus } from "./utils";

import { useCustomerData } from "./hooks/useCustomerData";
import { useOrderTracking } from "./hooks/useOrderTracking";
import { useAccessibility } from "./hooks/useAccessibility";

import CustomerHeader from "./components/CustomerHeader";
import MenuScreen from "./components/MenuScreen";
import CustomizeScreen from "./components/CustomizeScreen";
import CartScreen from "./components/CartScreen";
import CheckoutScreen from "./components/CheckoutScreen";
import OrderConfirmation from "./components/OrderConfirmation";
import Chatbot from "./chatbot/Chatbot";

export default function CustomerScreen() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  // ── Screen / navigation state ──────────────────────────────────────
  const [screen, setScreen] = useState(SCREEN.MENU);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ── Cart state ─────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  // ── Customize flow state ───────────────────────────────────────────
  const [currentItem, setCurrentItem] = useState(null);
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [customizeStep, setCustomizeStep] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState("");

  // ── Order tracking state ───────────────────────────────────────────
  const [orderNumber, setOrderNumber] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────
  const {
    menuItems,
    categories,
    sizeOptions,
    sugarOptions,
    iceOptions,
    toppingOptions,
    customerOrders,
    setCustomerOrders,
    mostOrderedItems,
    customerMostOrderedItems,
    savedFavorites,
    setSavedFavorites,
    isEmployeeRewardsUser,
    weather,
    weeklyWeather,
    weatherLoading,
    triggerRefresh,
  } = useCustomerData({ token, user });

  // ── Order status polling ───────────────────────────────────────────
  useOrderTracking({
    trackedOrderId,
    orderStatus,
    setOrderStatus,
    setShowConfirmation,
    setOrderNumber,
    setTrackedOrderId,
  });

  // ── Accessibility ──────────────────────────────────────────────────
  const {
    accessibilityOpen, setAccessibilityOpen,
    textScale, setTextScale,
    magnifierEnabled, setMagnifierEnabled,
    magnifierZoom, setMagnifierZoom,
    highContrastEnabled, setHighContrastEnabled,
    fontSize, setFontSize,
    accessibilityPanelRef,
    translateContainerId,
  } = useAccessibility();

  // ── Magnifier refs + RAF loop ──────────────────────────────────────
  const magnifierRef = useRef(null);
  const lensInnerRef = useRef(null);
  const magnifierZoomRef = useRef(magnifierZoom);
  const mousePosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => { magnifierZoomRef.current = magnifierZoom; }, [magnifierZoom]);

  useEffect(() => {
    if (!magnifierEnabled) return;

    const SCROLLABLE = [
      ".menu-left-col", ".cart-panel-scroll-area", ".orders-modal-body",
      ".customize-step-content", ".checkout-screen", ".cart-screen", ".customer-content-wrapper",
    ];

    function findReal(sel) {
      const all = document.querySelectorAll(sel);
      for (const el of all) { if (!el.closest(".magnified-content")) return el; }
      return null;
    }

    function syncScrollPositions() {
      const inner = lensInnerRef.current;
      if (!inner) return;
      SCROLLABLE.forEach((sel) => {
        const real = findReal(sel);
        const clone = inner.querySelector(sel);
        if (real && clone && clone.scrollTop !== real.scrollTop) clone.scrollTop = real.scrollTop;
        if (real && clone && clone.scrollLeft !== real.scrollLeft) clone.scrollLeft = real.scrollLeft;
      });
    }

    function updateMagnifier() {
      const mag = magnifierRef.current;
      const inner = lensInnerRef.current;
      if (!mag || !inner) return;

      const { x, y } = mousePosRef.current;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const z = magnifierZoomRef.current;
      
      const rootScale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      const effectiveZoom = z / rootScale; 
      
      const lensSize = 350;
      const half = lensSize / 2;

      mag.style.left = `${x}px`;
      mag.style.top = `${y}px`;
      mag.style.width = `${lensSize}px`;
      mag.style.height = `${lensSize}px`;

      const fullWidth = Math.max(
        window.innerWidth,
        document.documentElement.scrollWidth,
        document.body.scrollWidth
      );
      const fullHeight = Math.max(
        window.innerHeight,
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );

      inner.style.width = `${fullWidth}px`;
      inner.style.height = `${fullHeight}px`;
      inner.style.minWidth = `${fullWidth}px`;
      inner.style.minHeight = `${fullHeight}px`;
      inner.style.maxHeight = "none";
      inner.style.transformOrigin = "0 0";
      inner.style.position = "absolute";
      inner.style.overflow = "visible";
      inner.style.boxSizing = "border-box";
      inner.style.transform = `scale(${effectiveZoom})`;
      inner.style.top = `${-y * effectiveZoom + half}px`;
      inner.style.left = `${-x * effectiveZoom + half}px`;
      const realMain = document.querySelector(".customer-content-wrapper");
      const cloneMain = inner.querySelector(".customer-content-wrapper");
      if (cloneMain && realMain) {
        cloneMain.style.height = `${realMain.clientHeight}px`;
        cloneMain.style.minHeight = `${realMain.clientHeight}px`;
        cloneMain.style.width = `${realMain.clientWidth}px`;
        cloneMain.scrollTop = realMain.scrollTop;
      }

      syncScrollPositions();

      const syncFixedElement = (realId, magId) => {
        const realEl = document.getElementById(realId);
        const magEl = inner.querySelector(`#${magId}`);
        if (realEl && magEl) {
          const rect = realEl.getBoundingClientRect();
          magEl.style.top = `${rect.top + scrollY}px`;
          magEl.style.left = `${rect.left + scrollX}px`;
          magEl.style.width = `${rect.width}px`;
          magEl.style.height = `${rect.height}px`;
        }
      };

      syncFixedElement("real-cart-badge", "magnified-cart-badge");
      syncFixedElement("real-confirmation", "magnified-confirmation");
      syncFixedElement("real-orders-modal", "magnified-orders-modal");
      
      const realWeather = findReal(".kiosk-weather-strip");
      const magWeather = inner.querySelector(".kiosk-weather-strip");
      if (realWeather && magWeather) {
        const rect = realWeather.getBoundingClientRect();
        magWeather.style.position = "absolute";
        magWeather.style.marginTop = "0";
        magWeather.style.marginBottom = "0";
        magWeather.style.top = `${rect.top + scrollY}px`;
        magWeather.style.left = `${rect.left + scrollX}px`;
        magWeather.style.width = `${rect.width}px`;
        const parent = magWeather.parentElement;
        if (parent) {
          const requiredPadding = `${rect.height + 80}px`;
          if (parent.style.paddingBottom !== requiredPadding) {
            parent.style.paddingBottom = requiredPadding;
          }
        }
      }
    }

    function handleMouseMove(e) { 
      mousePosRef.current = { x: e.clientX, y: e.clientY }; 
    }

    function handleTouchMove(e) {
      if (e.touches && e.touches.length > 0) {
        mousePosRef.current = { 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        };
      }
    }

    function handleTouchStart(e) {
      if (e.touches && e.touches.length > 0) {
        mousePosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    const scrollTargets = SCROLLABLE.map(findReal).filter(Boolean);
    scrollTargets.forEach(el => el.addEventListener("scroll", syncScrollPositions, { 
      passive: true 
    }));
    window.addEventListener("scroll", syncScrollPositions, { passive: true });
    document.addEventListener("scroll", syncScrollPositions, { passive: true, capture: true });

    let rafId = null;
    function loop() { 
      updateMagnifier(); rafId = requestAnimationFrame(loop); 
    }
    rafId = requestAnimationFrame(loop);

    return () => { 
      cancelAnimationFrame(rafId); 
      window.removeEventListener("mousemove", handleMouseMove); 
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
      scrollTargets.forEach(el => el.removeEventListener("scroll", syncScrollPositions));
      window.removeEventListener("scroll", syncScrollPositions);
      document.removeEventListener("scroll", syncScrollPositions, { 
        capture: true 
      });
    };
  }, [magnifierEnabled]);

  // ── Derived / memoized values ──────────────────────────────────────
  const visibleItems = useMemo(() => {
    if (!selectedCategory || selectedCategory === "Favorites" || selectedCategory === "Most Ordered") return [];
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const defaultSugarOption = useMemo(() => {
    if (!sugarOptions.length) return null;
    return (
      sugarOptions.find((o) => /100\s*%/.test((o.name || "").toLowerCase())) ||
      sugarOptions.find((o) => (o.name || "").toLowerCase().includes("100")) ||
      sugarOptions.find((o) => (o.name || "").toLowerCase().includes("regular")) ||
      sugarOptions[0]
    );
  }, [sugarOptions]);

  const defaultSizeOption = useMemo(() => {
    if (!sizeOptions.length) return null;
    return (
      sizeOptions.find((o) => (o.name || "").toLowerCase().includes("regular")) ||
      sizeOptions[0]
    );
  }, [sizeOptions]);

  const defaultIceOption = useMemo(() => {
    if (!iceOptions.length) return null;
    return (
      iceOptions.find((o) => (o.name || "").toLowerCase().includes("regular")) ||
      iceOptions[0]
    );
  }, [iceOptions]);

  const noIceOption = useMemo(() => {
    if (!iceOptions.length) return null;
    return (
      iceOptions.find((o) => /no.?ice/i.test(o.name)) ||
      iceOptions.find((o) => /\b0\s*%/.test(o.name)) ||
      iceOptions[iceOptions.length - 1]
    );
  }, [iceOptions]);

  const isHotCoffeeItem = (item) => item?.name === "Hot House Brewed Coffee";

  useEffect(() => {
    if (screen !== SCREEN.CUSTOMIZE || !currentItem || editingCartItemId) return;
    if (!selectedSize && defaultSizeOption) setSelectedSize(defaultSizeOption);
    if (!selectedSugar && defaultSugarOption) setSelectedSugar(defaultSugarOption);
    if (!selectedIce && defaultIceOption) setSelectedIce(defaultIceOption);
  }, [
    screen,
    currentItem,
    editingCartItemId,
    selectedSize,
    selectedSugar,
    selectedIce,
    defaultSizeOption,
    defaultSugarOption,
    defaultIceOption,
  ]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [cart],
  );

  const isEmployeeDiscount =
    isEmployeeRewardsUser ||
    user?.type === "employee" ||
    ["Manager", "Shift Lead", "Cashier"].includes(user?.position || "");

  const priorYearOrders = useMemo(() => {
    const cutoff = Date.now() - REWARDS_WINDOW_MS;
    return customerOrders.filter((order) => {
      const parsedDate = Date.parse(order.order_date);
      return Number.isFinite(parsedDate) && parsedDate >= cutoff;
    });
  }, [customerOrders]);

  const previousYearPoints = useMemo(
    () => priorYearOrders.reduce((sum, order) => sum + pointsFromAmount(order.total_cost), 0),
    [priorYearOrders],
  );

  const rewardsStatus = useMemo(
    () => getRewardsStatus(previousYearPoints, isEmployeeDiscount),
    [previousYearPoints, isEmployeeDiscount],
  );

  const discountAmount = useMemo(
    () => cartTotal * rewardsStatus.discountRate,
    [cartTotal, rewardsStatus.discountRate],
  );
  const discountedSubtotal = useMemo(
    () => Math.max(0, cartTotal - discountAmount),
    [cartTotal, discountAmount],
  );
  const checkoutTax = useMemo(() => discountedSubtotal * TAX_RATE, [discountedSubtotal]);
  const checkoutTotal = useMemo(() => discountedSubtotal + checkoutTax, [discountedSubtotal, checkoutTax]);
  const pointsFromCurrentOrder = useMemo(() => pointsFromAmount(discountedSubtotal), [discountedSubtotal]);

  const projectedPoints = previousYearPoints + pointsFromCurrentOrder;
  const pointsToNextTier = rewardsStatus.nextTierAt
    ? Math.max(0, rewardsStatus.nextTierAt - projectedPoints)
    : 0;

  const tierFloor = useMemo(() => {
    if (rewardsStatus.tier === "Platinum") return PLATINUM_POINTS_THRESHOLD;
    if (rewardsStatus.tier === "Gold") return GOLD_POINTS_THRESHOLD;
    return 0;
  }, [rewardsStatus.tier]);

  const tierProgressPercent = useMemo(() => {
    if (!rewardsStatus.nextTierAt) return 100;
    const span = rewardsStatus.nextTierAt - tierFloor;
    if (span <= 0) return 100;
    const pct = ((projectedPoints - tierFloor) / span) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [rewardsStatus.nextTierAt, tierFloor, projectedPoints]);

  const rewardsTone = useMemo(() => {
    if (rewardsStatus.tier === "Employee") return "employee";
    if (rewardsStatus.tier === "Diamond") return "diamond";
    if (rewardsStatus.tier === "Platinum") return "platinum";
    if (rewardsStatus.tier === "Gold") return "gold";
    return "member";
  }, [rewardsStatus.tier]);

  // ── Favorites helpers ──────────────────────────────────────────────
  function getFavoriteMatch(menuItem, cartItem) {
    const targetId = menuItem.id ?? menuItem.menu_item_id;
    return savedFavorites.find((fav) => {
      const d = fav.item_data || {};
      const favItemId = d.menu_item_id ?? d.id ?? fav.menu_item_id;
      if (favItemId !== targetId) return false;
      if (!cartItem) return true;
      const favSugar = (d.sugarLevel || "").toLowerCase();
      const favIce = (d.iceLevel || "").toLowerCase();
      const favSize = (d.sizeName || "").toLowerCase();
      const favToppings = (d.toppingNames || []).slice().sort().join(",").toLowerCase();
      const cartSugar = (cartItem.sugarLevel || "").toLowerCase();
      const cartIce = (cartItem.iceLevel || "").toLowerCase();
      const cartSize = (cartItem.sizeName || "").toLowerCase();
      const cartToppings = (cartItem.toppingNames || []).slice().sort().join(",").toLowerCase();
      return favSugar === cartSugar && favIce === cartIce && favSize === cartSize && favToppings === cartToppings;
    });
  }

  async function handleToggleFavorite(menuItem, cartItem, e) {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    if (!user || !token || user.guest) {
      alert("Sign in to save favorites!");
      return;
    }
    const fav = getFavoriteMatch(menuItem, cartItem);
    try {
      if (fav) {
        await fetch(`${API_BASE}/customer/saved-favorites/${fav.favorite_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedFavorites((prev) => prev.filter((f) => f.favorite_id !== fav.favorite_id));
      } else {
        const itemData = {
          menu_item_id: menuItem.id,
          name: cartItem?.name ?? menuItem.name,
          cost: menuItem.cost ?? cartItem?.price,
          category: menuItem.category || "",
          sugarLevel: cartItem?.sugarLevel || "",
          iceLevel: cartItem?.iceLevel || "",
          sizeName: cartItem?.sizeName || "",
          toppingNames: cartItem?.toppingNames || [],
          comments: cartItem?.comments || "",
          modificationIds: cartItem?.modificationIds || [],
          price: cartItem?.price ?? menuItem.cost,
        };
        const res = await fetch(`${API_BASE}/customer/saved-favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            customer_email: user.email,
            customer_name: user.name || user.email,
            google_id: user.sub || user.google_id || user.email,
            item_data: itemData,
          }),
        });
        const data = await res.json();
        if (!data.error)
          setSavedFavorites((prev) => [...prev, { favorite_id: data.favorite_id, item_data: itemData }]);
      }
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  }

  // ── Customize flow handlers ────────────────────────────────────────
  function clearCustomization(item) {
    setSelectedSize(defaultSizeOption);
    setSelectedSugar(defaultSugarOption);
    setSelectedIce(isHotCoffeeItem(item) ? noIceOption : defaultIceOption);
    setSelectedToppings([]);
    setComments("");
    setCustomizeStep(1);
  }

  function handleSelectItem(item) {
    setEditingCartItemId(null);
    setCurrentItem(item);
    clearCustomization(item);
    setCustomizeStep(1);
    setScreen(SCREEN.CUSTOMIZE);
  }

  function handleCancelCustomization() {
    clearCustomization();
    setCurrentItem(null);
    setEditingCartItemId(null);
    setScreen(SCREEN.MENU);
  }

  function startEditCartItem(item) {
    const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);
    if (!menuItem) return;
    const selectedIds = new Set(item.modificationIds || []);
    const size =
      sizeOptions.find((opt) => selectedIds.has(opt.id)) ||
      sizeOptions.find((opt) => opt.name === item.sizeName) ||
      defaultSizeOption;
    const sugar =
      sugarOptions.find((opt) => selectedIds.has(opt.id)) ||
      sugarOptions.find((opt) => opt.name === item.sugarLevel) ||
      defaultSugarOption;
    const ice = isHotCoffeeItem(menuItem)
      ? noIceOption
      : (iceOptions.find((opt) => selectedIds.has(opt.id)) ||
         iceOptions.find((opt) => opt.name === item.iceLevel) ||
         defaultIceOption);
    const toppings = toppingOptions.filter((opt) => selectedIds.has(opt.id));
    const fallbackToppings = (item.toppingNames || []).length
      ? toppingOptions.filter((opt) => (item.toppingNames || []).includes(opt.name))
      : [];
    setEditingCartItemId(item.id);
    setCurrentItem(menuItem);
    setCustomizeStep(1);
    setSelectedSize(size);
    setSelectedSugar(sugar);
    setSelectedIce(ice);
    setSelectedToppings(toppings.length ? toppings : fallbackToppings);
    setComments(item.comments || "");
    setScreen(SCREEN.CUSTOMIZE);
  }

  function toggleTopping(topping) {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.id === topping.id);
      if (exists) return prev.filter((t) => t.id !== topping.id);
      return [...prev, topping];
    });
  }

  function saveCustomizedItem() {
    if (!currentItem) return;
    const effectiveSize =
      selectedSize ||
      defaultSizeOption ||
      sizeOptions.find((o) => (o.name || "").toLowerCase().includes("regular")) ||
      sizeOptions[0] ||
      null;
    const effectiveSugar =
      selectedSugar ||
      defaultSugarOption ||
      sugarOptions[sugarOptions.length - 1] ||
      null;
    const effectiveIce =
      selectedIce ||
      defaultIceOption ||
      iceOptions.find((o) => o.name.toLowerCase().includes("regular")) ||
      iceOptions[0] ||
      null;
    const totalPrice =
      currentItem.cost +
      (effectiveSize?.cost || 0) +
      (effectiveSugar?.cost || 0) +
      (effectiveIce?.cost || 0) +
      selectedToppings.reduce((sum, t) => sum + t.cost, 0);
    const modificationIds = [
      effectiveSize?.id,
      effectiveSugar?.id,
      effectiveIce?.id,
      ...selectedToppings.map((t) => t.id),
    ].filter(Boolean);
    const itemPayload = {
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sizeName: effectiveSize?.name || "Regular",
      sugarLevel: effectiveSugar?.name || "100% Sugar",
      iceLevel: effectiveIce?.name || "Regular Ice",
      toppingNames: selectedToppings.map((t) => t.name),
      comments: comments.trim(),
      modificationIds,
    };
    if (editingCartItemId) {
      setCart((prev) =>
        prev.map((item) => item.id === editingCartItemId ? { ...item, ...itemPayload } : item),
      );
      clearCustomization();
      setCurrentItem(null);
      setEditingCartItemId(null);
      setScreen(SCREEN.MENU);
      return;
    }
    setCart((prev) => [...prev, { id: Date.now(), quantity: 1, ...itemPayload }]);
    clearCustomization();
    setCurrentItem(null);
    setScreen(SCREEN.MENU);
  }

  // ── Cart handlers ──────────────────────────────────────────────────
  function addFavoriteToCart(favCartItem) {
    setCart((prev) => [...prev, favCartItem]);
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function updateCartQuantity(itemId, nextQuantity) {
    const safeQuantity = Number(nextQuantity);
    if (!Number.isFinite(safeQuantity)) return;
    if (safeQuantity <= 0) { removeFromCart(itemId); return; }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.round(safeQuantity) } : item,
      ),
    );
  }

  // ── Order submission ───────────────────────────────────────────────
  function completeOrder(paymentType) {
    async function submitOrder() {
      try {
        const orderPayload = {
          employee_id: 1,
          payment_type: paymentType,
          customer_email: user?.email || null,
          customer_name: user?.name || null,
          google_id: user?.sub || user?.google_id || null,
          items: cart.map((item) => ({
            menu_item_id: item.menuItemId,
            quantity: item.quantity || 1,
            modification_ids: item.modificationIds || [],
            comments: item.comments || "",
          })),
        };
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/cashier/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(orderPayload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Order submission failed");
        }
        const result = await response.json();
        const orderNum = result.order?.order_id || Math.floor(1000 + Math.random() * 9000);
        setCustomerOrders((prev) => [
          { order_id: orderNum, order_date: new Date().toISOString(), total_cost: discountedSubtotal },
          ...prev,
        ]);
        setCart([]);
        setOrderNumber(orderNum);
        setTrackedOrderId(orderNum);
        setOrderStatus("In Progress");
        setScreen(SCREEN.MENU);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
        triggerRefresh();
      } catch (error) {
        console.error("Order submission error:", error);
        alert(`Failed to submit order: ${error.message}. Please try again or see a cashier.`);
      }
    }
    submitOrder();
  }

  // ── Render (supports isMagnified duplicate for the magnifier lens) ─
  const renderAppContent = (isMagnified = false) => (
    <>
      <CustomerHeader
        user={user}
        logout={logout}
        navigate={navigate}
        accessibilityOpen={accessibilityOpen}
        setAccessibilityOpen={setAccessibilityOpen}
        textScale={textScale}
        setTextScale={setTextScale}
        fontSize={fontSize}
        setFontSize={setFontSize}
        magnifierEnabled={magnifierEnabled}
        setMagnifierEnabled={setMagnifierEnabled}
        magnifierZoom={magnifierZoom}
        setMagnifierZoom={setMagnifierZoom}
        highContrastEnabled={highContrastEnabled}
        setHighContrastEnabled={setHighContrastEnabled}
        translateContainerId={translateContainerId}
        accessibilityPanelRef={accessibilityPanelRef}
        isMagnified={isMagnified}
      />

      <div className="customer-content-wrapper">
        {screen === SCREEN.MENU && (
          <MenuScreen
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            user={user}
            savedFavorites={savedFavorites}
            mostOrderedItems={mostOrderedItems}
            customerMostOrderedItems={customerMostOrderedItems}
            menuItems={menuItems}
            visibleItems={visibleItems}
            handleSelectItem={handleSelectItem}
            addFavoriteToCart={addFavoriteToCart}
            handleToggleFavorite={handleToggleFavorite}
            weather={weather}
            weeklyWeather={weeklyWeather}
            weatherLoading={weatherLoading}
          />
        )}

        {screen === SCREEN.CUSTOMIZE && currentItem && (
          <CustomizeScreen
            currentItem={currentItem}
            customizeStep={customizeStep}
            setCustomizeStep={setCustomizeStep}
            selectedSugar={selectedSugar}
            setSelectedSugar={setSelectedSugar}
            selectedIce={selectedIce}
            setSelectedIce={setSelectedIce}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedToppings={selectedToppings}
            toggleTopping={toggleTopping}
            comments={comments}
            setComments={setComments}
            handleCancelCustomization={handleCancelCustomization}
            saveCustomizedItem={saveCustomizedItem}
            editingCartItemId={editingCartItemId}
            sizeOptions={sizeOptions}
            sugarOptions={sugarOptions}
            iceOptions={iceOptions}
            toppingOptions={toppingOptions}
            isIceLocked={isHotCoffeeItem(currentItem)}
          />
        )}

        {screen === SCREEN.CART && (
          <CartScreen
            cart={cart}
            user={user}
            menuItems={menuItems}
            setScreen={setScreen}
            removeFromCart={removeFromCart}
            updateCartQuantity={updateCartQuantity}
            startEditCartItem={startEditCartItem}
            getFavoriteMatch={getFavoriteMatch}
            handleToggleFavorite={handleToggleFavorite}
            rewardsStatus={rewardsStatus}
            rewardsTone={rewardsTone}
            cartTotal={cartTotal}
            discountAmount={discountAmount}
            discountedSubtotal={discountedSubtotal}
            previousYearPoints={previousYearPoints}
            pointsFromCurrentOrder={pointsFromCurrentOrder}
            pointsToNextTier={pointsToNextTier}
            tierProgressPercent={tierProgressPercent}
          />
        )}

        {screen === SCREEN.CHECKOUT && (
          <CheckoutScreen
            setScreen={setScreen}
            cartCount={cartCount}
            cartTotal={cartTotal}
            rewardsStatus={rewardsStatus}
            discountAmount={discountAmount}
            checkoutTax={checkoutTax}
            checkoutTotal={checkoutTotal}
            completeOrder={completeOrder}
          />
        )}
      </div>

      {screen !== SCREEN.CART && screen !== SCREEN.CHECKOUT && screen !== SCREEN.CUSTOMIZE && (
        <button
          id={isMagnified ? "magnified-cart-badge" : "real-cart-badge"}
          className="cart-badge"
          onClick={isMagnified ? undefined : () => setScreen(SCREEN.CART)}
          style={isMagnified ? { position: "absolute" } : {}}
        >
          <FiShoppingCart />{cartCount > 0 && <span className="cart-badge-count">{cartCount}</span>}
        </button>
      )}

      <OrderConfirmation
        showConfirmation={showConfirmation}
        setShowConfirmation={setShowConfirmation}
        orderNumber={orderNumber}
        orderStatus={orderStatus}
        setTrackedOrderId={setTrackedOrderId}
        setOrderNumber={setOrderNumber}
        setOrderStatus={setOrderStatus}
        ordersModalOpen={ordersModalOpen}
        setOrdersModalOpen={setOrdersModalOpen}
        customerOrders={customerOrders}
        isMagnified={isMagnified}
      />
    </>
  );

  return (
    <div className="customer-page">
      {renderAppContent(false)}

      {magnifierEnabled && (
        <div ref={magnifierRef} className="magnifier-v1">
          <div ref={lensInnerRef} className="magnified-content">
            {renderAppContent(true)}
          </div>
          <div className="magnifier-badge">{magnifierZoom}×</div>
        </div>
      )}

      <Chatbot
        menuItems={menuItems}
        toppingOptions={toppingOptions}
        sugarOptions={sugarOptions}
        iceOptions={iceOptions}
        sizeOptions={sizeOptions}
        mostOrderedItems={mostOrderedItems}
      />
    </div>
  );
}
