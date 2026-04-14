import { useState, useEffect } from "react";
import { API_BASE } from "../constants";
import { describeWeatherCode } from "../utils";

const CATEGORY_ORDER = ["Milk Tea", "Fruit Tea", "Fresh Brew", "Matcha", "Ice Blended", "Specialty"];

export function useCustomerData({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(["Favorites", "Most Ordered"]);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [mostOrderedItems, setMostOrderedItems] = useState([]);
  const [savedFavorites, setSavedFavorites] = useState([]);
  const [isEmployeeRewardsUser, setIsEmployeeRewardsUser] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [weather, setWeather] = useState(() => {
    try { const c = sessionStorage.getItem("weather_cache"); return c ? JSON.parse(c).weather : null; } catch { return null; }
  });
  const [weeklyWeather, setWeeklyWeather] = useState(() => {
    try { const c = sessionStorage.getItem("weather_cache"); return c ? JSON.parse(c).weekly || [] : []; } catch { return []; }
  });
  const [weatherLoading, setWeatherLoading] = useState(() => {
    try { return !sessionStorage.getItem("weather_cache"); } catch { return true; }
  });

  // Load menu items + modification options
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const menuRes = await fetch(`${API_BASE}/menu/items`);
        const menuData = await menuRes.json();
        const items = menuData.menuItems || menuData.items || [];
        setMenuItems(items.map((item) => ({
          id: item.menu_item_id,
          name: item.name,
          cost: Number(item.cost),
          category: item.category || "Other",
        })));
        const rawCategories = [...new Set(items.map((item) => item.category || "Other"))];
        const sortedCategories = [
          ...CATEGORY_ORDER.filter((c) => rawCategories.includes(c)),
          ...rawCategories.filter((c) => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories(["Favorites", "Most Ordered", ...sortedCategories]);

        const modRes = await fetch(`${API_BASE}/cashier/modifications`);
        const modData = await modRes.json();
        setSugarOptions((modData.sugar || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setIceOptions((modData.ice || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setToppingOptions((modData.toppings || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load customer order history
  useEffect(() => {
    if (!token || user?.type !== "customer") { setCustomerOrders([]); return; }
    let cancelled = false;
    async function loadCustomerOrders() {
      try {
        const response = await fetch(`${API_BASE}/customer/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load customer orders");
        const data = await response.json();
        if (!cancelled) setCustomerOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (error) {
        console.error("Failed to load customer orders:", error);
        if (!cancelled) setCustomerOrders([]);
      }
    }
    loadCustomerOrders();
    return () => { cancelled = true; };
  }, [token, user?.type, refreshTrigger]);

  // Check if the signed-in customer is also an employee (for discount)
  useEffect(() => {
    const email = (user?.email || "").trim().toLowerCase();
    if (!email) { setIsEmployeeRewardsUser(false); return; }
    let cancelled = false;
    async function loadEmployeeMatch() {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await fetch(`${API_BASE}/employees`, { headers });
        if (!response.ok) throw new Error("Failed to load employees");
        const data = await response.json();
        const employees = Array.isArray(data.employees) ? data.employees : [];
        const isMatch = employees.some((emp) => {
          const employeeEmail = (emp.google_email || "").trim().toLowerCase();
          const position = String(emp.position || "");
          return employeeEmail === email && ["Cashier", "Manager", "Shift Lead"].includes(position);
        });
        if (!cancelled) setIsEmployeeRewardsUser(isMatch);
      } catch (error) {
        console.error("Failed to load employee match:", error);
        if (!cancelled) setIsEmployeeRewardsUser(false);
      }
    }
    loadEmployeeMatch();
    return () => { cancelled = true; };
  }, [token, user?.email]);

  // Weather (College Station, refreshes every 10 min)
  useEffect(() => {
    let cancelled = false;
    let timerId = null;
    async function loadWeather() {
      try {
        setWeatherLoading(true);
        const res = await fetch(`${API_BASE}/external/weather?city=College%20Station,US`);
        if (!res.ok) throw new Error("weather fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setWeather(data);
        let weekly = Array.isArray(data.dailyForecast) ? data.dailyForecast.slice(0, 7) : [];
        if (!weekly.length) {
          try {
            const wr = await fetch(
              "https://api.open-meteo.com/v1/forecast?latitude=30.6280&longitude=-96.3344&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7"
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
          } catch { /* ignore */ }
        }
        if (!cancelled) {
          setWeeklyWeather(weekly);
          try { sessionStorage.setItem("weather_cache", JSON.stringify({ weather: data, weekly })); } catch {}
        }
      } catch {
        if (!cancelled) { setWeather(null); setWeeklyWeather([]); }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }
    loadWeather();
    timerId = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timerId); };
  }, []);

  // Most ordered items (global — top items across all orders)
  useEffect(() => {
    fetch(`${API_BASE}/cashier/most-ordered`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMostOrderedItems(data.map((item) => ({ ...item, id: item.menu_item_id, cost: Number(item.cost) })));
        }
      })
      .catch(console.error);
  }, []);

  // Saved favorites (DB-backed, per signed-in customer)
  useEffect(() => {
    if (!user || !token || user.type !== "customer" || user.guest) { setSavedFavorites([]); return; }
    fetch(`${API_BASE}/customer/saved-favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (!data.error && Array.isArray(data)) setSavedFavorites(data); })
      .catch(console.error);
  }, [user, token, refreshTrigger]);

  return {
    loading,
    menuItems,
    categories,
    sugarOptions,
    iceOptions,
    toppingOptions,
    customerOrders,
    setCustomerOrders,
    mostOrderedItems,
    savedFavorites,
    setSavedFavorites,
    isEmployeeRewardsUser,
    weather,
    weeklyWeather,
    weatherLoading,
    triggerRefresh: () => setRefreshTrigger((v) => v + 1),
  };
}
