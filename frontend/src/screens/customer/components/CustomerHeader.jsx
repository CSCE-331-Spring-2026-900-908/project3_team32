import React from "react";
import { FiChevronDown } from "react-icons/fi";
import { LiaUniversalAccessSolid } from "react-icons/lia";

export default function CustomerHeader({
  user,
  logout,
  navigate,
  accessibilityOpen,
  setAccessibilityOpen,
  textScale,
  setTextScale,
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
                <LiaUniversalAccessSolid className="a11y-icon" size={32}/> 
                <span>Accessibility</span>
                <FiChevronDown className={`a11y-caret ${accessibilityOpen ? "open" : ""}`} />
              </button>

              <div className={`accessibility-panel ${accessibilityOpen ? "open" : ""}`} style={{ padding: "1.5rem" }}>
                <section className="a11y-section">
                <div className="a11y-section-header">
                  <span className="a11y-section-title">UI Size</span>
                  <span className="a11y-section-value notranslate" translate="no">{textScale}%</span>
                </div>
                  <input
                    type="range" min="85" max="140" step="5"
                    value={textScale}
                    onChange={(e) => setTextScale(Number(e.target.value))}
                    className="a11y-slider"
                    style={{ background: `linear-gradient(to right, #8b4513 ${textSizePercent}%, #e5d4b8 ${textSizePercent}%)`, '--value': `${textSizePercent}%`}}
                  />
                </section>

                <div className="a11y-divider" />

                <section className="a11y-section">
                  <div className="a11y-section-header">
                    <span className="a11y-section-title">Language</span>
                  </div>
                  <div
                    id={isMagnified ? undefined : translateContainerId}
                    className="google-translate-widget notranslate"
                    translate="no"
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
                        Zoom &nbsp;<strong className="notranslate" translate="no">{magnifierZoom}x</strong>
                      </label>
                      <input
                        type="range" min="1.5" max="4" step="0.5"
                        value={magnifierZoom}
                        onChange={(e) => setMagnifierZoom(Number(e.target.value))}
                        className="a11y-slider"
                        style={{ background: `linear-gradient(to right, #8b4513 ${zoomPercent}%, #e5d4b8 ${zoomPercent}%)`, '--value': `${zoomPercent}%` }}
                      />
                    </div>
                  )}
                </section>
              </div>
            </div>
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

