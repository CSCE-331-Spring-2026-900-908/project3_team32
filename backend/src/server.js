import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pool from "./config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function normalizeEmployeePin(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized;
}

function isValidEmployeePin(pin) {
  return /^\d{4}$/.test(pin);
}

async function ensureEmployeeAuthSchema() {
  await pool.query(
    "ALTER TABLE employee ADD COLUMN IF NOT EXISTS google_email VARCHAR(255)",
  );
  await pool.query(
    "ALTER TABLE employee ADD COLUMN IF NOT EXISTS employee_pin VARCHAR(4)",
  );
  await pool.query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'employee_pin_format_chk'
       ) THEN
         ALTER TABLE employee
           ADD CONSTRAINT employee_pin_format_chk
           CHECK (employee_pin IS NULL OR employee_pin ~ '^[0-9]{4}$');
       END IF;
     END $$;`,
  );
}

await ensureEmployeeAuthSchema().catch((error) => {
  console.error("Failed to ensure employee auth schema:", error.message);
});

// ── JWT helpers ────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
}

/**
 * requireAuth(roles?)
 * Pass an array of allowed position strings, e.g. ['Manager', 'Shift Lead'].
 * Omit roles to allow any authenticated user.
 */
function requireAuth(roles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      req.user = decoded;
      if (roles && roles.length > 0 && !roles.includes(decoded.position)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://team32-project3.vercel.app",
  "https://team32-project3-abhivurs-projects.vercel.app",
];
app.use(
  cors({
    origin(origin, cb) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith("-abhivurs-projects.vercel.app")
      ) {
        cb(null, true);
      } else {
        cb(null, true); // allow all for now; tighten later if needed
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// API Routes (to be implemented)
app.get("/api", (req, res) => {
  res.json({ message: "Sharetea POS API" });
});

// ── Dev-only bypass (never enabled in production) ─────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.post("/api/auth/dev/login", async (req, res) => {
    const { role } = req.body;
    if (role === "customer") {
      const result = await pool.query(
        `INSERT INTO customer (google_id, email, name, picture)
         VALUES ('dev-customer-001', 'dev@example.com', 'Dev Customer', NULL)
         ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING customer_id, email, name`,
      );
      const customer = result.rows[0];
      const token = signToken({
        type: "customer",
        customer_id: customer.customer_id,
        email: customer.email,
        name: customer.name,
      });
      return res.json({ token, user: customer });
    }
    // Default to first Manager employee for employee dev bypass
    const result = await pool.query(
      `SELECT employee_id, name, position FROM employee WHERE position = 'Manager' LIMIT 1`,
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "No manager employee found in DB" });
    const emp = result.rows[0];
    const token = signToken({
      type: "employee",
      employee_id: emp.employee_id,
      name: emp.name,
      position: emp.position,
    });
    return res.json({ token, user: emp });
  });
}

// ── Auth routes ────────────────────────────────────────────────────────────────

async function verifyGoogleToken(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

// Customer Google login — creates account on first sign-in
app.post("/api/auth/google/customer", async (req, res, next) => {
  const { credential } = req.body;
  if (!credential)
    return res.status(400).json({ error: "credential is required" });

  try {
    const payload = await verifyGoogleToken(credential);
    const { sub: googleId, email, name, picture } = payload;

    const result = await pool.query(
      `INSERT INTO customer (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE
         SET email = EXCLUDED.email,
             name  = EXCLUDED.name,
             picture = EXCLUDED.picture
       RETURNING customer_id, email, name, picture`,
      [googleId, email, name, picture],
    );

    const customer = result.rows[0];
    const token = signToken({
      type: "customer",
      customer_id: customer.customer_id,
      email: customer.email,
      name: customer.name,
      picture: customer.picture,
    });

    res.json({ token, user: customer });
  } catch (error) {
    next(error);
  }
});

// Customer guest login — no account required
app.post("/api/auth/guest/customer", async (req, res) => {
  const guestSessionId = `guest-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const token = signToken({
    type: "customer",
    guest: true,
    guest_session_id: guestSessionId,
    name: "Guest",
  });

  res.json({
    token,
    user: {
      type: "customer",
      guest: true,
      name: "Guest",
      guest_session_id: guestSessionId,
    },
  });
});

// Employee Google login — must already have google_email pre-registered
app.post("/api/auth/google/employee", async (req, res, next) => {
  const { credential } = req.body;
  if (!credential)
    return res.status(400).json({ error: "credential is required" });

  try {
    const payload = await verifyGoogleToken(credential);
    const { email } = payload;

    const result = await pool.query(
      "SELECT employee_id, name, position, hire_date, google_email FROM employee WHERE google_email = $1",
      [email],
    );

    if (!result.rowCount) {
      return res.status(403).json({
        error:
          "No employee account found for this Google email. Contact your manager.",
      });
    }

    const employee = result.rows[0];
    const token = signToken({
      type: "employee",
      employee_id: employee.employee_id,
      name: employee.name,
      position: employee.position,
    });

    res.json({ token, user: { ...employee } });
  } catch (error) {
    next(error);
  }
});

// Employee PIN login — uses 4-digit PIN only
app.post("/api/auth/pin/employee", async (req, res, next) => {
  const pin = normalizeEmployeePin(req.body?.pin);

  if (!pin || !isValidEmployeePin(pin)) {
    return res.status(400).json({ error: "pin must be a 4-digit code" });
  }

  try {
    const result = await pool.query(
      `SELECT employee_id, name, position, hire_date, google_email
       FROM employee
       WHERE employee_pin = $1`,
      [pin],
    );

    if (!result.rowCount) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    if (result.rowCount > 1) {
      return res.status(409).json({
        error:
          "PIN is assigned to multiple employees. Ask manager to reset PINs.",
      });
    }

    const employee = result.rows[0];
    const token = signToken({
      type: "employee",
      employee_id: employee.employee_id,
      name: employee.name,
      position: employee.position,
    });

    res.json({ token, user: { ...employee } });
  } catch (error) {
    next(error);
  }
});

function parseDateInput(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

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
  // Highlight severe/impactful conditions such as hail, thunderstorms, freezing rain, and heavy snow/showers.
  return [66, 67, 75, 77, 82, 85, 86, 95, 96, 99].includes(weatherCode);
}

// External weather route (Open-Meteo, no API key required)
app.get("/api/external/weather", async (req, res, next) => {
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
        error:
          geocodeData.reason || "Failed to geocode location with Open-Meteo",
      });
    }

    const match = geocodeData.results?.[0];
    if (!match) {
      return res
        .status(404)
        .json({ error: `Location not found: ${cityInput}` });
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

// Menu routes
app.get("/api/menu/items", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT menu_item_id, name, cost, category FROM menu_item ORDER BY menu_item_id",
    );
    res.json({ menuItems: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/menu/items", async (req, res, next) => {
  const { name, cost, category } = req.body;
  if (!name || Number.isNaN(Number(cost))) {
    return res.status(400).json({ error: "name and cost are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_item (menu_item_id, name, cost, category)
       VALUES ((SELECT COALESCE(MAX(menu_item_id), 0) + 1 FROM menu_item), $1, $2, $3)
       RETURNING menu_item_id, name, cost, category`,
      [name.trim(), Number(cost), category || null],
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/menu/items/:id", async (req, res, next) => {
  const { id } = req.params;
  const { name, cost, category } = req.body;
  if (!name || Number.isNaN(Number(cost))) {
    return res.status(400).json({ error: "name and cost are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE menu_item
       SET name = $1, cost = $2, category = $3
       WHERE menu_item_id = $4
       RETURNING menu_item_id, name, cost, category`,
      [name.trim(), Number(cost), category || null, id],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Menu item not found" });
    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/menu/items/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM menu_item WHERE menu_item_id = $1",
      [req.params.id],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Menu item not found" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Inventory routes
app.get("/api/inventory", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT inventory_id, resource_name, quantity_available FROM inventory ORDER BY inventory_id",
    );
    res.json({ inventory: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/inventory", async (req, res, next) => {
  const { resource_name, quantity_available } = req.body;
  if (!resource_name || Number.isNaN(Number(quantity_available))) {
    return res
      .status(400)
      .json({ error: "resource_name and quantity_available are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventory (inventory_id, resource_name, quantity_available)
       VALUES ((SELECT COALESCE(MAX(inventory_id), 0) + 1 FROM inventory), $1, $2)
       RETURNING inventory_id, resource_name, quantity_available`,
      [resource_name.trim(), Number(quantity_available)],
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/inventory/:id", async (req, res, next) => {
  const { resource_name, quantity_available } = req.body;
  if (!resource_name || Number.isNaN(Number(quantity_available))) {
    return res
      .status(400)
      .json({ error: "resource_name and quantity_available are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE inventory
       SET resource_name = $1, quantity_available = $2
       WHERE inventory_id = $3
       RETURNING inventory_id, resource_name, quantity_available`,
      [resource_name.trim(), Number(quantity_available), req.params.id],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Inventory item not found" });
    res.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/inventory/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM inventory WHERE inventory_id = $1",
      [req.params.id],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Inventory item not found" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Employee routes
app.get("/api/employees", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT employee_id, name, position, hire_date, google_email, employee_pin,
              (employee_pin IS NOT NULL) AS pin_set
       FROM employee
       ORDER BY employee_id`,
    );
    res.json({ employees: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", async (req, res, next) => {
  const { employee_id, name, position, hire_date, google_email } = req.body;
  const pin = normalizeEmployeePin(req.body?.employee_pin);
  if (!employee_id || !name || !position || !parseDateInput(hire_date)) {
    return res
      .status(400)
      .json({ error: "employee_id, name, position, hire_date are required" });
  }
  if (pin && !isValidEmployeePin(pin)) {
    return res
      .status(400)
      .json({ error: "employee_pin must be exactly 4 digits" });
  }

  try {
    if (pin) {
      const pinInUse = await pool.query(
        "SELECT employee_id FROM employee WHERE employee_pin = $1 LIMIT 1",
        [pin],
      );
      if (pinInUse.rowCount) {
        return res
          .status(409)
          .json({ error: "This PIN is already assigned to another employee" });
      }
    }

    const result = await pool.query(
      `INSERT INTO employee (employee_id, name, position, hire_date, google_email, employee_pin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING employee_id, name, position, hire_date, google_email, employee_pin, (employee_pin IS NOT NULL) AS pin_set`,
      [
        Number(employee_id),
        name.trim(),
        position.trim(),
        hire_date,
        google_email?.trim() || null,
        pin,
      ],
    );
    res.status(201).json({ employee: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  const { name, position, hire_date, google_email } = req.body;
  if (!name || !position || !parseDateInput(hire_date)) {
    return res
      .status(400)
      .json({ error: "name, position, hire_date are required" });
  }

  const hasPinField = Object.prototype.hasOwnProperty.call(
    req.body,
    "employee_pin",
  );
  const pin = normalizeEmployeePin(req.body?.employee_pin);
  if (hasPinField && pin && !isValidEmployeePin(pin)) {
    return res
      .status(400)
      .json({ error: "employee_pin must be exactly 4 digits" });
  }

  try {
    if (hasPinField && pin) {
      const pinInUse = await pool.query(
        "SELECT employee_id FROM employee WHERE employee_pin = $1 AND employee_id <> $2 LIMIT 1",
        [pin, req.params.id],
      );
      if (pinInUse.rowCount) {
        return res
          .status(409)
          .json({ error: "This PIN is already assigned to another employee" });
      }
    }

    const values = [
      name.trim(),
      position.trim(),
      hire_date,
      google_email?.trim() || null,
    ];
    const setClauses = [
      "name = $1",
      "position = $2",
      "hire_date = $3",
      "google_email = $4",
    ];

    if (hasPinField) {
      values.push(pin);
      setClauses.push(`employee_pin = $${values.length}`);
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE employee
       SET ${setClauses.join(", ")}
       WHERE employee_id = $${values.length}
       RETURNING employee_id, name, position, hire_date, google_email, employee_pin, (employee_pin IS NOT NULL) AS pin_set`,
      values,
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Employee not found" });
    res.json({ employee: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM employee WHERE employee_id = $1",
      [req.params.id],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Employee not found" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Cashier routes
app.get("/api/cashier/modifications", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT modification_type_id, name, cost
       FROM modification_type
       ORDER BY modification_type_id`,
    );

    const sugar = [];
    const ice = [];
    const toppings = [];
    const sizes = [];

    for (const row of result.rows) {
      const record = {
        modification_type_id: Number(row.modification_type_id),
        name: row.name,
        cost: Number(row.cost || 0),
      };
      if (
        record.modification_type_id >= 1 &&
        record.modification_type_id <= 6
      ) {
        sugar.push(record);
      } else if (
        record.modification_type_id >= 7 &&
        record.modification_type_id <= 10
      ) {
        ice.push(record);
      } else if (
        record.modification_type_id >= 11 &&
        record.modification_type_id <= 20
      ) {
        toppings.push(record);
      } else if (record.modification_type_id >= 21) {
        sizes.push(record);
      }
    }

    res.json({ sugar, ice, toppings, sizes });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cashier/most-ordered", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.menu_item_id, m.name, m.cost, m.category, SUM(oi.quantity) as order_count
       FROM order_item oi
       JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
       GROUP BY m.menu_item_id, m.name, m.cost, m.category
       ORDER BY order_count DESC
       LIMIT 9`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Cashier Most Ordered Error:", error);
    res.status(500).json({ error: "Failed to fetch global most ordered" });
  }
});

app.post("/api/cashier/orders", async (req, res, next) => {
  const employeeId = Number(req.body?.employee_id);
  const paymentType = String(req.body?.payment_type || "CARD").trim() || "CARD";
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  // Optionally attach a customer to this order (customer kiosk orders)
  let customerId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      if (decoded.type === "customer" && decoded.customer_id) {
        customerId = decoded.customer_id;
      }
    } catch {
      // Non-fatal: unrecognized token just means no customer link
    }
  }

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res
      .status(400)
      .json({ error: "employee_id must be a positive integer" });
  }

  if (!items.length) {
    return res
      .status(400)
      .json({ error: "At least one order item is required" });
  }

  const normalizedItems = [];
  for (const item of items) {
    const menuItemId = Number(item?.menu_item_id);
    const quantity = Number(item?.quantity || 1);
    const modificationIds = Array.isArray(item?.modification_ids)
      ? item.modification_ids
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];
    const comments =
      typeof item?.comments === "string" ? item.comments.trim() : "";

    if (
      !Number.isInteger(menuItemId) ||
      menuItemId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        error: "Each item must include a valid menu_item_id and quantity",
      });
    }

    normalizedItems.push({ menuItemId, quantity, modificationIds, comments });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employeeResult = await client.query(
      "SELECT employee_id FROM employee WHERE employee_id = $1",
      [employeeId],
    );
    if (!employeeResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Employee not found" });
    }

    const menuIds = [
      ...new Set(normalizedItems.map((item) => item.menuItemId)),
    ];
    const menuResult = await client.query(
      "SELECT menu_item_id, cost FROM menu_item WHERE menu_item_id = ANY($1::int[])",
      [menuIds],
    );
    const menuMap = new Map(
      menuResult.rows.map((row) => [
        Number(row.menu_item_id),
        Number(row.cost || 0),
      ]),
    );

    for (const item of normalizedItems) {
      if (!menuMap.has(item.menuItemId)) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: `Menu item not found: ${item.menuItemId}` });
      }
    }

    const allModIds = [
      ...new Set(normalizedItems.flatMap((item) => item.modificationIds)),
    ];
    const modMap = new Map();
    if (allModIds.length) {
      const modResult = await client.query(
        "SELECT modification_type_id, cost FROM modification_type WHERE modification_type_id = ANY($1::int[])",
        [allModIds],
      );
      for (const row of modResult.rows) {
        modMap.set(Number(row.modification_type_id), Number(row.cost || 0));
      }
    }

    let totalCost = 0;
    const pricedItems = normalizedItems.map((item) => {
      const baseCost = menuMap.get(item.menuItemId) || 0;
      const modCost = item.modificationIds.reduce(
        (sum, modId) => sum + (modMap.get(modId) || 0),
        0,
      );
      const itemPrice = baseCost + modCost;
      totalCost += itemPrice * item.quantity;
      return { ...item, itemPrice };
    });

    const orderResult = await client.query(
      `INSERT INTO customer_order (order_id, order_date, total_cost, employee_id, payment_type, customer_id)
       VALUES ((SELECT COALESCE(MAX(order_id), 0) + 1 FROM customer_order), NOW(), $1, $2, $3, $4)
       RETURNING order_id, order_date, total_cost, employee_id, payment_type, customer_id`,
      [totalCost, employeeId, paymentType, customerId],
    );
    const order = orderResult.rows[0];

    for (const item of pricedItems) {
      const orderItemResult = await client.query(
        `INSERT INTO order_item (order_item_id, order_id, menu_item_id, quantity, item_price, comments)
         VALUES ((SELECT COALESCE(MAX(order_item_id), 0) + 1 FROM order_item), $1, $2, $3, $4, $5)
         RETURNING order_item_id`,
        [
          order.order_id,
          item.menuItemId,
          item.quantity,
          item.itemPrice,
          item.comments || null,
        ],
      );

      const orderItemId = orderItemResult.rows[0]?.order_item_id;
      for (const modId of item.modificationIds) {
        await client.query(
          `INSERT INTO order_item_modification (order_item_id, modification_type_id)
           VALUES ($1, $2)`,
          [orderItemId, modId],
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      order: {
        ...order,
        total_cost: Number(order.total_cost || 0),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// Get order status (customer polls this)
app.get("/api/orders/:id/status", async (req, res, next) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id" });
  }
  try {
    const result = await pool.query(
      "SELECT order_id, status FROM customer_order WHERE order_id = $1",
      [orderId],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Order not found" });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update order status (cashier marks as Ready/Completed)
app.patch(
  "/api/orders/:id/status",
  requireAuth(["Manager", "Cashier"]),
  async (req, res, next) => {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const allowed = ["In Progress", "Ready", "Completed"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    try {
      const result = await pool.query(
        "UPDATE customer_order SET status = $1 WHERE order_id = $2 RETURNING order_id, status",
        [status, orderId],
      );
      if (!result.rowCount)
        return res.status(404).json({ error: "Order not found" });
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  },
);

// Today's orders for the cashier screen
app.get("/api/cashier/orders/today", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         co.order_id,
         co.order_date,
         co.total_cost,
         co.payment_type,
         co.status,
         json_agg(
           json_build_object(
             'order_item_id', oi.order_item_id,
             'menu_item_id',  oi.menu_item_id,
             'name',          m.name,
             'quantity',      oi.quantity,
             'item_price',    oi.item_price
           ) ORDER BY oi.order_item_id
         ) AS items
       FROM customer_order co
       JOIN order_item oi ON co.order_id = oi.order_id
       JOIN menu_item  m  ON oi.menu_item_id = m.menu_item_id
       WHERE co.order_date::date = CURRENT_DATE
       GROUP BY co.order_id, co.order_date, co.total_cost, co.payment_type, co.status
       ORDER BY co.order_id DESC`,
    );
    res.json({ orders: result.rows });
  } catch (error) {
    next(error);
  }
});

// Customer order history (requires customer JWT)
app.get("/api/customer/orders", requireAuth(), async (req, res, next) => {
  if (req.user.type !== "customer") {
    return res.status(403).json({ error: "Customer account required" });
  }

  try {
    const result = await pool.query(
      `SELECT
         co.order_id,
         co.order_date,
         co.total_cost,
         co.payment_type,
         co.status,
         json_agg(
           json_build_object(
             'order_item_id', oi.order_item_id,
             'menu_item_id',  oi.menu_item_id,
             'name',          m.name,
             'quantity',      oi.quantity,
             'item_price',    oi.item_price
           ) ORDER BY oi.order_item_id
         ) AS items
       FROM customer_order co
       JOIN order_item oi ON co.order_id = oi.order_id
       JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
       WHERE co.customer_id = $1
       GROUP BY co.order_id
       ORDER BY co.order_date DESC`,
      [req.user.customer_id],
    );

    res.json({ orders: result.rows });
  } catch (error) {
    next(error);
  }
});

// Reports routes
app.get("/api/reports/items-sold", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    const result = await pool.query(
      `SELECT oi.menu_item_id, m.name AS item_name,
              SUM(oi.quantity) AS qty_sold,
              SUM(oi.quantity * oi.item_price) AS revenue
       FROM customer_order o
       JOIN order_item oi ON o.order_id = oi.order_id
       JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
       WHERE DATE(o.order_date) = $1
       GROUP BY oi.menu_item_id, m.name
       ORDER BY qty_sold DESC, item_name ASC`,
      [date],
    );
    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/employees", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    const result = await pool.query(
      `SELECT e.employee_id, e.name AS employee_name,
              COUNT(o.order_id) AS sales_count,
              COALESCE(SUM(o.total_cost), 0) AS revenue
       FROM customer_order o
       JOIN employee e ON o.employee_id = e.employee_id
       WHERE DATE(o.order_date) = $1
       GROUP BY e.employee_id, e.name
       ORDER BY sales_count DESC`,
      [date],
    );
    res.json({ employees: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/total-profit", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total_profit
       FROM customer_order
       WHERE DATE(order_date) = $1`,
      [date],
    );
    res.json({ totalProfit: Number(result.rows[0]?.total_profit || 0) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/daily", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    const [items, employees, totals] = await Promise.all([
      pool.query(
        `SELECT oi.menu_item_id, m.name AS item_name,
                SUM(oi.quantity) AS qty_sold,
                SUM(oi.quantity * oi.item_price) AS revenue
         FROM customer_order o
         JOIN order_item oi ON o.order_id = oi.order_id
         JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
         WHERE DATE(o.order_date) = $1
         GROUP BY oi.menu_item_id, m.name
         ORDER BY qty_sold DESC, item_name ASC`,
        [date],
      ),
      pool.query(
        `SELECT e.employee_id, e.name AS employee_name,
                COUNT(o.order_id) AS sales_count,
                COALESCE(SUM(o.total_cost), 0) AS revenue
         FROM customer_order o
         JOIN employee e ON o.employee_id = e.employee_id
         WHERE DATE(o.order_date) = $1
         GROUP BY e.employee_id, e.name
         ORDER BY sales_count DESC`,
        [date],
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_cost), 0) AS total_profit
         FROM customer_order
         WHERE DATE(order_date) = $1`,
        [date],
      ),
    ]);

    res.json({
      items: items.rows,
      employees: employees.rows,
      totalProfit: Number(totals.rows[0]?.total_profit || 0),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/sales", async (req, res, next) => {
  const startDate = parseDateInput(req.query.startDate);
  const endDate = parseDateInput(req.query.endDate);
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
  }

  try {
    const result = await pool.query(
      `WITH sales_data AS (
          SELECT m.name AS item_name,
                 m.category,
                 SUM(oi.quantity) AS qty_sold,
                 SUM(oi.quantity * oi.item_price) AS revenue,
                 AVG(oi.item_price) AS avg_price
          FROM customer_order co
          JOIN order_item oi ON co.order_id = oi.order_id
          JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
          WHERE DATE(co.order_date) BETWEEN $1 AND $2
          GROUP BY m.menu_item_id, m.name, m.category
       ),
       total_revenue AS (
          SELECT SUM(revenue) AS total FROM sales_data
       )
       SELECT sd.item_name,
              COALESCE(sd.category, 'Uncategorized') AS category,
              sd.qty_sold,
              sd.revenue,
              sd.avg_price,
              COALESCE(ROUND((sd.revenue * 100.0 / NULLIF(tr.total, 0))::numeric, 1), 0) AS percent_of_total
       FROM sales_data sd
       CROSS JOIN total_revenue tr
       ORDER BY sd.revenue DESC`,
      [startDate, endDate],
    );
    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/inventory", async (req, res, next) => {
  const startDate = parseDateInput(req.query.startDate);
  const endDate = parseDateInput(req.query.endDate);
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
  }

  try {
    const result = await pool.query(
      `WITH period_orders AS (
          SELECT oi.menu_item_id, SUM(oi.quantity) AS items_sold
          FROM customer_order co
          JOIN order_item oi ON co.order_id = oi.order_id
          WHERE DATE(co.order_date) BETWEEN $1 AND $2
          GROUP BY oi.menu_item_id
       ),
       inventory_usage AS (
          SELECT i.inventory_id,
                 i.resource_name,
                 i.quantity_available AS current_qty,
                 COALESCE(SUM(po.items_sold * mii.quantity_used), 0) AS qty_used
          FROM inventory i
          LEFT JOIN menu_item_inventory mii ON i.inventory_id = mii.inventory_id
          LEFT JOIN period_orders po ON mii.menu_item_id = po.menu_item_id
          GROUP BY i.inventory_id, i.resource_name, i.quantity_available
       )
       SELECT resource_name,
              (current_qty + qty_used) AS starting_qty,
              qty_used,
              current_qty AS remaining_qty,
              CASE
                WHEN (current_qty + qty_used) > 0
                THEN ROUND((qty_used * 100.0 / (current_qty + qty_used))::numeric, 1)
                ELSE 0
              END AS usage_percent
       FROM inventory_usage
       WHERE qty_used > 0
       ORDER BY qty_used DESC`,
      [startDate, endDate],
    );
    res.json({ usage: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/x-report", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    const result = await pool.query(
      `WITH hours AS (
          SELECT generate_series(8, 21) AS hr
       ),
       hourly_transactions AS (
          SELECT EXTRACT(HOUR FROM o.order_date)::int AS hr,
                 COUNT(*) AS transactions,
                 COALESCE(SUM(o.total_cost), 0) AS total_sales
          FROM customer_order o
          WHERE DATE(o.order_date) = $1
          GROUP BY EXTRACT(HOUR FROM o.order_date)::int
       ),
       hourly_items AS (
          SELECT EXTRACT(HOUR FROM o.order_date)::int AS hr,
                 COALESCE(SUM(oi.quantity), 0) AS items_sold
          FROM customer_order o
          JOIN order_item oi ON o.order_id = oi.order_id
          WHERE DATE(o.order_date) = $1
          GROUP BY EXTRACT(HOUR FROM o.order_date)::int
       ),
       top_employee AS (
          SELECT x.hr,
                 CONCAT(e.name, ' (', x.cnt, ')') AS top_employee
          FROM (
            SELECT EXTRACT(HOUR FROM o.order_date)::int AS hr,
                   o.employee_id,
                   COUNT(*) AS cnt,
                   ROW_NUMBER() OVER (
                     PARTITION BY EXTRACT(HOUR FROM o.order_date)::int
                     ORDER BY COUNT(*) DESC, o.employee_id ASC
                   ) AS rn
            FROM customer_order o
            WHERE DATE(o.order_date) = $1
            GROUP BY EXTRACT(HOUR FROM o.order_date)::int, o.employee_id
          ) x
          JOIN employee e ON e.employee_id = x.employee_id
          WHERE x.rn = 1
       ),
       top_item AS (
          SELECT x.hr,
                 CONCAT(m.name, ' (', x.qty, ')') AS top_item
          FROM (
            SELECT EXTRACT(HOUR FROM o.order_date)::int AS hr,
                   oi.menu_item_id,
                   SUM(oi.quantity) AS qty,
                   ROW_NUMBER() OVER (
                     PARTITION BY EXTRACT(HOUR FROM o.order_date)::int
                     ORDER BY SUM(oi.quantity) DESC, oi.menu_item_id ASC
                   ) AS rn
            FROM customer_order o
            JOIN order_item oi ON o.order_id = oi.order_id
            WHERE DATE(o.order_date) = $1
            GROUP BY EXTRACT(HOUR FROM o.order_date)::int, oi.menu_item_id
          ) x
          JOIN menu_item m ON m.menu_item_id = x.menu_item_id
          WHERE x.rn = 1
       )
       SELECT h.hr AS hour,
              LPAD(h.hr::text, 2, '0') || ':00 - ' || LPAD(h.hr::text, 2, '0') || ':59' AS label,
              COALESCE(ht.transactions, 0) AS transactions,
              COALESCE(hi.items_sold, 0) AS items_sold,
              CASE
                WHEN COALESCE(ht.transactions, 0) = 0 THEN 0
                ELSE ROUND((COALESCE(ht.total_sales, 0) / ht.transactions)::numeric, 2)
              END AS avg_order_cost,
              COALESCE(te.top_employee, 'N/A') AS top_employee,
              COALESCE(ti.top_item, 'N/A') AS top_item
       FROM hours h
       LEFT JOIN hourly_transactions ht ON ht.hr = h.hr
       LEFT JOIN hourly_items hi ON hi.hr = h.hr
       LEFT JOIN top_employee te ON te.hr = h.hr
       LEFT JOIN top_item ti ON ti.hr = h.hr
       ORDER BY h.hr`,
      [date],
    );
    res.json({ hours: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/x", async (req, res, next) => {
  const date = req.query.date ? String(req.query.date) : "";
  res.redirect(307, `/api/reports/x-report?date=${encodeURIComponent(date)}`);
});

// Z-Report GET endpoint - Load existing report
app.get("/api/reports/z-report", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res
      .status(400)
      .json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
    // Check if Z-Report exists for this date
    const reportCheck = await pool.query(
      "SELECT run_date, run_at FROM z_report_runs WHERE run_date = $1",
      [date],
    );

    if (!reportCheck.rowCount) {
      return res.status(404).json({
        error: `No Z-Report found for ${date}. Use 'Generate Z-Report' to create one.`,
      });
    }

    const reportInfo = reportCheck.rows[0];

    // Load the report data
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(total_cost),0)::float8 AS total_sales,
              COALESCE(SUM(CASE WHEN UPPER(payment_type)='CASH' THEN total_cost ELSE 0 END),0)::float8 AS total_cash
       FROM customer_order
       WHERE DATE(order_date) = $1`,
      [date],
    );

    const payments = await pool.query(
      `WITH pt AS (
          SELECT COALESCE(payment_type,'Not Specified') AS method,
                 COUNT(*)::int AS count,
                 SUM(total_cost)::float8 AS total
          FROM customer_order
          WHERE DATE(order_date) = $1
          GROUP BY payment_type
       ),
       grand AS (
          SELECT COALESCE(SUM(total_cost), 0)::float8 AS g
          FROM customer_order WHERE DATE(order_date) = $1
       )
       SELECT pt.method,
              pt.count,
              pt.total,
              COALESCE(ROUND((pt.total * 100.0 / NULLIF(grand.g, 0))::numeric, 1), 0)::float8 AS pct
       FROM pt CROSS JOIN grand`,
      [date],
    );

    const employees = await pool.query(
      `SELECT COALESCE(e.name, 'Unknown') AS name,
              COUNT(*)::int AS orders
       FROM customer_order o
       LEFT JOIN employee e ON o.employee_id = e.employee_id
       WHERE DATE(o.order_date) = $1
       GROUP BY e.name
       ORDER BY COUNT(*) DESC`,
      [date],
    );

    res.json({
      totalOrders: totals.rows[0]?.total_orders || 0,
      totalSales: totals.rows[0]?.total_sales || 0,
      totalCash: totals.rows[0]?.total_cash || 0,
      payments: payments.rows,
      employees: employees.rows,
      generatedDate: reportInfo.run_at
        ? new Date(reportInfo.run_at).toISOString().slice(0, 10)
        : null,
    });
  } catch (error) {
    next(error);
  }
});

// Z-Report GET redirect
app.get("/api/reports/z", async (req, res, next) => {
  const date = req.query.date ? String(req.query.date) : "";
  res.redirect(307, `/api/reports/z-report?date=${encodeURIComponent(date)}`);
});

// Z-Report POST endpoint - Generate new report
app.post("/api/reports/z-report", async (req, res, next) => {
  const date = parseDateInput(req.body?.date || req.query?.date);
  const managerSignature = req.body?.managerSignature || null;

  if (!date)
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
  if (!managerSignature || managerSignature.trim() === "") {
    return res
      .status(400)
      .json({ error: "Manager signature is required to generate Z-Report" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create table without manager_signature column
    await client.query(
      `CREATE TABLE IF NOT EXISTS z_report_runs (
        run_date DATE PRIMARY KEY,
        run_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    );

    try {
      await client.query("INSERT INTO z_report_runs(run_date) VALUES ($1)", [
        date,
      ]);
    } catch (error) {
      if (error.code === "23505") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Z-Report already exists for ${date}. Use 'Load Z-Report' to view it.`,
        });
      }
      throw error;
    }

    const totals = await client.query(
      `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(total_cost),0)::float8 AS total_sales,
              COALESCE(SUM(CASE WHEN UPPER(payment_type)='CASH' THEN total_cost ELSE 0 END),0)::float8 AS total_cash
       FROM customer_order
       WHERE DATE(order_date) = $1`,
      [date],
    );

    const payments = await client.query(
      `WITH pt AS (
          SELECT COALESCE(payment_type,'Not Specified') AS method,
                 COUNT(*)::int AS count,
                 SUM(total_cost)::float8 AS total
          FROM customer_order
          WHERE DATE(order_date) = $1
          GROUP BY payment_type
       ),
       grand AS (
          SELECT COALESCE(SUM(total_cost), 0)::float8 AS g
          FROM customer_order WHERE DATE(order_date) = $1
       )
       SELECT pt.method,
              pt.count,
              pt.total,
              COALESCE(ROUND((pt.total * 100.0 / NULLIF(grand.g, 0))::numeric, 1), 0)::float8 AS pct
       FROM pt CROSS JOIN grand`,
      [date],
    );

    const employees = await client.query(
      `SELECT COALESCE(e.name, 'Unknown') AS name,
              COUNT(*)::int AS orders
       FROM customer_order o
       LEFT JOIN employee e ON o.employee_id = e.employee_id
       WHERE DATE(o.order_date) = $1
       GROUP BY e.name
       ORDER BY COUNT(*) DESC`,
      [date],
    );

    await client.query("COMMIT");
    if (req.body.customer_email) {
      try {
        const email = req.body.customer_email;
        const name = req.body.customer_name || email.split("@")[0];
        const googleId = req.body.google_id || email;
        console.log(
          `[CHECKOUT] Attempting to link order ${orderId} to email: ${email}`,
        );
        let custRes = await pool.query(
          `SELECT customer_id FROM customer WHERE email = $1 LIMIT 1`,
          [email],
        );
        let custId = custRes.rows[0]?.customer_id;
        if (!custId) {
          console.log(
            `[CHECKOUT] Customer not found. Auto-registering: ${email}`,
          );
          const insertRes = await pool.query(
            `INSERT INTO customer (email, name, google_id) VALUES ($1, $2, $3) RETURNING customer_id`,
            [email, name, googleId],
          );
          custId = insertRes.rows[0].customer_id;
        }
        await pool.query(
          `UPDATE customer_order SET customer_id = $1 WHERE order_id = $2`,
          [custId, orderId],
        );
        console.log(
          `[CHECKOUT] Successfully linked order ${orderId} to customer_id ${custId}`,
        );
      } catch (linkError) {
        console.error("[CHECKOUT] FAILED TO LINK CUSTOMER:", linkError.message);
      }
    }

    res.json({
      totalOrders: totals.rows[0]?.total_orders || 0,
      totalSales: totals.rows[0]?.total_sales || 0,
      totalCash: totals.rows[0]?.total_cash || 0,
      payments: payments.rows,
      employees: employees.rows,
      managerSignature: managerSignature,
      generatedDate: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/customer/most-ordered", requireAuth(), async (req, res, next) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: "User email not found." });

  try {
    const result = await pool.query(
      `SELECT m.menu_item_id, m.name, m.cost, m.category, SUM(oi.quantity) as order_count
       FROM customer_order co
       JOIN customer c ON co.customer_id = c.customer_id
       JOIN order_item oi ON co.order_id = oi.order_id
       JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
       WHERE c.email = $1
       GROUP BY m.menu_item_id, m.name, m.cost, m.category
       ORDER BY order_count DESC
       LIMIT 12
       `,
      [email],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Most Ordered SQL Error:", error.message);
    res.json([]);
  }
});

app.get(
  "/api/customer/saved-favorites",
  requireAuth(),
  async (req, res, next) => {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "User email not found." });
    try {
      const result = await pool.query(
        `SELECT f.favorite_id, f.item_data
       FROM customer_favorite f
       JOIN customer c ON f.customer_id = c.customer_id
       WHERE c.email = $1
       ORDER BY f.favorite_id DESC`,
        [email],
      );
      const parsed = result.rows.map((row) => {
        let safeData = row.item_data;
        if (typeof row.item_data === "string") {
          try {
            safeData = JSON.parse(row.item_data);
          } catch (e) {}
        }
        return {
          favorite_id: row.favorite_id,
          item_data: safeData,
        };
      });
      res.json(parsed);
    } catch (error) {
      console.error("Saved Favorites Fetch Error:", error.message);
      res.json([]);
    }
  },
);

app.post(
  "/api/customer/saved-favorites",
  requireAuth(),
  async (req, res, next) => {
    const email = req.body.customer_email;
    const name = req.body.customer_name || email.split("@")[0];
    const googleId = req.body.google_id || email;
    const itemDataStr = JSON.stringify(req.body.item_data);

    try {
      let custRes = await pool.query(
        `SELECT customer_id FROM customer WHERE email = $1 LIMIT 1`,
        [email],
      );
      let custId = custRes.rows[0]?.customer_id;
      if (!custId) {
        const insertRes = await pool.query(
          `INSERT INTO customer (email, name, google_id) VALUES ($1, $2, $3) RETURNING customer_id`,
          [email, name, googleId],
        );
        custId = insertRes.rows[0].customer_id;
      }
      const favRes = await pool.query(
        `INSERT INTO customer_favorite (customer_id, item_data) VALUES ($1, $2) RETURNING favorite_id`,
        [custId, itemDataStr],
      );
      res.json({ favorite_id: favRes.rows[0].favorite_id });
    } catch (err) {
      console.error("Failed to save favorite:", err.message);
      res.status(500).json({ error: "Failed to save favorite" });
    }
  },
);

app.delete(
  "/api/customer/saved-favorites/:id",
  requireAuth(),
  async (req, res, next) => {
    try {
      await pool.query(`DELETE FROM customer_favorite WHERE favorite_id = $1`, [
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete favorite:", err.message);
      res.status(500).json({ error: "Failed to delete favorite" });
    }
  },
);

// Z-Report POST redirect
app.post("/api/reports/z", async (req, res, next) => {
  res.redirect(307, "/api/reports/z-report");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server (only in development)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;
