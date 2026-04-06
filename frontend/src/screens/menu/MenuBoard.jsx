import "./MenuBoard.css";
import React, { useEffect, useState } from "react";
import { apiRequest, unwrapList } from "../employee/manager/managerApi.js";

function Section({ title, items }) {
  return (
    <div className="section">
      <h2 className="section-title">{title}</h2>
      <div className="section-line" />
      <div className="item-list">
        {items.map((item) => (
          <div className="menu-item" key={item.menu_item_id}>
            <span className="item-number">{item.menu_item_id}</span>
            <div className="item-details">
              <span className="item-name">{item.name}</span>
              <span className="item-price">${Number(item.cost).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMenuItems() {
    try {
      setLoading(true);
      setError("");

      const payload = await apiRequest("/menu/items");
      const rows = unwrapList(payload, "menuItems").map((row) => ({
        menu_item_id: row.menu_item_id ?? row.menuItemId ?? row.id,
        name: row.name,
        cost: Number(row.cost ?? row.price ?? 0),
        category: row.category || "Uncategorized",
      }));

      setItems(rows);
    } catch (err) {
      setError(err.message || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenuItems();
  }, []);

  const milkTeaItems = items.filter((item) => item.category === "Milk Tea");
  const fruitTeaItems = items.filter((item) => item.category === "Fruit Tea");
  const smoothieItems = items.filter((item) => item.category === "Smoothies");
  const latteItems = items.filter((item) => item.category === "Lattes");
  const specialtyItems = items.filter((item) => item.category === "Specialty");
  const seasonalItems = items.filter((item) => item.category === "Seasonal");

  if (loading) {
    return <div className="menu-board">Loading menu...</div>;
  }

  if (error) {
    return <div className="menu-board">Error: {error}</div>;
  }

  return (
    <div className="menu-board">
      <div className="top-bar">
        <div className="top-left">
          <span>Hot Available</span>
          <span>Non-Caffeinated</span>
          <span>Alternative Milk Available</span>
        </div>
        <div className="top-right">
          <h3>FOOD ALLERGY NOTICE</h3>
          <p>
            We cannot guarantee that any of our products are free from allergens.
            Additional nutrition information available upon request.
          </p>
        </div>
      </div>

      <div className="menu-columns">
        <div className="menu-column">
          <Section title="MILK TEA" items={milkTeaItems} />
          <Section title="LATTES" items={latteItems} />
        </div>

        <div className="menu-column">
          <Section title="FRUIT TEA" items={fruitTeaItems} />
          <Section title="SMOOTHIES" items={smoothieItems} />
        </div>

        <div className="menu-column">
          <Section title="SPECIALTY" items={specialtyItems} />
          <Section title="SEASONAL" items={seasonalItems} />
        </div>
      </div>

      <div className="bottom-bar">
        <div className="bottom-group">
          <h4>ICE LEVEL</h4>
          <p>Regular • Less • No Ice</p>
        </div>

        <div className="bottom-group">
          <h4>SWEETNESS LEVEL</h4>
          <p>Normal 100% • Less 80% • Half 50% • Light 30% • No Sugar 0%</p>
        </div>

        <div className="bottom-group">
          <h4>TOPPING</h4>
          <p>
            Pearls (Boba) • Coffee Jelly • Pudding • Lychee Jelly • Honey Jelly •
            Crystal Boba • Mango Popping Boba • Strawberry Popping Boba • Ice Cream • Crema
          </p>
        </div>
      </div>
    </div>
  );
}

export default MenuBoard;