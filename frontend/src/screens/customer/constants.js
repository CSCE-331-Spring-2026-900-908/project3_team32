export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
export const TAX_RATE = 0.0825;
export const GOLD_POINTS_THRESHOLD = 1000;
export const PLATINUM_POINTS_THRESHOLD = GOLD_POINTS_THRESHOLD + 2500;
export const DIAMOND_POINTS_THRESHOLD = PLATINUM_POINTS_THRESHOLD + 5000;
export const REWARDS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
export const LANGUAGE_CODE_ALIASES = { iw: "he", jw: "jv" };
export const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export const SCREEN = {
  MENU: "MENU",
  CUSTOMIZE: "CUSTOMIZE",
  CART: "CART",
  CHECKOUT: "CHECKOUT",
};
