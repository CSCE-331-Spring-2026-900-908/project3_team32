import React from "react";
import { FiMapPin, FiArrowLeft, FiHeart, FiBarChart2 } from "react-icons/fi";
import { currency, describeWeatherCode, formatWeekdayLabel } from "../utils";

export default function MenuScreen({
  categories,
  selectedCategory,
  setSelectedCategory,
  user,
  savedFavorites,
  mostOrderedItems,
  menuItems,
  visibleItems,
  handleSelectItem,
  addFavoriteToCart,
  weather,
  weeklyWeather,
  weatherLoading,
}) {
  return (
    <div className="menu-full-layout">
      <div className="menu-left-col">
        {!selectedCategory ? (
          /* ── Kiosk: category picker ── */
          <>
            <div className="kiosk-category-grid">
              {categories
                .filter((cat) => !user?.guest || cat !== "Favorites")
                .map((cat) => (
                  <button key={cat} className="kiosk-category-card" onClick={() => setSelectedCategory(cat)}>
                    <span className="kiosk-category-name">{cat}</span>
                  </button>
                ))}
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
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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
                    <span className="kiosk-weather-location"><FiMapPin /> College Station</span>
                    <span className="kiosk-weather-desc">
                      {weather.description ?? describeWeatherCode(weather.weather_code)}
                    </span>
                  </div>
                </div>
                {weeklyWeather.length > 0 && (
                  <div className="kiosk-weather-week">
                    {weeklyWeather.map((day, i) => (
                      <div key={i} className={`kiosk-weather-card${i === 0 ? " kiosk-weather-card--today" : ""}`}>
                        <span className="kiosk-weather-card-day">{i === 0 ? "Today" : formatWeekdayLabel(day.date)}</span>
                        <span className="kiosk-weather-card-desc">{day.description || ""}</span>
                        <span className="kiosk-weather-card-range">
                          <strong>{Math.round(day.maxTemp ?? day.high ?? 0)}°</strong>
                          {" / "}
                          {Math.round(day.minTemp ?? day.low ?? 0)}°
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
              <button className="kiosk-back-btn" onClick={() => setSelectedCategory(null)}><FiArrowLeft /> Back</button>
            </div>
            <h2 className="kiosk-category-title">{selectedCategory}</h2>
            <div className="menu-grid">
              {selectedCategory === "Favorites" ? (
                savedFavorites.length === 0 ? (
                  <div className="menu-empty-state">
                    <div className="menu-empty-icon"><FiHeart /></div>
                    <p>
                      {user?.guest
                        ? "Sign in to save favorites!"
                        : "No favorites yet — tap the heart on any drink to save it."}
                    </p>
                  </div>
                ) : (
                  savedFavorites.map((fav) => {
                    const d = fav.item_data || {};
                    const favItemId = d.menu_item_id ?? d.id;
                    const menuItem = menuItems.find((m) => m.id === favItemId) || {
                      id: favItemId,
                      name: d.name || "Unknown",
                      cost: Number(d.cost) || 0,
                      category: d.category || "Other",
                    };
                    const hasCust = d.sugarLevel || d.iceLevel || (d.toppingNames && d.toppingNames.length > 0);
                    const displayPrice = d.price != null ? Number(d.price) : menuItem.cost;
                    return (
                      <button
                        key={fav.favorite_id}
                        className="menu-item-card"
                        onClick={() => {
                          if (hasCust) {
                            addFavoriteToCart({
                              id: Date.now(),
                              quantity: 1,
                              menuItemId: menuItem.id,
                              name: menuItem.name,
                              price: displayPrice,
                              sugarLevel: d.sugarLevel || "100%",
                              iceLevel: d.iceLevel || "Regular",
                              toppingNames: d.toppingNames || [],
                              comments: d.comments || "",
                              modificationIds: d.modificationIds || [],
                            });
                          } else {
                            handleSelectItem(menuItem);
                          }
                        }}
                      >
                        <div className="item-name">{menuItem.name}</div>
                        {hasCust && (
                          <div className="fav-customizations">
                            {d.sugarLevel && <span className="fav-tag">{d.sugarLevel}</span>}
                            {d.iceLevel && <span className="fav-tag">{d.iceLevel}</span>}
                            {(d.toppingNames || []).map((t, i) => (
                              <span key={i} className="fav-tag">{t}</span>
                            ))}
                          </div>
                        )}
                        <div className="item-price">{currency(displayPrice)}</div>
                      </button>
                    );
                  })
                )
              ) : selectedCategory === "Most Ordered" ? (
                mostOrderedItems.length === 0 ? (
                  <div className="menu-empty-state">
                    <div className="menu-empty-icon"><FiBarChart2 /></div>
                    <p>No order data yet.</p>
                  </div>
                ) : (
                  mostOrderedItems.map((item) => (
                    <button key={item.id} className="menu-item-card" onClick={() => handleSelectItem(item)}>
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">{currency(item.cost)}</div>
                      {item.order_count && <div className="item-order-count">ordered {item.order_count}×</div>}
                    </button>
                  ))
                )
              ) : (
                visibleItems.map((item) => (
                  <button key={item.id} className="menu-item-card" onClick={() => handleSelectItem(item)}>
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{currency(item.cost)}</div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
