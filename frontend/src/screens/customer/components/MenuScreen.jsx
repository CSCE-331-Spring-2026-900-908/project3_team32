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
  customerMostOrderedItems,
  menuItems,
  visibleItems,
  handleSelectItem,
  addFavoriteToCart,
  handleToggleFavorite,
  weather,
  weeklyWeather,
  weatherLoading,
}) {
  const isGuest = !!user?.guest;
  const popularTabName = isGuest ? "Featured" : "Most Ordered";
  const mostOrderedData = isGuest
    ? mostOrderedItems || []
    : customerMostOrderedItems?.length
      ? customerMostOrderedItems
      : mostOrderedItems || [];
  const displayCategories = categories.map((cat) =>
    cat === "Most Ordered" ? popularTabName : cat,
  );
  return (
    <div className="menu-full-layout">
      <div className="menu-left-col">
        {!selectedCategory ? (
          /* ── Kiosk: category picker ── */
          <>
            <div className="kiosk-category-grid">
              {displayCategories
                .filter((cat) => !user?.guest || cat !== "Favorites")
                .map((cat) => (
                  <button
                    key={cat}
                    className="kiosk-category-card"
                    onClick={() => {
                      const internalKey =
                        cat === popularTabName ? "Most Ordered" : cat;
                      setSelectedCategory(internalKey);
                    }}
                  >
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
                    <span className="kiosk-weather-location">
                      <FiMapPin /> College Station
                    </span>
                    <span className="kiosk-weather-desc">
                      {weather.description ??
                        describeWeatherCode(weather.weather_code)}
                    </span>
                  </div>
                </div>
                {weeklyWeather.length > 0 && (
                  <div className="kiosk-weather-week">
                    {weeklyWeather.map((day, i) => (
                      <div
                        key={i}
                        className={`kiosk-weather-card${i === 0 ? " kiosk-weather-card--today" : ""}`}
                      >
                        <span className="kiosk-weather-card-day">
                          {i === 0 ? "Today" : formatWeekdayLabel(day.date)}
                        </span>
                        <span className="kiosk-weather-card-desc">
                          {day.description || ""}
                        </span>
                        <span className="kiosk-weather-card-range">
                          <strong>
                            {Math.round(day.maxTemp ?? day.high ?? 0)}°
                          </strong>
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
              <button
                className="kiosk-back-btn"
                onClick={() => setSelectedCategory(null)}
              >
                <FiArrowLeft /> Back
              </button>
            </div>
            <h2 className="kiosk-category-title">
              {selectedCategory === "Most Ordered"
                ? popularTabName
                : selectedCategory}
            </h2>
            <div className="menu-grid">
              {selectedCategory === "Favorites" ? (
                savedFavorites.length === 0 ? (
                  <div className="menu-empty-state">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      height="64"
                      width="64"
                      style={{ color: "#c9a87c", opacity: 0.4 }}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
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
                    const menuItem = menuItems.find(
                      (m) => m.id === favItemId,
                    ) || {
                      id: favItemId,
                      name: d.name || "Unknown",
                      cost: Number(d.cost) || 0,
                      category: d.category || "Other",
                    };
                    const hasCust =
                      d.sizeName ||
                      d.sugarLevel ||
                      d.iceLevel ||
                      (d.toppingNames && d.toppingNames.length > 0);
                    const displayPrice =
                      d.price != null ? Number(d.price) : menuItem.cost;
                    return (
                      <div
                        key={fav.favorite_id}
                        className="menu-item-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          textAlign: "left",
                          padding: "15px",
                          cursor: "default",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "10px",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1.1rem",
                              paddingRight: "10px",
                            }}
                          >
                            {menuItem.name}
                          </h3>
                          <button
                            onClick={() => handleToggleFavorite(menuItem)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Remove from Favorites"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="#ff4b4b"
                              height="28"
                              width="28"
                            >
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                        </div>

                        {hasCust && (
                          <div
                            className="fav-customizations"
                            style={{ marginBottom: "15px" }}
                          >
                            {d.sizeName && (
                              <span className="fav-tag">{d.sizeName}</span>
                            )}
                            {d.sugarLevel && (
                              <span className="fav-tag">{d.sugarLevel}</span>
                            )}
                            {d.iceLevel && (
                              <span className="fav-tag">{d.iceLevel}</span>
                            )}
                            {(d.toppingNames || []).map((t, i) => (
                              <span key={i} className="fav-tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong style={{ fontSize: "1.1rem" }}>
                            {currency(displayPrice)}
                          </strong>

                          <button
                            onClick={() => {
                              if (hasCust) {
                                addFavoriteToCart({
                                  id: Date.now(),
                                  quantity: 1,
                                  menuItemId: menuItem.id,
                                  name: menuItem.name,
                                  price: displayPrice,
                                  sizeName: d.sizeName || "Regular",
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
                            style={{
                              backgroundColor: "#8b4513",
                              color: "white",
                              border: "none",
                              padding: "6px 14px",
                              fontSize: "0.85rem",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              margin: 0,
                              flex: "none",
                            }}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : selectedCategory === "Most Ordered" ? (
                mostOrderedData.length === 0 ? (
                  <div className="menu-empty-state">
                    <div className="menu-empty-icon">
                      <FiBarChart2 />
                    </div>
                    <p>No order data yet.</p>
                  </div>
                ) : (
                  mostOrderedData.map((item) => (
                    <button
                      key={item.id}
                      className="menu-item-card"
                      onClick={() => handleSelectItem(item)}
                    >
                      <img
                        src={`/images/drinks/${item.id}.png`}
                        alt={item.name}
                        className="menu-item-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div className="menu-item-img-placeholder">🧋</div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">{currency(item.cost)}</div>
                    </button>
                  ))
                )
              ) : (
                visibleItems.map((item) => (
                  <button
                    key={item.id}
                    className="menu-item-card"
                    onClick={() => handleSelectItem(item)}
                  >
                    <img
                      src={`/images/drinks/${item.id}.png`}
                      alt={item.name}
                      className="menu-item-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="menu-item-img-placeholder">🧋</div>
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
