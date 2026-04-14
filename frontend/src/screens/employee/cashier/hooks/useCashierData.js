import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

const CATEGORY_ORDER = ["Milk Tea", "Fruit Tea", "Fresh Brew", "Matcha", "Ice Blended", "Specialty"];

export function useCashierData({ token }) {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sugarOptions, setSugarOptions] = useState([]);
  const [iceOptions, setIceOptions] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState(new Set());

  // Load menu items + modifications on mount
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
        const rawCategories = [...new Set(items.map((item) => item.category || "Other"))];
        const sortedCategories = [
          ...CATEGORY_ORDER.filter((c) => rawCategories.includes(c)),
          ...rawCategories.filter((c) => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories(sortedCategories);

        const modRes = await fetch(`${API_BASE}/cashier/modifications`);
        const modData = await modRes.json();
        setSugarOptions((modData.sugar || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setIceOptions((modData.ice || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setToppingOptions((modData.toppings || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setSizeOptions((modData.sizes || []).map((m) => ({ id: m.modification_type_id, name: m.name, cost: Number(m.cost) })));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Poll today's orders every 5 seconds
  useEffect(() => {
    async function loadTodayOrders() {
      try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/cashier/orders/today`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const orders = data.orders || data || [];
        setTodayOrders(
          orders.map((order) => ({
            id: order.order_id,
            status: order.status,
            items: (order.items || []).map(
              (i) => i.name || i.menu_item_name || `Item ${i.menu_item_id}`,
            ),
          })),
        );
        setCompletedOrders(
          new Set(orders.filter((o) => o.status === "Completed").map((o) => o.order_id)),
        );
      } catch {
        // silently fail — dropdown will just be empty until an order is placed
      }
    }
    loadTodayOrders();
    const interval = setInterval(loadTodayOrders, 5000);
    return () => clearInterval(interval);
  }, [token]);

  return {
    loading,
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
  };
}
