import React, { useEffect, useState } from "react";
import "./TopTenPage.css";

function TopTenPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTopItems() {
      try {
        const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
        const res = await fetch(`${base}/menu/top-items`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const payload = await res.json();
        setItems(payload.topItems ?? []);
      } catch (err) {
        setError(err.message || "Failed to load top items");
      } finally {
        setLoading(false);
      }
    }
    loadTopItems();
  }, []);

  if (loading) return <div>Loading top 10...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="tt-page">
      <h1 className="tt-title">TOP <span className="tt-title-num">10</span></h1>
      <div className="tt-grid">
        {items.map((item, idx) => (
          <div className="tt-card" key={item.menu_item_id}>
            <div className="tt-img-wrap">
              <img
                src={`/images/drinks/${item.menu_item_id}.png`}
                alt={item.name}
                className="tt-cup"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="tt-cup-fallback">🧋</div>
            </div>
            <div className="tt-rank">#{idx + 1}</div>
            <div className="tt-name">{item.name}</div>
            <div className="tt-price">${Number(item.cost).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopTenPage;