import { useState, useEffect, useRef } from "react";
import { GOOGLE_TRANSLATE_SCRIPT_ID, LANGUAGE_CODE_ALIASES, TOP_TRANSLATE_LANGUAGES } from "../constants";

const TRANSLATE_CONTAINER_ID = "google_translate_element";
const TOP_LANGUAGE_CODES = TOP_TRANSLATE_LANGUAGES.map((language) => language.code).join(",");
const TOP_LANGUAGE_LABELS = new Map(
  TOP_TRANSLATE_LANGUAGES.map((language) => [language.code.toLowerCase(), language.label]),
);

function normalizeLanguageCode(code) {
  if (!code) return "en";
  const [baseCode, ...rest] = code.split("-");
  const aliasedBaseCode = LANGUAGE_CODE_ALIASES[baseCode] || baseCode;
  return rest.length ? `${aliasedBaseCode}-${rest.join("-")}` : aliasedBaseCode;
}

export function useAccessibility() {
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [textScale, setTextScale] = useState(100);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierZoom, setMagnifierZoom] = useState(2);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(100);

  const accessibilityPanelRef = useRef(null);

  // Apply textScale to html font-size
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = `${textScale}%`;
    return () => { root.style.fontSize = prev; };
  }, [textScale]);

  // Apply fontSize via injected <style> tag so it overrides rem-based values
  useEffect(() => {
    const scale = fontSize / 100;
    const id = "customer-font-size-override";
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement("style");
      tag.id = id;
      document.head.appendChild(tag);
    }
    tag.textContent = `
      /* ── Header ── */
      .customer-page .customer-header h1            { font-size: ${2 * scale}rem !important; }
      .customer-page .accessibility-toggle-btn      { font-size: ${1 * scale}rem !important; }
      .customer-page .exit-btn                      { font-size: ${1.1 * scale}rem !important; }
      .customer-page .menu-board-btn                { font-size: ${1 * scale}rem !important; }
      .customer-page .customer-user-name            { font-size: ${0.9 * scale}rem !important; }
      /* ── Menu / Kiosk ── */
      .customer-page .category-tab                  { font-size: ${1.1 * scale}rem !important; }
      .customer-page .kiosk-category-name           { font-size: ${1.15 * scale}rem !important; }
      .customer-page .kiosk-back-btn                { font-size: ${1 * scale}rem !important; }
      .customer-page .kiosk-category-title          { font-size: ${1.4 * scale}rem !important; }
      .customer-page .item-name                     { font-size: ${1.25 * scale}rem !important; }
      .customer-page .item-price                    { font-size: ${1.5 * scale}rem !important; }
      /* ── Customize steps ── */
      .customer-page .customize-step-title          { font-size: ${1.5 * scale}rem !important; }
      .customer-page .customize-step-subtitle       { font-size: ${0.9 * scale}rem !important; }
      .customer-page .customize-option-name         { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-option-cost         { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-item-name           { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-item-price          { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-progress-label      { font-size: ${0.75 * scale}rem !important; }
      .customer-page .customize-progress-dot        { font-size: ${0.85 * scale}rem !important; }
      .customer-page .customize-nav-btn             { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-review-header h3    { font-size: ${1.15 * scale}rem !important; }
      .customer-page .customize-review-header p     { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-label        { font-size: ${0.9 * scale}rem !important; }
      .customer-page .customize-review-value        { font-size: ${0.95 * scale}rem !important; }
      .customer-page .customize-review-topping-chip { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-total-label  { font-size: ${1 * scale}rem !important; }
      .customer-page .customize-review-total-price  { font-size: ${1.35 * scale}rem !important; }
      .customer-page .customize-review-breakdown-row { font-size: ${0.8 * scale}rem !important; }
      .customer-page .customize-review-section-title { font-size: ${0.75 * scale}rem !important; }
      .customer-page .customize-review-comments label { font-size: ${0.85 * scale}rem !important; }
      .customer-page .comments-input                { font-size: ${0.95 * scale}rem !important; }
      /* ── Cart screen ── */
      .customer-page .cart-screen h2                { font-size: ${1.5 * scale}rem !important; }
      .customer-page .cart-item-name                { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-item-price               { font-size: ${1 * scale}rem !important; }
      .customer-page .cart-item-unit-price          { font-size: ${0.85 * scale}rem !important; }
      .customer-page .cart-item-detail              { font-size: ${0.9 * scale}rem !important; }
      .customer-page .cart-fav-btn                  { font-size: ${0.8 * scale}rem !important; }
      .customer-page .cart-edit-btn                 { font-size: ${0.85 * scale}rem !important; }
      .customer-page .cart-total-line               { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-total-line-final         { font-size: ${1.4 * scale}rem !important; }
      .customer-page .cart-badge                    { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-panel-empty-msg          { font-size: ${1.1 * scale}rem !important; }
      .customer-page .cart-panel-empty-sub          { font-size: ${0.95 * scale}rem !important; }
      /* ── Checkout screen ── */
      .customer-page .checkout-screen h2            { font-size: ${1.5 * scale}rem !important; }
      .customer-page .summary-row                   { font-size: ${1.1 * scale}rem !important; }
      .customer-page .summary-row.total             { font-size: ${1.5 * scale}rem !important; }
      .customer-page .payment-btn                   { font-size: ${1.1 * scale}rem !important; }
      /* ── Rewards ── */
      .customer-page .rewards-summary               { font-size: ${0.9 * scale}rem !important; }
      .customer-page .rewards-line                  { font-size: ${0.9 * scale}rem !important; }
      .customer-page .tier-chip                     { font-size: ${0.75 * scale}rem !important; }
      /* ── Buttons ── */
      .customer-page .btn-primary,
      .customer-page .btn-secondary                 { font-size: ${1.1 * scale}rem !important; }
      /* ── Weather ── */
      .customer-page .kiosk-weather-current-temp    { font-size: ${2 * scale}rem !important; }
      .customer-page .kiosk-weather-card-day        { font-size: ${0.75 * scale}rem !important; }
      .customer-page .kiosk-weather-card-range      { font-size: ${0.85 * scale}rem !important; }
    `;
    return () => { tag.textContent = ""; };
  }, [fontSize]);

  // High contrast mode
  useEffect(() => {
    const root = document.documentElement;
    if (highContrastEnabled) {
      root.style.filter = "grayscale(100%) contrast(250%) brightness(95%)";
    } else {
      root.style.filter = "";
    }
    return () => { root.style.filter = ""; };
  }, [highContrastEnabled]);

  // Google Translate initialization
  useEffect(() => {
    let labelInterval = null;
    const syncDelayMs = 500;

    function syncTranslateDropdownOptions() {
      const select = document.querySelector(
        `#${TRANSLATE_CONTAINER_ID} select.goog-te-combo`,
      );
      if (!select) return;

      const seenCodes = new Set();
      Array.from(select.options).forEach((option) => {
        const normalizedCode = normalizeLanguageCode(option.value).toLowerCase();
        if (!TOP_LANGUAGE_LABELS.has(normalizedCode) || seenCodes.has(normalizedCode)) {
          option.remove();
          return;
        }

        const nativeLabel = TOP_LANGUAGE_LABELS.get(normalizedCode);
        if (option.text !== nativeLabel) {
          option.text = nativeLabel;
        }
        seenCodes.add(normalizedCode);
      });
    }

    function startDropdownSync() {
      syncTranslateDropdownOptions();
      if (labelInterval) return;
      labelInterval = window.setInterval(syncTranslateDropdownOptions, syncDelayMs);
    }

    function initializeGoogleTranslate() {
      if (!window.google?.translate) return;
      const container = document.getElementById(TRANSLATE_CONTAINER_ID);
      if (!container) return;
      if (container.childElementCount > 0) {
        startDropdownSync();
        return;
      }
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
            includedLanguages: TOP_LANGUAGE_CODES,
          },
          TRANSLATE_CONTAINER_ID,
        );
      } catch (error) {
        console.error("Google Translate init error:", error);
      }

      startDropdownSync();
    }

    window.googleTranslateElementInit = initializeGoogleTranslate;
    const existing = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (!existing) {
      const script = document.createElement("script");
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      initializeGoogleTranslate();
    }

    return () => { if (labelInterval) window.clearInterval(labelInterval); };
  }, []);

  return {
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
    fontSize,
    setFontSize,
    accessibilityPanelRef,
    translateContainerId: TRANSLATE_CONTAINER_ID,
  };
}
