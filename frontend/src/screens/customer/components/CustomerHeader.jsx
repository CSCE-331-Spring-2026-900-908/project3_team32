import React from "react";
import { FiChevronDown } from "react-icons/fi";

export default function CustomerHeader({
  user,
  logout,
  navigate,
  showMenuBoard,
  setShowMenuBoard,
  accessibilityOpen,
  setAccessibilityOpen,
  textScale,
  setTextScale,
  fontSize,
  setFontSize,
  magnifierEnabled,
  setMagnifierEnabled,
  magnifierZoom,
  setMagnifierZoom,
  highContrastEnabled,
  setHighContrastEnabled,
  translateContainerId,
  accessibilityPanelRef,
  isMagnified,
}) {
  const textSizePercent = ((textScale - 85) / (140 - 85)) * 100;
  const zoomPercent = ((magnifierZoom - 1.5) / (4 - 1.5)) * 100;

  return (
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
                <FiChevronDown className={`a11y-caret${accessibilityOpen ? " open" : ""}`} />
              </button>

              <div className={`accessibility-panel ${accessibilityOpen ? "open" : ""}`} style={{ padding: "1.5rem" }}>
                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">UI Size</span>
                    <span className="a11y-section-value">{textScale}%</span>
                  </div>
                  <input
                    type="range" min="85" max="140" step="5"
                    value={textScale}
                    onChange={(e) => setTextScale(Number(e.target.value))}
                    className="a11y-slider"
                    style={{ background: `linear-gradient(to right, #8b4513 ${textSizePercent}%, #e5d4b8 ${textSizePercent}%)` }}
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
                  <div className="a11y-section-header" style={{ marginBottom: 0 }}>
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
                        type="range" min="1.5" max="4" step="0.5"
                        value={magnifierZoom}
                        onChange={(e) => setMagnifierZoom(Number(e.target.value))}
                        className="a11y-slider"
                        style={{ background: `linear-gradient(to right, #8b4513 ${zoomPercent}%, #e5d4b8 ${zoomPercent}%)` }}
                      />
                    </div>
                  )}
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header" style={{ marginBottom: 0 }}>
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
                        onClick={() => setFontSize((v) => Math.min(200, v + 10))}
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
                <span className="customer-user-name">{user.name || user.email}</span>
              </div>
            )}
            <button
              className="exit-btn"
              onClick={() => { logout(); navigate("/login/customer"); }}
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
