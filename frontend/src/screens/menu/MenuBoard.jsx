import "./MenuBoard.css";
import React, { useEffect, useState } from "react";
import { apiRequest, unwrapList } from "../employee/manager/managerApi.js";

function Section({ title, items }) {
  return (
    <div className="mb-section">
      <h2 className="mb-section-title">{title}</h2>
      <div className="mb-section-line" />
      <div className="mb-item-list">
        {items.map((item) => (
          <div className="mb-item" key={item.menu_item_id}>
            <span className="mb-item-number">{item.menu_item_id}</span>
            <div className="mb-item-details">
              <span className="mb-item-name">{item.name}</span>
              <span className="mb-item-dots" />
              <span className="mb-item-price">
                ${Number(item.cost).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const COLUMN_LAYOUT = [
  ["Milky Series", "Fresh Brew"],
  ["Fruity Beverage", "Non-Caffeinated"],
  ["New Matcha Series", "Ice-Blended"],
];

const TOTAL_PAGES = 3;

function MenuBoard() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  async function loadMenuItems() {
    try {
      setLoading(true);
      setError("");

      const payload = await apiRequest("/menu/items");
      const rows = unwrapList(payload, "menuItems").map((row) => {
        const category = row.category;
        if (!category) {
          throw new Error(
            `Menu item "${row.name ?? row.id}" is missing a category.`,
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

      const categoryMap = new Map();
      for (const item of rows) {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, []);
        }
        categoryMap.get(item.category).push(item);
      }

      const derived = Array.from(categoryMap.entries()).map(
        ([title, items]) => ({
          title: title.toUpperCase(),
          items,
        }),
      );

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
    return <div className="mb-board">Loading menu...</div>;
  }

  if (error) {
    return <div className="mb-board">Error: {error}</div>;
  }

  return (
    <div className="mb-board">
      <div className="mb-carousel">
        <button
          className="mb-arrow mb-arrow-left"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ‹
        </button>

        <div className="mb-track-wrapper">
          <div
            className="mb-track"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {/* Page 0 — menu */}
            <div className="mb-slide">
              <div className="mb-columns">
                {COLUMN_LAYOUT.map((categoryNames, colIdx) => (
                  <div className="mb-column" key={colIdx}>
                    {categoryNames.map((categoryName) => {
                      const section = sections.find(
                        (s) => s.title === categoryName.toUpperCase()
                      );
                      return (
                        <Section
                          key={categoryName}
                          title={categoryName.toUpperCase()}
                          items={section ? section.items : []}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Page 1 — WIP */}
            <div className="mb-slide">
              <div className="mb-wip">
                <div className="mb-wip-icon">🚧</div>
                <h2>Coming Soon</h2>
                <p>This page is a work in progress.</p>
              </div>
            </div>

            {/* Page 2 — WIP */}
            <div className="mb-slide">
              <div className="mb-wip">
                <div className="mb-wip-icon">🚧</div>
                <h2>Coming Soon</h2>
                <p>This page is a work in progress.</p>
              </div>
            </div>
          </div>
        </div>

        <button
          className="mb-arrow mb-arrow-right"
          onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))}
          disabled={currentPage === TOTAL_PAGES - 1}
        >
          ›
        </button>
      </div>

      {/* Page dots */}
      <div className="mb-dots">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <button
            key={i}
            className={`mb-dot${currentPage === i ? " active" : ""}`}
            onClick={() => setCurrentPage(i)}
          />
        ))}
      </div>

      <div className="mb-bottom-bar">
        <div className="mb-bottom-group">
          <h4>ICE LEVEL</h4>
          <p>No Ice • Less Ice • Regular • Extra Ice</p>
        </div>

        <div className="mb-bottom-group">
          <h4>SUGAR LEVEL</h4>
          <p>0% • 25% • 50% • 75% • 100% • 125%</p>
        </div>

        <div className="mb-bottom-group">
          <h4>TOPPING</h4>
          <p>
            Tapioca Pearls • Crystal Boba • Popping Boba (Strawberry) • Popping
            Boba (Mango) • Honey Jelly • Lychee Jelly • Coffee Jelly • Pudding •
            Ice Cream • Creama
          </p>
        </div>
      </div>
    </div>
  );
}

export default MenuBoard;