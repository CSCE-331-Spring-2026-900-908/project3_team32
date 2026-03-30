import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
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

function parseDateInput(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

// Menu routes
app.get("/api/menu/items", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT menu_item_id, name, cost, category FROM menu_item ORDER BY menu_item_id",
    );
    res.json({ items: result.rows });
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
      "SELECT employee_id, name, position, hire_date FROM employee ORDER BY employee_id",
    );
    res.json({ employees: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", async (req, res, next) => {
  const { employee_id, name, position, hire_date } = req.body;
  if (!employee_id || !name || !position || !parseDateInput(hire_date)) {
    return res
      .status(400)
      .json({ error: "employee_id, name, position, hire_date are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employee (employee_id, name, position, hire_date)
       VALUES ($1, $2, $3, $4)
       RETURNING employee_id, name, position, hire_date`,
      [Number(employee_id), name.trim(), position.trim(), hire_date],
    );
    res.status(201).json({ employee: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  const { name, position, hire_date } = req.body;
  if (!name || !position || !parseDateInput(hire_date)) {
    return res
      .status(400)
      .json({ error: "name, position, hire_date are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE employee
       SET name = $1, position = $2, hire_date = $3
       WHERE employee_id = $4
       RETURNING employee_id, name, position, hire_date`,
      [name.trim(), position.trim(), hire_date, req.params.id],
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

app.post("/api/reports/z-report", async (req, res, next) => {
  const date = parseDateInput(req.body?.date || req.query?.date);
  if (!date)
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
        return res
          .status(409)
          .json({ error: "Z-Report already generated for this date." });
      }
      throw error;
    }

    const totals = await client.query(
      `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(total_cost),0)::float8 AS total_sales,
              COALESCE(SUM(CASE WHEN payment_type='Cash' THEN total_cost ELSE 0 END),0)::float8 AS total_cash
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

    res.json({
      totalOrders: totals.rows[0]?.total_orders || 0,
      totalSales: totals.rows[0]?.total_sales || 0,
      totalCash: totals.rows[0]?.total_cash || 0,
      payments: payments.rows,
      employees: employees.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/reports/z", async (req, res, next) => {
  res.redirect(307, "/api/reports/z-report");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
