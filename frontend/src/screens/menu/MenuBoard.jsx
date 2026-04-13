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

const NUM_COLUMNS = 3;

function distributeIntoColumns(sections, numColumns) {
  const chunkSize = Math.ceil(sections.length / numColumns);
  const columns = [];
  for (let i = 0; i < numColumns; i++) {
    columns.push(sections.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  return columns;
}

function MenuBoard() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMenuItems() {
    try {
      setLoading(true);
      setError("");

      const payload = await apiRequest("/menu/items");
      const rows = unwrapList(payload, "menuItems").map((row) => {
        const category = row.category;
        if (!category) {
          throw new Error(
            `Menu item "${row.name ?? row.id}" is missing a category.`
          );
        }
        return {
          menu_item_id: row.menu_item_id ?? row.menuItemId ?? row.id,
          name: row.name,
          cost: Number(row.cost ?? row.price ?? 0),
          category,
        };
      });

      rows.sort((a, b) => a.menu_item_id - b.menu_item_id);


      // Group items by category, preserving insertion order
      const categoryMap = new Map();
      for (const item of rows) {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, []);
        }
        categoryMap.get(item.category).push(item);
      }

      const derived = Array.from(categoryMap.entries()).map(([title, items]) => ({
        title: title.toUpperCase(),
        items,
      }));

      setSections(derived);
    } catch (err) {
      setError(err.message || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenuItems();
  }, []);

  if (loading) {
    return <div className="menu-board">Loading menu...</div>;
  }

  if (error) {
    return <div className="menu-board">Error: {error}</div>;
  }

  const columns = distributeIntoColumns(sections, NUM_COLUMNS);

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
        {columns.map((columnSections, colIdx) => (
          <div className="menu-column" key={colIdx}>
            {columnSections.map((section) => (
              <Section key={section.title} title={section.title} items={section.items} />
            ))}
          </div>
        ))}
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