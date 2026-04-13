import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./CustomerScreen.css";
import MenuBoard from "../menu/MenuBoard";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
const TAX_RATE = 0.0825;
const GOLD_POINTS_THRESHOLD = 1000;
const PLATINUM_POINTS_THRESHOLD = GOLD_POINTS_THRESHOLD + 2500;
const DIAMOND_POINTS_THRESHOLD = PLATINUM_POINTS_THRESHOLD + 5000;
const REWARDS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const LANGUAGE_CODE_ALIASES = { iw: "he", jw: "jv" };
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const SCREEN = {
  MENU: "MENU",
  CUSTOMIZE: "CUSTOMIZE",
  CART: "CART",
  CHECKOUT: "CHECKOUT",
};

function currency(value) {
  const num = Number(value);
  if (isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

function describeWeatherCode(code) {
  const map = {
    0: "Sunny",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Light showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Thunderstorm",
    96: "Thunderstorm & hail",
    99: "Heavy hail storm",
  };
  return map[Number(code)] || "Weather unavailable";
}

function formatWeekdayLabel(dateString) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T12:00:00`);
  return isNaN(d.getTime()) ? "" : WEEKDAY_FORMATTER.format(d);
}

function pointsFromAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.floor(numericAmount) * 10;
}

function getRewardsStatus(points, isEmployee) {
  if (isEmployee) {
    return {
      tier: "Employee",
      discountRate: 0.5,
      note: "Employee Exclusive - 50% Off",
      nextTierAt: null,
    };
  }
  if (points >= DIAMOND_POINTS_THRESHOLD) {
    return { tier: "Diamond", discountRate: 0.3, note: "", nextTierAt: null };
  }
  if (points >= PLATINUM_POINTS_THRESHOLD) {
    return {
      tier: "Platinum",
      discountRate: 0.2,
      note: "",
      nextTierAt: DIAMOND_POINTS_THRESHOLD,
    };
  }
  if (points >= GOLD_POINTS_THRESHOLD) {
    return {
      tier: "Gold",
      discountRate: 0.1,
      note: "",
      nextTierAt: PLATINUM_POINTS_THRESHOLD,
    };
  }
  return {
    tier: "Member",
    discountRate: 0,
    note: "",
    nextTierAt: GOLD_POINTS_THRESHOLD,
  };
}

function buildDisplayLines(item) {
  const lines = [];
  if (item.sugarLevel && item.sugarLevel !== "Regular")
    lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel && item.iceLevel !== "Regular")
    lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length)
    lines.push(`Toppings: ${item.toppingNames.join(", ")}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}

function toNativeLanguageName(languageCode, fallback) {
  if (!languageCode) return fallback;
  const [baseCode] = languageCode.split("-");
  const normalizedBaseCode = LANGUAGE_CODE_ALIASES[baseCode] || baseCode;
  const normalizedLocale = languageCode.replace(baseCode, normalizedBaseCode);
  try {
    const displayNames = new Intl.DisplayNames([normalizedLocale], {
      type: "language",
    });
    return displayNames.of(normalizedBaseCode) || fallback;
  } catch {
    return fallback;
  }
}

export default function CustomerScreen() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [screen, setScreen] = useState(SCREEN.MENU);
  const [textScale, setTextScale] = useState(100);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [customizeStep, setCustomizeStep] = useState(1);
  const [selectedSugar, setSelectedSugar] = useState(null);
  const [selectedIce, setSelectedIce] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [comments, setComments] = useState("");
  const [orderNumber, setOrderNumber] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierZoom, setMagnifierZoom] = useState(2);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(100);

  const [menuItems, setMenuItems] = useState([]);
  const [mostOrderedItems, setMostOrderedItems] = useState([]);
  const [savedFavorites, setSavedFavorites] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [isEmployeeRewardsUser, setIsEmployeeRewardsUser] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weeklyWeather, setWeeklyWeather] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    "Favorites",
    "Most Ordered",
    "All",
  ]);

  const [showMenuBoard, setShowMenuBoard] = useState(false);

  const magnifierRef = useRef(null);
  const lensInnerRef = useRef(null);
  const magnifierZoomRef = useRef(magnifierZoom);
  const accessibilityPanelRef = useRef(null);

  // Ref for magnifier scroll tracking
  const mousePosRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const translateContainerId = useMemo(
    () => `google_translate_${Math.random().toString(36).substring(7)}`,
    [],
  );

  useEffect(() => {
    magnifierZoomRef.current = magnifierZoom;
  }, [magnifierZoom]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const menuRes = await fetch(`${API_BASE}/menu/items`);
        const menuData = await menuRes.json();
        const items = menuData.menuItems || menuData.items || [];
        setMenuItems(
          items.map((item) => ({
            id: item.menu_item_id,
            name: item.name,
            cost: Number(item.cost),
            category: item.category || "Other",
          })),
        );
        const CATEGORY_ORDER = [
          "Milk Tea",
          "Fruit Tea",
          "Fresh Brew",
          "Matcha",
          "Ice Blended",
          "Specialty",
        ];
        const rawCategories = [
          ...new Set(items.map((item) => item.category || "Other")),
        ];
        const sortedCategories = [
          ...CATEGORY_ORDER.filter((c) => rawCategories.includes(c)),
          ...rawCategories.filter((c) => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories([
          "Favorites",
          "Most Ordered",
          "All",
          ...sortedCategories,
        ]);
        const modRes = await fetch(`${API_BASE}/cashier/modifications`);
        const modData = await modRes.json();
        setSugarOptions(
          (modData.sugar || []).map((m) => ({
            id: m.modification_type_id,
            name: m.name,
            cost: Number(m.cost),
          })),
        );
        setIceOptions(
          (modData.ice || []).map((m) => ({
            id: m.modification_type_id,
            name: m.name,
            cost: Number(m.cost),
          })),
        );
        setToppingOptions(
          (modData.toppings || []).map((m) => ({
            id: m.modification_type_id,
            name: m.name,
            cost: Number(m.cost),
          })),
        );
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!token || user?.type !== "customer") {
      setCustomerOrders([]);
      return;
    }

    let cancelled = false;
    async function loadCustomerOrders() {
      try {
        const response = await fetch(`${API_BASE}/customer/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load customer orders");
        const data = await response.json();
        if (!cancelled)
          setCustomerOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (error) {
        console.error("Failed to load customer orders:", error);
        if (!cancelled) setCustomerOrders([]);
      }
    }

    loadCustomerOrders();
    return () => {
      cancelled = true;
    };
  }, [token, user?.type, refreshTrigger]);

  useEffect(() => {
    const email = (user?.email || "").trim().toLowerCase();
    if (!email) {
      setIsEmployeeRewardsUser(false);
      return;
    }

    let cancelled = false;
    async function loadEmployeeMatch() {
      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;
        const response = await fetch(`${API_BASE}/employees`, { headers });
        if (!response.ok) throw new Error("Failed to load employees");
        const data = await response.json();
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const isMatch = employees.some((emp) => {
          const employeeEmail = (emp.google_email || "").trim().toLowerCase();
          const position = String(emp.position || "");
          return (
            employeeEmail === email &&
            ["Cashier", "Manager", "Shift Lead"].includes(position)
          );
        });
        if (!cancelled) setIsEmployeeRewardsUser(isMatch);
      } catch (error) {
        console.error("Failed to load employee match:", error);
        if (!cancelled) setIsEmployeeRewardsUser(false);
      }
    }

    loadEmployeeMatch();
    return () => {
      cancelled = true;
    };
  }, [token, user?.email]);

  // ── Weather (College Station, refreshes every 10 min) ──────────────
  useEffect(() => {
    let cancelled = false;
    let timerId = null;
    async function loadWeather() {
      try {
        setWeatherLoading(true);
        const res = await fetch(
          `${API_BASE}/external/weather?city=College%20Station,US`,
        );
        if (!res.ok) throw new Error("weather fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setWeather(data);
        let weekly = Array.isArray(data.dailyForecast)
          ? data.dailyForecast.slice(0, 7)
          : [];
        if (!weekly.length) {
          try {
            const wr = await fetch(
              "https://api.open-meteo.com/v1/forecast?latitude=30.6280&longitude=-96.3344&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7",
            );
            if (wr.ok) {
              const wd = await wr.json();
              const times = wd.daily?.time || [];
              weekly = times.map((date, i) => ({
                date,
                description: describeWeatherCode(wd.daily.weather_code?.[i]),
                maxTemp: Number(wd.daily.temperature_2m_max?.[i]),
                minTemp: Number(wd.daily.temperature_2m_min?.[i]),
              }));
            }
          } catch {
            /* ignore */
          }
        }
        if (!cancelled) setWeeklyWeather(weekly);
      } catch {
        if (!cancelled) {
          setWeather(null);
          setWeeklyWeather([]);
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }
    loadWeather();
    timerId = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, []);

  // ── Most ordered (per signed-in customer) ─────────────────────────
  useEffect(() => {
    if (!user || !token || user.type !== "customer" || user.guest) return;
    fetch(`${API_BASE}/customer/most-ordered`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && Array.isArray(data)) {
          setMostOrderedItems(
            data.map((item) => ({
              ...item,
              id: item.menu_item_id,
              cost: Number(item.cost),
            })),
          );
        }
      })
      .catch(console.error);
  }, [user, token, refreshTrigger]);

  // ── Saved favorites (per signed-in customer, DB-backed) ───────────
  useEffect(() => {
    if (!user || !token || user.type !== "customer" || user.guest) {
      setSavedFavorites([]);
      return;
    }
    fetch(`${API_BASE}/customer/saved-favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && Array.isArray(data)) setSavedFavorites(data);
      })
      .catch(console.error);
  }, [user, token, refreshTrigger]);

  useEffect(() => {
    let labelInterval = null;

    function initializeGoogleTranslate() {
      if (!window.google?.translate) return;

      const container = document.getElementById(translateContainerId);
      if (!container || container.childElementCount > 0) return;

      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          translateContainerId,
        );
      } catch (error) {
        console.error("Google Translate init error:", error);
      }

      let attempts = 0;
      labelInterval = window.setInterval(() => {
        attempts += 1;
        const select = document.querySelector(
          `#${translateContainerId} select.goog-te-combo`,
        );
        let updated = false;

        if (select) {
          Array.from(select.options).forEach((option) => {
            const code = option.value;
            if (!code) {
              option.text = "English";
              return;
            }
            const newText = toNativeLanguageName(code, option.text);
            if (option.text !== newText) {
              option.text = newText;
              updated = true;
            }
          });
        }
        if (updated || attempts >= 50) {
          window.clearInterval(labelInterval);
          labelInterval = null;
        }
      }, 150);
    }

    window.googleTranslateElementInit = initializeGoogleTranslate;

    const script = document.createElement("script");
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (labelInterval) window.clearInterval(labelInterval);
      const existingScript = document.getElementById(
        GOOGLE_TRANSLATE_SCRIPT_ID,
      );
      if (existingScript) existingScript.remove();
      if (window.google && window.google.translate) {
        delete window.google.translate;
      }
      const injectedElements = document.querySelectorAll(
        ".skiptranslate, iframe.goog-te-menu-frame, #goog-gt-tt",
      );
      injectedElements.forEach((el) => el.remove());
    };
  }, [translateContainerId]);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = `${textScale}%`;
    return () => {
      root.style.fontSize = prev;
    };
  }, [textScale]);

  // fontSize is applied via an injected <style> tag so it overrides rem-based values
  useEffect(() => {
    const scale = fontSize / 100;
    const id = "customer-font-size-override";
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement("style");
      tag.id = id;
      document.head.appendChild(tag);
    }
    tag.textContent = `
      .customer-page .customer-header h1            { font-size: ${2 * scale}rem !important; }
      .customer-page .accessibility-toggle-btn      { font-size: ${1 * scale}rem !important; }
      .customer-page .exit-btn                      { font-size: ${1.1 * scale}rem !important; }
      .customer-page .category-tab                  { font-size: ${1.1 * scale}rem !important; }
      .customer-page .item-name                     { font-size: ${1.25 * scale}rem !important; }
      .customer-page .item-price                    { font-size: ${1.5 * scale}rem !important; }
      .customer-page .customize-header h2           { font-size: ${1.5 * scale}rem !important; }
      .customer-page .customize-section h3          { font-size: ${1.1 * scale}rem !important; }
      .customer-page .option-btn                    { font-size: ${1 * scale}rem !important; }
      .customer-page .btn-primary,
      .customer-page .btn-secondary                 { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-item-name                { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-item-price               { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-total-line               { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-total-line-final         { font-size: ${1.4 * scale}rem !important; }
      .customer-page .checkout-screen h2            { font-size: ${1.5 * scale}rem !important; }
      .customer-page .summary-row                   { font-size: ${1.1 * scale}rem !important; }
      .customer-page .summary-row.total             { font-size: ${1.5 * scale}rem !important; }
      .customer-page .payment-btn                   { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-badge                    { font-size: ${1.1 * scale}rem !important; }
      .customer-page .customer-user-name            { font-size: ${0.9 * scale}rem !important; }
      .customer-page .customize-progress            { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-items-title              { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-screen h2                { font-size: ${1.5 * scale}rem !important; }
      .customer-page .cart-panel-title              { font-size: ${1.4 * scale}rem !important; }
      .customer-page .cart-panel-empty-msg          { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-panel-empty-sub          { font-size: ${0.95 * scale}rem !important; }
      .customer-page .cart-panel-checkout-btn       { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-item-detail              { font-size: ${0.9 * scale}rem !important; }
      .customer-page .option-cost                   { font-size: ${0.9 * scale}rem !important; }
      .customer-page .comments-input                { font-size: ${1 * scale}rem !important; }
    `;
    return () => {
      tag.textContent = "";
    };
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrastEnabled) {
      root.style.filter = "grayscale(100%) contrast(250%) brightness(95%)";
    } else {
      root.style.filter = "";
    }
    return () => {
      root.style.filter = "";
    };
  }, [highContrastEnabled]);

  // The "click outside to close" useEffect has been completely removed to lock the menu open.

  useEffect(() => {
    if (!magnifierEnabled) return;

    function updateMagnifier() {
      const mag = magnifierRef.current;
      const inner = lensInnerRef.current;
      if (!mag || !inner) return;

      const { x, y } = mousePosRef.current;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const z = magnifierZoomRef.current;

      const lensSize = 350;
      const half = lensSize / 2;

      mag.style.left = `${x}px`;
      mag.style.top = `${y}px`;
      mag.style.width = `${lensSize}px`;
      mag.style.height = `${lensSize}px`;

      inner.style.transform = `scale(${z})`;
      inner.style.left = `${-(x + scrollX) * z + half}px`;
      inner.style.top = `${-(y + scrollY) * z + half}px`;

      const syncFixedElement = (realId, magId) => {
        const realEl = document.getElementById(realId);
        const magEl = document.getElementById(magId);
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
      syncFixedElement("real-customize-modal", "magnified-customize-modal");
      syncFixedElement("real-orders-modal", "magnified-orders-modal");
    }

    function handleMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      updateMagnifier();
    }

    function handleScroll() {
      updateMagnifier();
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    updateMagnifier();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [magnifierEnabled]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === "Favorites") return [];
    if (selectedCategory === "Most Ordered") return [];
    if (selectedCategory === "All") return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, menuItems]);

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0),
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
    () =>
      priorYearOrders.reduce(
        (sum, order) => sum + pointsFromAmount(order.total_cost),
        0,
      ),
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
  const checkoutTax = useMemo(
    () => discountedSubtotal * TAX_RATE,
    [discountedSubtotal],
  );
  const checkoutTotal = useMemo(
    () => discountedSubtotal + checkoutTax,
    [discountedSubtotal, checkoutTax],
  );
  const pointsFromCurrentOrder = useMemo(
    () => pointsFromAmount(discountedSubtotal),
    [discountedSubtotal],
  );
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

  function getFavoriteMatch(item) {
    const targetId = item.id ?? item.menu_item_id;
    return savedFavorites.find((fav) => {
      const favItemId =
        fav.item_data?.menu_item_id ?? fav.item_data?.id ?? fav.menu_item_id;
      return favItemId === targetId;
    });
  }

  async function handleToggleFavorite(item, e) {
    e.stopPropagation();
    if (!user || !token || user.guest) {
      alert("Sign in to save favorites!");
      return;
    }
    const fav = getFavoriteMatch(item);
    try {
      if (fav) {
        await fetch(`${API_BASE}/customer/saved-favorites/${fav.favorite_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedFavorites((prev) =>
          prev.filter((f) => f.favorite_id !== fav.favorite_id),
        );
      } else {
        const itemData = {
          menu_item_id: item.id,
          name: item.name,
          cost: item.cost,
          category: item.category,
        };
        const res = await fetch(`${API_BASE}/customer/saved-favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_email: user.email,
            customer_name: user.name || user.email,
            google_id: user.sub || user.google_id || user.email,
            item_data: itemData,
          }),
        });
        const data = await res.json();
        if (!data.error)
          setSavedFavorites((prev) => [
            ...prev,
            { favorite_id: data.favorite_id, item_data: itemData },
          ]);
      }
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  }

  function clearCustomization() {
    setSelectedSugar(null);
    setSelectedIce(null);
    setSelectedToppings([]);
    setComments("");
    setCustomizeStep(1);
  }

  function handleSelectItem(item) {
    setEditingCartItemId(null);
    setCurrentItem(item);
    clearCustomization();
    const defaultSugar =
      sugarOptions.find((opt) => opt.name.includes("50")) || null;
    const defaultIce =
      iceOptions.find((opt) => opt.name.toLowerCase().includes("regular")) ||
      null;
    setSelectedSugar(defaultSugar);
    setSelectedIce(defaultIce);
    setCustomizeModalOpen(true);
  }

  function handleCancelCustomization() {
    clearCustomization();
    setCurrentItem(null);
    setEditingCartItemId(null);
    setCustomizeModalOpen(false);
  }

  function startEditCartItem(item) {
    const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);
    if (!menuItem) return;

    const selectedIds = new Set(item.modificationIds || []);
    const sugar =
      sugarOptions.find((opt) => selectedIds.has(opt.id)) ||
      sugarOptions.find((opt) => opt.name === item.sugarLevel) ||
      null;
    const ice =
      iceOptions.find((opt) => selectedIds.has(opt.id)) ||
      iceOptions.find((opt) => opt.name === item.iceLevel) ||
      null;
    const toppings = toppingOptions.filter((opt) => selectedIds.has(opt.id));
    const fallbackToppings = (item.toppingNames || []).length
      ? toppingOptions.filter((opt) =>
          (item.toppingNames || []).includes(opt.name),
        )
      : [];

    setEditingCartItemId(item.id);
    setCurrentItem(menuItem);
    setCustomizeStep(1);
    setSelectedSugar(sugar);
    setSelectedIce(ice);
    setSelectedToppings(toppings.length ? toppings : fallbackToppings);
    setComments(item.comments || "");
    setCustomizeModalOpen(true);
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
    const totalPrice =
      currentItem.cost +
      (selectedSugar?.cost || 0) +
      (selectedIce?.cost || 0) +
      selectedToppings.reduce((sum, t) => sum + t.cost, 0);
    const modificationIds = [
      selectedSugar?.id,
      selectedIce?.id,
      ...selectedToppings.map((t) => t.id),
    ].filter(Boolean);
    const itemPayload = {
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sugarLevel: selectedSugar?.name || "Regular",
      iceLevel: selectedIce?.name || "Regular",
      toppingNames: selectedToppings.map((t) => t.name),
      comments: comments.trim(),
      modificationIds,
    };
    if (editingCartItemId) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === editingCartItemId ? { ...item, ...itemPayload } : item,
        ),
      );
      clearCustomization();
      setCurrentItem(null);
      setEditingCartItemId(null);
      setCustomizeModalOpen(false);
      return;
    }

    const item = { id: Date.now(), quantity: 1, ...itemPayload };
    setCart((prev) => [...prev, item]);
    clearCustomization();
    setCurrentItem(null);
    setCustomizeModalOpen(false);
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function updateCartQuantity(itemId, nextQuantity) {
    const safeQuantity = Number(nextQuantity);
    if (!Number.isFinite(safeQuantity)) return;
    if (safeQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.round(safeQuantity) }
          : item,
      ),
    );
  }

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
        const orderNum =
          result.order?.order_id || Math.floor(1000 + Math.random() * 9000);
        setCustomerOrders((prev) => [
          {
            order_id: orderNum,
            order_date: new Date().toISOString(),
            total_cost: discountedSubtotal,
          },
          ...prev,
        ]);
        setCart([]);
        setOrderNumber(orderNum);
        setScreen(SCREEN.MENU);
        setShowConfirmation(true);
        setRefreshTrigger((prev) => prev + 1);
        setTimeout(() => {
          setShowConfirmation(false);
          setOrderNumber(null);
        }, 5000);
      } catch (error) {
        console.error("Order submission error:", error);
        alert(
          `Failed to submit order: ${error.message}. Please try again or see a cashier.`,
        );
      }
    }
    submitOrder();
  }

  const textSizePercent = ((textScale - 85) / (140 - 85)) * 100;
  const zoomPercent = ((magnifierZoom - 1.5) / (4 - 1.5)) * 100;

  const renderAppContent = (isMagnified = false) => (
    <>
      <header className="customer-header">
        <div className="header-content">
          <button
            className={`menu-board-btn${showMenuBoard ? " active" : ""}`}
            onClick={() => setShowMenuBoard((v) => !v)}
          >
            Menu Board
          </button>
          <h1>Team 32's Boba Bar</h1>
          <div className="header-actions">
            <div
              className="accessibility-wrapper"
              ref={isMagnified ? null : accessibilityPanelRef}
            >
              <button
                className="accessibility-toggle-btn"
                onClick={() => setAccessibilityOpen((o) => !o)}
                aria-expanded={accessibilityOpen}
                aria-haspopup="true"
              >
                <img
                  src="https://uxwing.com/wp-content/themes/uxwing/download/web-app-development/accessibility-icon.png"
                  alt="Accessibility"
                />
                <span>Accessibility</span>
                <span
                  className={`a11y-caret${accessibilityOpen ? " open" : ""}`}
                >
                  ▾
                </span>
              </button>

              <div
                className={`accessibility-panel ${accessibilityOpen ? "open" : ""}`}
                style={{ padding: "1.5rem" }}
              >
                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">UI Size</span>
                    <span className="a11y-section-value">{textScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="85"
                    max="140"
                    step="5"
                    value={textScale}
                    onChange={(e) => setTextScale(Number(e.target.value))}
                    className="a11y-slider"
                    style={{
                      background: `linear-gradient(to right, #8b4513 ${textSizePercent}%, #e5d4b8 ${textSizePercent}%)`,
                    }}
                  />
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">Language</span>
                  </div>
                  <div
                    id={isMagnified ? undefined : translateContainerId}
                    className="google-translate-widget"
                  />
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div
                    className="a11y-section-header"
                    style={{ marginBottom: 0 }}
                  >
                    <span className="a11y-section-title">Contrast (B&W)</span>
                    <button
                      className={`a11y-toggle${highContrastEnabled ? " on" : " off"}`}
                      onClick={() => setHighContrastEnabled((v) => !v)}
                    >
                      {highContrastEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">Magnifier</span>
                    <button
                      className={`a11y-toggle${magnifierEnabled ? " on" : " off"}`}
                      onClick={() => setMagnifierEnabled((v) => !v)}
                    >
                      {magnifierEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  {magnifierEnabled && (
                    <div className="magnifier-controls">
                      <label className="a11y-control-label">
                        Zoom &nbsp;<strong>{magnifierZoom}×</strong>
                      </label>
                      <input
                        type="range"
                        min="1.5"
                        max="4"
                        step="0.5"
                        value={magnifierZoom}
                        onChange={(e) =>
                          setMagnifierZoom(Number(e.target.value))
                        }
                        className="a11y-slider"
                        style={{
                          background: `linear-gradient(to right, #8b4513 ${zoomPercent}%, #e5d4b8 ${zoomPercent}%)`,
                        }}
                      />
                    </div>
                  )}
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div
                    className="a11y-section-header"
                    style={{ marginBottom: 0 }}
                  >
                    <span className="a11y-section-title">Font Size</span>
                    <div className="a11y-font-stepper">
                      <button
                        className="a11y-step-btn"
                        onClick={() => setFontSize((v) => Math.max(50, v - 10))}
                        disabled={fontSize <= 50}
                        aria-label="Decrease font size"
                      >
                        −
                      </button>
                      <span className="a11y-step-value">{fontSize}%</span>
                      <button
                        className="a11y-step-btn"
                        onClick={() =>
                          setFontSize((v) => Math.min(200, v + 10))
                        }
                        disabled={fontSize >= 200}
                        aria-label="Increase font size"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {user && (
              <div className="customer-user-badge">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="customer-user-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="customer-user-avatar customer-user-avatar-fallback">
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <span className="customer-user-name">
                  {user.name || user.email}
                </span>
              </div>
            )}
            {!user?.guest && (
              <button
                className="my-orders-btn"
                onClick={() => setOrdersModalOpen((o) => !o)}
              >
                📋 My Orders
              </button>
            )}
            <button
              className="exit-btn"
              onClick={() => {
                logout();
                navigate("/login/customer");
              }}
            >
              Exit
            </button>
          </div>
        </div>
      </header>

<div style={{ display: showMenuBoard ? 'block' : 'none' }}>
  <MenuBoard />
</div>
<div className="customer-content-wrapper" style={{ display: showMenuBoard ? 'none' : 'block' }}>
          {screen === SCREEN.MENU && (
            <div className="menu-with-cart-layout">
              {/* ── Left: menu ── */}
              <div className="menu-left-col">
                <div className="category-tabs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`category-tab${selectedCategory === cat ? " active" : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="menu-grid">
                  {selectedCategory === "Favorites" ? (
                    savedFavorites.length === 0 ? (
                      <div className="menu-empty-state">
                        <div className="menu-empty-icon">🤍</div>
                        <p>
                          {user?.guest
                            ? "Sign in to save favorites!"
                            : "No favorites yet — tap ♥ on any drink to save it."}
                        </p>
                      </div>
                    ) : (
                      savedFavorites.map((fav) => {
                        const favItemId =
                          fav.item_data?.menu_item_id ?? fav.item_data?.id;
                        const menuItem = menuItems.find(
                          (m) => m.id === favItemId,
                        ) || {
                          id: favItemId,
                          name: fav.item_data?.name || "Unknown",
                          cost: Number(fav.item_data?.cost) || 0,
                          category: fav.item_data?.category || "Other",
                        };
                        return (
                          <button
                            key={fav.favorite_id}
                            className="menu-item-card"
                            onClick={() => handleSelectItem(menuItem)}
                          >
                            <button
                              className="heart-btn heart-btn--active"
                              onClick={(e) => handleToggleFavorite(menuItem, e)}
                              aria-label="Remove from favorites"
                            >
                              ♥
                            </button>
                            <div className="item-name">{menuItem.name}</div>
                            <div className="item-price">
                              {currency(menuItem.cost)}
                            </div>
                          </button>
                        );
                      })
                    )
                  ) : selectedCategory === "Most Ordered" ? (
                    mostOrderedItems.length === 0 ? (
                      <div className="menu-empty-state">
                        <div className="menu-empty-icon">📊</div>
                        <p>
                          {user?.guest
                            ? "Sign in to see your most ordered drinks."
                            : "Place your first order to see your favorites here!"}
                        </p>
                      </div>
                    ) : (
                      mostOrderedItems.map((item) => {
                        const isFav = !!getFavoriteMatch(item);
                        return (
                          <button
                            key={item.id}
                            className="menu-item-card"
                            onClick={() => handleSelectItem(item)}
                          >
                            <button
                              className={`heart-btn${isFav ? " heart-btn--active" : ""}`}
                              onClick={(e) => handleToggleFavorite(item, e)}
                              aria-label={
                                isFav
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                            >
                              {isFav ? "♥" : "♡"}
                            </button>
                            <div className="item-name">{item.name}</div>
                            <div className="item-price">
                              {currency(item.cost)}
                            </div>
                            {item.order_count && (
                              <div className="item-order-count">
                                ordered {item.order_count}×
                              </div>
                            )}
                          </button>
                        );
                      })
                    )
                  ) : (
                    visibleItems.map((item) => {
                      const isFav = !!getFavoriteMatch(item);
                      return (
                        <button
                          key={item.id}
                          className="menu-item-card"
                          onClick={() => handleSelectItem(item)}
                        >
                          <button
                            className={`heart-btn${isFav ? " heart-btn--active" : ""}`}
                            onClick={(e) => handleToggleFavorite(item, e)}
                            aria-label={
                              isFav
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          >
                            {isFav ? "♥" : "♡"}
                          </button>
                          <div className="item-name">{item.name}</div>
                          <div className="item-price">
                            {currency(item.cost)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Right: cart panel ── */}
              <div className="cart-side-panel">
                <h2 className="cart-panel-title">Your Cart</h2>

                {cart.length === 0 ? (
                  <div className="cart-panel-empty">
                    {weather && !weatherLoading && (
                      <div className="cart-panel-weather">
                        <div className="cart-panel-weather-header">
                          📍 College Station
                        </div>
                        <div className="cart-panel-weather-temp">
                          {Math.round(weather.temperature ?? weather.temp ?? 0)}
                          °F
                        </div>
                        <div className="cart-panel-weather-desc">
                          {weather.description ??
                            describeWeatherCode(weather.weather_code)}
                        </div>
                        {weeklyWeather.length > 0 && (
                          <div className="cart-panel-weather-week">
                            {weeklyWeather.map((day, i) => (
                              <div key={i} className="cart-panel-weather-day">
                                <span className="weather-day-label">
                                  {i === 0
                                    ? "Today"
                                    : formatWeekdayLabel(day.date)}
                                </span>
                                <span className="weather-day-range">
                                  {Math.round(day.maxTemp ?? day.high ?? 0)}° /{" "}
                                  {Math.round(day.minTemp ?? day.low ?? 0)}°
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="cart-panel-empty-icon">🛒</div>
                    <p className="cart-panel-empty-msg">Your cart is empty</p>
                    <p className="cart-panel-empty-sub">
                      Tap any drink to get started
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="cart-panel-scroll-area">
                      <div
                        className={`rewards-summary rewards-tone-${rewardsTone}`}
                      >
                        <div className="rewards-line">
                          <span>Rewards</span>
                          <span
                            className={`rewards-tier-badge rewards-tier-${rewardsTone}`}
                          >
                            {rewardsStatus.tier}
                            {rewardsStatus.discountRate > 0
                              ? ` (${Math.round(rewardsStatus.discountRate * 100)}% off)`
                              : ""}
                          </span>
                        </div>
                        {rewardsStatus.note && (
                          <div className="rewards-note rewards-note-employee">
                            {rewardsStatus.note}
                          </div>
                        )}
                        {rewardsStatus.tier === "Employee" ? (
                          <div className="tier-visual-row">
                            <span className="tier-chip tier-chip-employee active">
                              Employee Only
                            </span>
                          </div>
                        ) : (
                          <div className="tier-visual-row">
                            <span
                              className={`tier-chip ${["Gold", "Platinum", "Diamond"].includes(rewardsStatus.tier) ? "active" : ""}`}
                            >
                              Gold
                            </span>
                            <span
                              className={`tier-chip ${["Platinum", "Diamond"].includes(rewardsStatus.tier) ? "active" : ""}`}
                            >
                              Platinum
                            </span>
                            <span
                              className={`tier-chip ${rewardsStatus.tier === "Diamond" ? "active" : ""}`}
                            >
                              Diamond
                            </span>
                          </div>
                        )}
                        <div className="rewards-progress">
                          <div
                            className="rewards-progress-fill"
                            style={{ width: `${tierProgressPercent}%` }}
                          />
                        </div>
                        <div className="rewards-line">
                          <span>Points (12 mo)</span>
                          <span>{previousYearPoints}</span>
                        </div>
                        <div className="rewards-line">
                          <span>From this order</span>
                          <span>+{pointsFromCurrentOrder}</span>
                        </div>
                        {rewardsStatus.nextTierAt && (
                          <div className="rewards-line">
                            <span>To next tier</span>
                            <span>{pointsToNextTier}</span>
                          </div>
                        )}
                        {!rewardsStatus.nextTierAt && (
                          <div className="rewards-line">
                            <span>Progress</span>
                            <span>Top tier ✓</span>
                          </div>
                        )}
                      </div>

                      <div className="cart-panel-items">
                        {cart.map((item, index) => (
                          <div key={item.id} className="cart-item">
                            <div className="cart-item-header">
                              <span className="cart-item-number">
                                {index + 1}.
                              </span>
                              <span className="cart-item-name">
                                {item.name}
                              </span>
                              <span className="cart-item-price">
                                {currency(item.price * (item.quantity || 1))}
                              </span>
                              <button
                                className="remove-btn"
                                onClick={() => removeFromCart(item.id)}
                              >
                                ×
                              </button>
                            </div>
                            <div className="cart-item-controls">
                              <span className="cart-item-unit-price">
                                Each: {currency(item.price)}
                              </span>
                              <div className="qty-controls">
                                <button
                                  className="qty-btn"
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.id,
                                      (item.quantity || 1) - 1,
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="qty-value">
                                  {item.quantity || 1}
                                </span>
                                <button
                                  className="qty-btn"
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.id,
                                      (item.quantity || 1) + 1,
                                    )
                                  }
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                className="cart-edit-btn"
                                onClick={() => startEditCartItem(item)}
                              >
                                Edit
                              </button>
                            </div>
                            <div className="cart-item-details">
                              {buildDisplayLines(item).map((line, i) => (
                                <div key={i} className="cart-item-detail">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* end cart-panel-scroll-area */}

                    <div className="cart-panel-footer">
                      <div className="cart-total">
                        <div className="cart-total-line">
                          <span>
                            {rewardsStatus.discountRate > 0
                              ? "Subtotal"
                              : "Total"}
                          </span>
                          <span>{currency(cartTotal)}</span>
                        </div>
                        {rewardsStatus.discountRate > 0 && (
                          <>
                            <div className="cart-total-line">
                              <span>
                                Discount (
                                {Math.round(rewardsStatus.discountRate * 100)}%)
                              </span>
                              <span>-{currency(discountAmount)}</span>
                            </div>
                            <div className="cart-total-line cart-total-line-final">
                              <span>Discounted Total</span>
                              <span>{currency(discountedSubtotal)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        className="btn-primary cart-panel-checkout-btn"
                        onClick={() => setScreen(SCREEN.CHECKOUT)}
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {screen === SCREEN.CHECKOUT && (
            <div className="customer-content checkout-screen">
              <h2>Checkout</h2>
              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Items ({cartCount})</span>
                  <span>{currency(cartTotal)}</span>
                </div>
                {rewardsStatus.discountRate > 0 && (
                  <div className="summary-row">
                    <span>
                      Rewards Discount (
                      {Math.round(rewardsStatus.discountRate * 100)}%)
                    </span>
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
                <button
                  className="payment-btn"
                  onClick={() => completeOrder("CARD")}
                >
                  💳 Pay with Card
                </button>
                <button
                  className="payment-btn"
                  onClick={() => {
                    alert("Please see cashier to pay with cash.");
                    completeOrder("CASH");
                  }}
                >
                  💵 Pay with Cash
                </button>
              </div>
              <div className="cart-actions">
                <button
                  className="btn-secondary full-width"
                  onClick={() => setScreen(SCREEN.MENU)}
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}
        </div>

      {showConfirmation && (
        <div
          id={isMagnified ? "magnified-confirmation" : "real-confirmation"}
          className="order-confirmation-notification"
          style={isMagnified ? { transform: "none", left: 0, top: 0 } : {}}
        >
          <div className="confirmation-content">
            <div className="confirmation-checkmark">✓</div>
            <div className="confirmation-text">
              <h3>Order Received!</h3>
              <p>Order Number: #{orderNumber}</p>
              <p className="confirmation-subtitle">
                Please wait for your number to be called.
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
          <div
            className="orders-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-header">
              <h2 className="orders-modal-title">My Orders</h2>
              <button
                className="customize-modal-close"
                onClick={
                  isMagnified ? undefined : () => setOrdersModalOpen(false)
                }
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="orders-modal-body">
              {customerOrders.length === 0 ? (
                <div className="orders-empty">
                  <div className="orders-empty-icon">🧋</div>
                  <p className="orders-empty-msg">No orders yet</p>
                  <p className="orders-empty-sub">
                    Your completed orders will appear here.
                  </p>
                </div>
              ) : (
                customerOrders.map((order) => {
                  const date = new Date(order.order_date);
                  const isRecent = Date.now() - date.getTime() < 30 * 60 * 1000;
                  const status = isRecent ? "In Progress" : "Completed";
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce((s, i) => s + (i.quantity || 1), 0)
                    : null;
                  return (
                    <div key={order.order_id} className="order-history-card">
                      <div className="order-history-top">
                        <div className="order-history-id">
                          Order #{order.order_id}
                        </div>
                        <span
                          className={`order-status-chip order-status-${isRecent ? "progress" : "done"}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="order-history-meta">
                        <span>
                          📅{" "}
                          {date.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>
                          🕐{" "}
                          {date.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {order.payment_type && (
                          <span>
                            {order.payment_type === "CARD" ? "💳" : "💵"}{" "}
                            {order.payment_type}
                          </span>
                        )}
                        {itemCount !== null && (
                          <span>
                            🧋 {itemCount} item{itemCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="order-history-items">
                          {order.items.map((item) => (
                            <div
                              key={item.order_item_id}
                              className="order-history-item-row"
                            >
                              <span className="order-history-item-qty">
                                {item.quantity}×
                              </span>
                              <span className="order-history-item-name">
                                {item.name}
                              </span>
                              <span className="order-history-item-price">
                                {currency(
                                  Number(item.item_price) * item.quantity,
                                )}
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

      {customizeModalOpen && currentItem && (
        <div
          id={
            isMagnified ? "magnified-customize-modal" : "real-customize-modal"
          }
          className="customize-modal-overlay"
          onClick={isMagnified ? undefined : handleCancelCustomization}
        >
          <div
            className="customize-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="customize-modal-image-placeholder">
              <button
                className="customize-modal-close"
                onClick={isMagnified ? undefined : handleCancelCustomization}
                aria-label="Close"
              >
                ✕
              </button>
              <span className="customize-modal-image-icon">🧋</span>
            </div>

            <div className="customize-modal-item-info">
              <h2 className="customize-modal-item-name">{currentItem.name}</h2>
              <p className="customize-modal-item-description">
                Handcrafted fresh to order. Customize it your way below.
              </p>
              <div className="customize-modal-base-price">
                {currency(currentItem.cost)}
              </div>
            </div>

            <div className="customize-modal-body">
              <div className="customize-section">
                <h3>Sugar Level</h3>
                <div className="option-grid">
                  {sugarOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`option-btn ${selectedSugar?.id === opt.id ? "selected" : ""}`}
                      onClick={() => setSelectedSugar(opt)}
                    >
                      {opt.name}
                      {opt.cost > 0 && (
                        <div className="option-cost">+{currency(opt.cost)}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="customize-section">
                <h3>Ice Level</h3>
                <div className="option-grid">
                  {iceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`option-btn ${selectedIce?.id === opt.id ? "selected" : ""}`}
                      onClick={() => setSelectedIce(opt)}
                    >
                      {opt.name}
                      {opt.cost > 0 && (
                        <div className="option-cost">+{currency(opt.cost)}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="customize-section">
                <h3>Toppings</h3>
                <div className="option-grid">
                  {toppingOptions.map((opt) => {
                    const isSelected = selectedToppings.some(
                      (t) => t.id === opt.id,
                    );
                    return (
                      <button
                        key={opt.id}
                        className={`option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleTopping(opt)}
                      >
                        {opt.name}
                        {opt.cost > 0 && (
                          <div className="option-cost">
                            +{currency(opt.cost)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="comments-section">
                <label>Special Instructions</label>
                <input
                  type="text"
                  className="comments-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g., Extra shaken, half boba..."
                />
              </div>
            </div>

            <div className="customize-modal-footer">
              <button
                className="customize-modal-add-btn"
                onClick={saveCustomizedItem}
              >
                {editingCartItemId ? "Save Changes" : "Add to Order"} —{" "}
                {currency(
                  currentItem.cost +
                    (selectedSugar?.cost || 0) +
                    (selectedIce?.cost || 0) +
                    selectedToppings.reduce((sum, t) => sum + t.cost, 0),
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
}
