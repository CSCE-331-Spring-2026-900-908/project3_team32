import { Router } from "express";
import pool from "../config/database.js";

const router = Router();

router.get("/menu/items", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT menu_item_id, name, cost, category FROM menu_item ORDER BY menu_item_id",
    );
    res.json({ menuItems: result.rows });
  } catch (error) {
    next(error);
  }
});

let topItemsCache = null;
let topItemsCacheTime = 0;
const TOP_ITEMS_TTL = 10 * 60 * 1000; // 10 minutes

router.get("/menu/top-items", async (req, res, next) => {
  try {
    const now = Date.now();
    if (topItemsCache && now - topItemsCacheTime < TOP_ITEMS_TTL) {
      return res.json({ topItems: topItemsCache });
    }

    const result = await pool.query(
      `SELECT m.menu_item_id, m.name, m.cost, SUM(oi.quantity) AS total_ordered
       FROM order_item oi
       JOIN menu_item m ON m.menu_item_id = oi.menu_item_id
       GROUP BY m.menu_item_id, m.name, m.cost
       ORDER BY total_ordered DESC
       LIMIT 10`
    );

    topItemsCache = result.rows;
    topItemsCacheTime = now;
    res.json({ topItems: result.rows });
  } catch (error) {
    next(error);
  }
});

function describeOpenMeteoWeatherCode(weatherCode) {
  const codeMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };
  return codeMap[weatherCode] || "Unknown weather";
}

function isBadWeatherCondition(weatherCode) {
  return [66, 67, 75, 77, 82, 85, 86, 95, 96, 99].includes(weatherCode);
}

router.get("/external/weather", async (req, res, next) => {
  const cityInput =
    typeof req.query.city === "string" && req.query.city.trim()
      ? req.query.city.trim()
      : "College Station,US";
  const units =
    typeof req.query.units === "string" && req.query.units.trim()
      ? req.query.units.trim()
      : "imperial";

  const [cityNameRaw, countryRaw] = cityInput
    .split(",")
    .map((part) => part.trim());
  const cityName = cityNameRaw || cityInput;
  const countryCode =
    countryRaw && countryRaw.length === 2 ? countryRaw.toUpperCase() : "";
  const temperatureUnit = units === "metric" ? "celsius" : "fahrenheit";

  try {
    const geocodeParams = new URLSearchParams({
      name: cityName,
      count: "1",
      language: "en",
      format: "json",
    });
    if (countryCode) geocodeParams.set("countryCode", countryCode);

    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${geocodeParams.toString()}`,
    );
    const geocodeData = await geocodeResponse.json().catch(() => ({}));

    if (!geocodeResponse.ok) {
      return res.status(geocodeResponse.status).json({
        error: geocodeData.reason || "Failed to geocode location with Open-Meteo",
      });
    }

    const match = geocodeData.results?.[0];
    if (!match) {
      return res.status(404).json({ error: `Location not found: ${cityInput}` });
    }

    const forecastParams = new URLSearchParams({
      latitude: String(match.latitude),
      longitude: String(match.longitude),
      current: "temperature_2m,apparent_temperature,weather_code",
      temperature_unit: temperatureUnit,
      timezone: "auto",
    });

    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`,
    );
    const forecastData = await forecastResponse.json().catch(() => ({}));

    if (!forecastResponse.ok) {
      return res.status(forecastResponse.status).json({
        error: forecastData.reason || "Failed to fetch weather from Open-Meteo",
      });
    }

    const current = forecastData.current || {};
    const weatherCode = Number(current.weather_code ?? -1);
    const description = describeOpenMeteoWeatherCode(weatherCode);

    return res.json({
      source: "Open-Meteo",
      location: match.name || cityName,
      country: match.country_code || null,
      units,
      temperature: Number(current.temperature_2m),
      feelsLike: Number(current.apparent_temperature),
      description,
      weatherCode,
      icon: null,
      isSevere: isBadWeatherCondition(weatherCode),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;