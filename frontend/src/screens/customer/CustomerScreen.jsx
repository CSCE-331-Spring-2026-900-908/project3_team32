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
  const [selectedCategory, setSelectedCategory] = useState(null);
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
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
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
  const [weather, setWeather] = useState(() => {
    try { const c = sessionStorage.getItem("weather_cache"); return c ? JSON.parse(c).weather : null; } catch { return null; }
  });
  const [weeklyWeather, setWeeklyWeather] = useState(() => {
    try { const c = sessionStorage.getItem("weather_cache"); return c ? JSON.parse(c).weekly || [] : []; } catch { return []; }
  });
  const [weatherLoading, setWeatherLoading] = useState(() => {
    try { return !sessionStorage.getItem("weather_cache"); } catch { return true; }
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    "Favorites",
    "Most Ordered",
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

  const translateContainerId = "google_translate_element";

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
        if (!cancelled) {
          setWeeklyWeather(weekly);
          try { sessionStorage.setItem("weather_cache", JSON.stringify({ weather: data, weekly })); } catch {}
        }
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
  }, [trackedOrderId, orderStatus]);

  useEffect(() => {
    let labelInterval = null;

    function initializeGoogleTranslate() {
      if (!window.google?.translate) return;

      const container = document.getElementById(translateContainerId);
      if (!container) return;
      if (container.childElementCount > 0) return;

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

    const existing = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (!existing) {
      const script = document.createElement("script");
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      initializeGoogleTranslate();
    }

    return () => {
      if (labelInterval) window.clearInterval(labelInterval);
    };
  }, []);

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
      /* ── Header ── */
      .customer-page .customer-header h1            { font-size: ${2 * scale}rem !important; }
      .customer-page .accessibility-toggle-btn      { font-size: ${1 * scale}rem !important; }
      .customer-page .exit-btn                      { font-size: ${1.1 * scale}rem !important; }
      .customer-page .menu-board-btn                { font-size: ${1 * scale}rem !important; }
      .customer-page .customer-user-name            { font-size: ${0.9 * scale}rem !important; }
      /* ── Menu / Kiosk ── */
      .customer-page .category-tab                  { font-size: ${1.1 * scale}rem !important; }
      .customer-page .kiosk-category-name           { font-size: ${1.15 * scale}rem !important; }
      .customer-page .kiosk-back-btn                { font-size: ${1 * scale}rem !important; }
      .customer-page .kiosk-category-title          { font-size: ${1.4 * scale}rem !important; }
      .customer-page .item-name                     { font-size: ${1.25 * scale}rem !important; }
      .customer-page .item-price                    { font-size: ${1.5 * scale}rem !important; }
      /* ── Customize steps ── */
      .customer-page .customize-step-title          { font-size: ${1.5 * scale}rem !important; }
      .customer-page .customize-step-subtitle       { font-size: ${0.9 * scale}rem !important; }
      .customer-page .customize-option-name         { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-option-cost         { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-item-name           { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-item-price          { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-progress-label      { font-size: ${0.75 * scale}rem !important; }
      .customer-page .customize-progress-dot        { font-size: ${0.85 * scale}rem !important; }
      .customer-page .customize-nav-btn             { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-review-header h3    { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-review-header p     { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-label        { font-size: ${0.9 * scale}rem !important; }
      .customer-page .customize-review-value        { font-size: ${0.95 * scale}rem !important; }
      .customer-page .customize-review-topping-chip { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-total-label  { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-review-total-price  { font-size: ${1.35 * scale}rem !important; }
      .customer-page .customize-review-breakdown-row { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-section-title { font-size: ${0.75 * scale}rem !important; }
      .customer-page .customize-review-comments label { font-size: ${0.85 * scale}rem !important; }
      .customer-page .comments-input                { font-size: ${0.95 * scale}rem !important; }
      /* ── Cart screen ── */
      .customer-page .cart-screen h2                { font-size: ${1.5 * scale}rem !important; }
      .customer-page .cart-item-name                { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-item-price               { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-item-unit-price          { font-size: ${0.85 * scale}rem !important; }
      .customer-page .cart-item-detail              { font-size: ${0.9 * scale}rem !important; }
      .customer-page .cart-fav-btn                  { font-size: ${0.8 * scale}rem !important; }
      .customer-page .cart-edit-btn                 { font-size: ${0.85 * scale}rem !important; }
      .customer-page .cart-total-line               { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-total-line-final         { font-size: ${1.4 * scale}rem !important; }
      .customer-page .cart-badge                    { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-panel-empty-msg          { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-panel-empty-sub          { font-size: ${0.95 * scale}rem !important; }
      /* ── Checkout screen ── */
      .customer-page .checkout-screen h2            { font-size: ${1.5 * scale}rem !important; }
      .customer-page .summary-row                   { font-size: ${1.1 * scale}rem !important; }
      .customer-page .summary-row.total             { font-size: ${1.5 * scale}rem !important; }
      .customer-page .payment-btn                   { font-size: ${1.1 * scale}rem !important; }
      /* ── Rewards ── */
      .customer-page .rewards-summary               { font-size: ${0.9 * scale}rem !important; }
      .customer-page .rewards-line                  { font-size: ${0.9 * scale}rem !important; }
      .customer-page .tier-chip                     { font-size: ${0.75 * scale}rem !important; }
      /* ── Buttons ── */
      .customer-page .btn-primary,
      .customer-page .btn-secondary                 { font-size: ${1.1 * scale}rem !important; }
      /* ── Weather ── */
      .customer-page .kiosk-weather-current-temp    { font-size: ${2 * scale}rem !important; }
      .customer-page .kiosk-weather-card-day        { font-size: ${0.75 * scale}rem !important; }
      .customer-page .kiosk-weather-card-range      { font-size: ${0.85 * scale}rem !important; }
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

    const SCROLLABLE = [
      '.menu-left-col',
      '.cart-panel-scroll-area',
      '.orders-modal-body',
      '.customize-step-content',
      '.checkout-screen',
      '.cart-screen',
      '.customer-content-wrapper',
    ];

    function findReal(sel) {
      const all = document.querySelectorAll(sel);
      for (const el of all) {
        if (!el.closest('.magnified-content')) return el;
      }
      return null;
    }

    function syncScrollPositions() {
      const inner = lensInnerRef.current;
      if (!inner) return;
      SCROLLABLE.forEach(sel => {
        const real = findReal(sel);
        const clone = inner.querySelector(sel);
        if (real && clone && clone.scrollTop !== real.scrollTop) {
          clone.scrollTop = real.scrollTop;
        }
        if (real && clone && clone.scrollLeft !== real.scrollLeft) {
          clone.scrollLeft = real.scrollLeft;
        }
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

      const lensSize = 350;
      const half = lensSize / 2;

      mag.style.left = `${x}px`;
      mag.style.top = `${y}px`;
      mag.style.width = `${lensSize}px`;
      mag.style.height = `${lensSize}px`;

      const effectiveZoom = z / rootScale;
      inner.style.transform = `scale(${effectiveZoom})`;
      inner.style.left = `${-(x + scrollX) * effectiveZoom + half}px`;
      inner.style.top = `${-(y + scrollY) * effectiveZoom + half}px`;

      syncScrollPositions();

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

      syncFixedElement('real-cart-badge', 'magnified-cart-badge');
      syncFixedElement('real-confirmation', 'magnified-confirmation');
      syncFixedElement('real-orders-modal', 'magnified-orders-modal');
    }

    function handleMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let rafId = null;
    function loop() {
      updateMagnifier();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [magnifierEnabled]);

  const visibleItems = useMemo(() => {
    if (!selectedCategory || selectedCategory === "Favorites" || selectedCategory === "Most Ordered") return [];
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
    setCustomizeStep(1);
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
    const effectiveSugar =
      selectedSugar ||
      sugarOptions.find((o) => o.name.includes("100")) ||
      sugarOptions[sugarOptions.length - 1] ||
      null;
    const effectiveIce =
      selectedIce ||
      iceOptions.find((o) => o.name.toLowerCase().includes("regular")) ||
      iceOptions[0] ||
      null;
    const totalPrice =
      currentItem.cost +
      (effectiveSugar?.cost || 0) +
      (effectiveIce?.cost || 0) +
      selectedToppings.reduce((sum, t) => sum + t.cost, 0);
    const modificationIds = [
      effectiveSugar?.id,
      effectiveIce?.id,
      ...selectedToppings.map((t) => t.id),
    ].filter(Boolean);
    const itemPayload = {
      menuItemId: currentItem.id,
      name: currentItem.name,
      price: totalPrice,
      sugarLevel: effectiveSugar?.name || "100%",
      iceLevel: effectiveIce?.name || "100%",
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
      setScreen(SCREEN.MENU);
      return;
    }

    const item = { id: Date.now(), quantity: 1, ...itemPayload };
    setCart((prev) => [...prev, item]);
    clearCustomization();
    setCurrentItem(null);
    setScreen(SCREEN.MENU);
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
        setTrackedOrderId(orderNum);
        setOrderStatus("In Progress");
        setScreen(SCREEN.MENU);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
        setRefreshTrigger((prev) => prev + 1);
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
          <h1>Team 32's Boba Bar</h1>
          <div className="header-controls-row">
          <div className="header-left">
            <button
              className={`menu-board-btn${showMenuBoard ? " active" : ""}`}
              onClick={() => setShowMenuBoard((v) => !v)}
            >
              Menu Board
            </button>
          </div>
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
          </div>{/* end header-controls-row */}
        </div>
      </header>

      <div style={{ display: showMenuBoard ? "block" : "none" }}>
        <MenuBoard />
      </div>
      <div
        className="customer-content-wrapper"
        style={{ display: showMenuBoard ? "none" : undefined }}
      >
        {screen === SCREEN.MENU && (
          <div className="menu-full-layout">
            <div className="menu-left-col">
              {!selectedCategory ? (
                /* ── Kiosk: category picker ── */
                <>
                <div className="kiosk-category-grid">
                  {categories
                    .filter((cat) => !user?.guest || (cat !== "Favorites" && cat !== "Most Ordered"))
                    .map((cat) => {
                      return (
                      <button
                        key={cat}
                        className="kiosk-category-card"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <span className="kiosk-category-name">{cat}</span>
                      </button>
                    );
                  })}
                </div>
                {weatherLoading && !weather ? (
                  <div className="kiosk-weather-strip kiosk-weather-skeleton">
                    <div className="kiosk-weather-current">
                      <div className="skeleton-block skeleton-temp" />
                      <div className="kiosk-weather-current-details">
                        <span className="skeleton-block skeleton-line-short" />
                        <span className="skeleton-block skeleton-line-medium" />
                      </div>
                    </div>
                    <div className="kiosk-weather-week">
                      {[0,1,2,3,4,5,6].map((i) => (
                        <div key={i} className="kiosk-weather-card skeleton-card">
                          <span className="skeleton-block skeleton-line-short" />
                          <span className="skeleton-block skeleton-line-medium" />
                          <span className="skeleton-block skeleton-line-short" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : weather ? (
                  <div className="kiosk-weather-strip kiosk-weather-loaded">
                    <div className="kiosk-weather-current">
                      <div className="kiosk-weather-current-temp">
                        {Math.round(weather.temperature ?? weather.temp ?? 0)}°F
                      </div>
                      <div className="kiosk-weather-current-details">
                        <span className="kiosk-weather-location">📍 College Station</span>
                        <span className="kiosk-weather-desc">{weather.description ?? describeWeatherCode(weather.weather_code)}</span>
                      </div>
                    </div>
                    {weeklyWeather.length > 0 && (
                      <div className="kiosk-weather-week">
                        {weeklyWeather.map((day, i) => (
                          <div key={i} className={`kiosk-weather-card${i === 0 ? ' kiosk-weather-card--today' : ''}`}>
                            <span className="kiosk-weather-card-day">{i === 0 ? 'Today' : formatWeekdayLabel(day.date)}</span>
                            <span className="kiosk-weather-card-desc">{day.description || ''}</span>
                            <span className="kiosk-weather-card-range">
                              <strong>{Math.round(day.maxTemp ?? day.high ?? 0)}°</strong> / {Math.round(day.minTemp ?? day.low ?? 0)}°
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                </>
              ) : (
                /* ── Drink list for selected category ── */
                <>
                  <div className="kiosk-back-row">
                    <button className="kiosk-back-btn" onClick={() => setSelectedCategory(null)}>
                      ← Back
                    </button>
                  </div>
                  <h2 className="kiosk-category-title">{selectedCategory}</h2>
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
                          const favItemId = fav.item_data?.menu_item_id ?? fav.item_data?.id;
                          const menuItem = menuItems.find((m) => m.id === favItemId) || {
                            id: favItemId,
                            name: fav.item_data?.name || "Unknown",
                            cost: Number(fav.item_data?.cost) || 0,
                            category: fav.item_data?.category || "Other",
                          };
                          return (
                            <button key={fav.favorite_id} className="menu-item-card" onClick={() => handleSelectItem(menuItem)}>
                              <div className="item-name">{menuItem.name}</div>
                              <div className="item-price">{currency(menuItem.cost)}</div>
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
                          return (
                            <button key={item.id} className="menu-item-card" onClick={() => handleSelectItem(item)}>
                              <div className="item-name">{item.name}</div>
                              <div className="item-price">{currency(item.cost)}</div>
                              {item.order_count && <div className="item-order-count">ordered {item.order_count}×</div>}
                            </button>
                          );
                        })
                      )
                    ) : (
                      visibleItems.map((item) => {
                        return (
                          <button key={item.id} className="menu-item-card" onClick={() => handleSelectItem(item)}>
                            <div className="item-name">{item.name}</div>
                            <div className="item-price">{currency(item.cost)}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {screen === SCREEN.CUSTOMIZE && currentItem && (
          <div className="customize-fullpage">
            <div className="customize-top-bar">
              <button className="kiosk-back-btn" onClick={handleCancelCustomization}>
                ← Back
              </button>
              <div className="customize-item-summary">
                <span className="customize-item-name">{currentItem.name}</span>
                <span className="customize-item-price">
                  {currency(
                    currentItem.cost +
                    (selectedSugar?.cost || 0) +
                    (selectedIce?.cost || 0) +
                    selectedToppings.reduce((sum, t) => sum + t.cost, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="customize-progress">
              {['Sugar', 'Ice', 'Toppings', 'Review'].map((label, i) => (
                <div
                  key={label}
                  className={`customize-progress-step${customizeStep === i + 1 ? ' active' : ''}${customizeStep > i + 1 ? ' done' : ''}`}
                  onClick={() => setCustomizeStep(i + 1)}
                >
                  <div className="customize-progress-dot">{customizeStep > i + 1 ? '✓' : i + 1}</div>
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
                        className={`customize-option-card${selectedSugar?.id === opt.id ? ' selected' : ''}`}
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
                        className={`customize-option-card${selectedIce?.id === opt.id ? ' selected' : ''}`}
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
                          className={`customize-option-card${isSelected ? ' selected' : ''}`}
                          onClick={() => toggleTopping(opt)}
                        >
                          <span className="customize-option-name">{opt.name}</span>
                          {opt.cost > 0 && <span className="customize-option-cost">+{currency(opt.cost)}</span>}
                          {isSelected && <span className="customize-option-check">✓</span>}
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
                      <span className="customize-review-header-icon">🧋</span>
                      <div className="customize-review-header-text">
                        <h3>{currentItem.name}</h3>
                        <p>Base price: {currency(currentItem.cost)}</p>
                      </div>
                    </div>

                    <div className="customize-review-body">
                      <div className="customize-review-row">
                        <span className="customize-review-label">
                          <span className="customize-review-label-icon">🍯</span> Sugar Level
                        </span>
                        <span className="customize-review-value">
                          {selectedSugar?.name || 'None'}
                          {selectedSugar?.cost > 0 && (
                            <span className="customize-review-value-cost">+{currency(selectedSugar.cost)}</span>
                          )}
                        </span>
                      </div>
                      <div className="customize-review-row">
                        <span className="customize-review-label">
                          <span className="customize-review-label-icon">🧊</span> Ice Level
                        </span>
                        <span className="customize-review-value">
                          {selectedIce?.name || 'None'}
                          {selectedIce?.cost > 0 && (
                            <span className="customize-review-value-cost">+{currency(selectedIce.cost)}</span>
                          )}
                        </span>
                      </div>

                      {selectedToppings.length > 0 && (
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
                      )}
                      {selectedToppings.length === 0 && (
                        <div className="customize-review-row">
                          <span className="customize-review-label">
                            <span className="customize-review-label-icon">🧃</span> Toppings
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
                      {selectedToppings.filter(t => t.cost > 0).map((t) => (
                        <div key={t.id} className="customize-review-breakdown-row">
                          <span>{t.name}</span><span>+{currency(t.cost)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="customize-review-total">
                      <span className="customize-review-total-label">Total</span>
                      <span className="customize-review-total-price">
                        {currency(
                          currentItem.cost +
                          (selectedSugar?.cost || 0) +
                          (selectedIce?.cost || 0) +
                          selectedToppings.reduce((sum, t) => sum + t.cost, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="customize-nav">
              {customizeStep > 1 && (
                <button
                  className="customize-nav-btn customize-nav-back"
                  onClick={() => setCustomizeStep((s) => s - 1)}
                >
                  ← Previous
                </button>
              )}
              <div className="customize-nav-spacer" />
              {customizeStep < 4 ? (
                <button
                  className="customize-nav-btn customize-nav-next"
                  onClick={() => setCustomizeStep((s) => s + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="customize-nav-btn customize-nav-add"
                  onClick={saveCustomizedItem}
                >
                  {editingCartItemId ? 'Save Changes' : 'Add to Order'}
                </button>
              )}
            </div>
          </div>
        )}

        {screen === SCREEN.CART && (
          <div className="customer-content cart-screen">
            <div className="kiosk-back-row">
              <button className="kiosk-back-btn" onClick={() => setScreen(SCREEN.MENU)}>← Back to Menu</button>
            </div>
            <h2>Your Cart</h2>
            {cart.length === 0 ? (
              <div className="cart-empty-state">
                <div className="cart-panel-empty-icon">🛒</div>
                <p className="cart-panel-empty-msg">Your cart is empty</p>
                <p className="cart-panel-empty-sub">Tap any drink to get started</p>
                <button className="btn-secondary" onClick={() => setScreen(SCREEN.MENU)}>Browse Menu</button>
              </div>
            ) : (
              <>
                {!user?.guest && (
                <div className={`rewards-summary rewards-tone-${rewardsTone}`}>
                  <div className="rewards-line"><span>Rewards</span><span className={`rewards-tier-badge rewards-tier-${rewardsTone}`}>{rewardsStatus.tier}{rewardsStatus.discountRate > 0 ? ` (${Math.round(rewardsStatus.discountRate * 100)}% off)` : ''}</span></div>
                  {rewardsStatus.note && <div className="rewards-note rewards-note-employee">{rewardsStatus.note}</div>}
                  {rewardsStatus.tier === 'Employee' ? (
                    <div className="tier-visual-row"><span className="tier-chip tier-chip-employee active">Employee Only</span></div>
                  ) : (
                    <div className="tier-visual-row">
                      <span className={`tier-chip ${['Gold', 'Platinum', 'Diamond'].includes(rewardsStatus.tier) ? 'active' : ''}`}>Gold</span>
                      <span className={`tier-chip ${['Platinum', 'Diamond'].includes(rewardsStatus.tier) ? 'active' : ''}`}>Platinum</span>
                      <span className={`tier-chip ${rewardsStatus.tier === 'Diamond' ? 'active' : ''}`}>Diamond</span>
                    </div>
                  )}
                  <div className="rewards-progress"><div className="rewards-progress-fill" style={{ width: `${tierProgressPercent}%` }} /></div>
                  <div className="rewards-line"><span>Points (12 mo)</span><span>{previousYearPoints}</span></div>
                  <div className="rewards-line"><span>From this order</span><span>+{pointsFromCurrentOrder}</span></div>
                  {rewardsStatus.nextTierAt && <div className="rewards-line"><span>To next tier</span><span>{pointsToNextTier}</span></div>}
                  {!rewardsStatus.nextTierAt && <div className="rewards-line"><span>Progress</span><span>Top tier ✓</span></div>}
                </div>
                )}

                <div className="cart-items-list">
                  {cart.map((item, index) => {
                    const menuRef = menuItems.find((m) => m.id === item.menuItemId) || { id: item.menuItemId, name: item.name, cost: item.price, category: '' };
                    const isFav = !!getFavoriteMatch(menuRef);
                    return (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-header">
                        <span className="cart-item-number">{index + 1}.</span>
                        <span className="cart-item-name">{item.name}</span>
                        {!user?.guest && (
                        <button
                          className={`cart-fav-btn${isFav ? ' cart-fav-btn--active' : ''}`}
                          onClick={(e) => handleToggleFavorite(menuRef, e)}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFav ? '♥ Saved' : '♡ Save'}
                        </button>
                        )}
                        <span className="cart-item-price">{currency(item.price * (item.quantity || 1))}</span>
                        <button className="remove-btn" onClick={() => removeFromCart(item.id)}>×</button>
                      </div>
                      <div className="cart-item-controls">
                        <span className="cart-item-unit-price">Each: {currency(item.price)}</span>
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => updateCartQuantity(item.id, (item.quantity || 1) - 1)} aria-label="Decrease quantity">-</button>
                          <span className="qty-value">{item.quantity || 1}</span>
                          <button className="qty-btn" onClick={() => updateCartQuantity(item.id, (item.quantity || 1) + 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <button className="cart-edit-btn" onClick={() => startEditCartItem(item)}>Edit</button>
                      </div>
                      <div className="cart-item-details">
                        {buildDisplayLines(item).map((line, i) => (<div key={i} className="cart-item-detail">{line}</div>))}
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="cart-totals">
                  <div className="cart-total-line">
                    <span>{rewardsStatus.discountRate > 0 ? 'Subtotal' : 'Total'}</span>
                    <span>{currency(cartTotal)}</span>
                  </div>
                  {rewardsStatus.discountRate > 0 && (
                    <>
                      <div className="cart-total-line"><span>Discount ({Math.round(rewardsStatus.discountRate * 100)}%)</span><span>-{currency(discountAmount)}</span></div>
                      <div className="cart-total-line cart-total-line-final"><span>Discounted Total</span><span>{currency(discountedSubtotal)}</span></div>
                    </>
                  )}
                </div>
                <button className="btn-primary full-width" onClick={() => setScreen(SCREEN.CHECKOUT)}>Proceed to Checkout</button>
              </>
            )}
          </div>
        )}

        {screen === SCREEN.CHECKOUT && (
          <div className="customer-content checkout-screen">
            <div className="kiosk-back-row">
              <button className="kiosk-back-btn" onClick={() => setScreen(SCREEN.MENU)}>
                ← Back to Menu
              </button>
            </div>
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
          </div>
        )}
      </div>

      {screen !== SCREEN.CART && screen !== SCREEN.CHECKOUT && screen !== SCREEN.CUSTOMIZE && (
        <button
          id={isMagnified ? 'magnified-cart-badge' : 'real-cart-badge'}
          className="cart-badge"
          onClick={isMagnified ? undefined : () => setScreen(SCREEN.CART)}
          style={isMagnified ? { position: 'absolute' } : {}}
        >
          🛒{cartCount > 0 && <span className="cart-badge-count">{cartCount}</span>}
        </button>
      )}

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
              ✕
            </button>
            <div className="confirmation-checkmark">
              {orderStatus === "Completed" ? "🎉" : "✓"}
            </div>
            <div className="confirmation-text">
              <h3>
                {orderStatus === "Completed"
                  ? "Order Ready!"
                  : "Order Received!"}
              </h3>
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
                  const status =
                    order.status || (isRecent ? "In Progress" : "Completed");
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
                          className={`order-status-chip order-status-${
                            status === "Completed" ? "done" : "progress"
                          }`}
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
