import { Router } from "express";
import pool from "../config/database.js";
import { parseDateInput, normalizeEmployeePin, isValidEmployeePin } from "../lib/validators.js";

const router = Router();

// ── Menu CRUD ──────────────────────────────────────────────────────────────────

router.post("/menu/items", async (req, res, next) => {
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

router.put("/menu/items/:id", async (req, res, next) => {
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

router.delete("/menu/items/:id", async (req, res, next) => {
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

// ── Inventory CRUD ─────────────────────────────────────────────────────────────

router.get("/inventory", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT inventory_id, resource_name, quantity_available FROM inventory ORDER BY inventory_id",
    );
    res.json({ inventory: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/inventory", async (req, res, next) => {
  const { resource_name, quantity_available } = req.body;
  if (!resource_name || Number.isNaN(Number(quantity_available))) {
    return res.status(400).json({ error: "resource_name and quantity_available are required" });
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

router.put("/inventory/:id", async (req, res, next) => {
  const { resource_name, quantity_available } = req.body;
  if (!resource_name || Number.isNaN(Number(quantity_available))) {
    return res.status(400).json({ error: "resource_name and quantity_available are required" });
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

router.delete("/inventory/:id", async (req, res, next) => {
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

// ── Employee CRUD ──────────────────────────────────────────────────────────────

router.get("/employees", async (req, res, next) => {
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

router.post("/employees", async (req, res, next) => {
  const { employee_id, name, position, hire_date, google_email } = req.body;
  const pin = normalizeEmployeePin(req.body?.employee_pin);
  if (!employee_id || !name || !position || !parseDateInput(hire_date)) {
    return res.status(400).json({ error: "employee_id, name, position, hire_date are required" });
  }
  if (pin && !isValidEmployeePin(pin)) {
    return res.status(400).json({ error: "employee_pin must be exactly 4 digits" });
  }

  try {
    if (pin) {
      const pinInUse = await pool.query(
        "SELECT employee_id FROM employee WHERE employee_pin = $1 LIMIT 1",
        [pin],
      );
      if (pinInUse.rowCount) {
        return res.status(409).json({ error: "This PIN is already assigned to another employee" });
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

router.put("/employees/:id", async (req, res, next) => {
  const { name, position, hire_date, google_email } = req.body;
  if (!name || !position || !parseDateInput(hire_date)) {
    return res.status(400).json({ error: "name, position, hire_date are required" });
  }

  const hasPinField = Object.prototype.hasOwnProperty.call(req.body, "employee_pin");
  const pin = normalizeEmployeePin(req.body?.employee_pin);
  if (hasPinField && pin && !isValidEmployeePin(pin)) {
    return res.status(400).json({ error: "employee_pin must be exactly 4 digits" });
  }

  try {
    if (hasPinField && pin) {
      const pinInUse = await pool.query(
        "SELECT employee_id FROM employee WHERE employee_pin = $1 AND employee_id <> $2 LIMIT 1",
        [pin, req.params.id],
      );
      if (pinInUse.rowCount) {
        return res.status(409).json({ error: "This PIN is already assigned to another employee" });
      }
    }

    const values = [name.trim(), position.trim(), hire_date, google_email?.trim() || null];
    const setClauses = ["name = $1", "position = $2", "hire_date = $3", "google_email = $4"];

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

router.delete("/employees/:id", async (req, res, next) => {
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

// ── Reports ────────────────────────────────────────────────────────────────────

router.get("/reports/items-sold", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

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

router.get("/reports/employees", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

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

router.get("/reports/total-profit", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

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

router.get("/reports/daily", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

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

router.get("/reports/sales", async (req, res, next) => {
  const startDate = parseDateInput(req.query.startDate);
  const endDate = parseDateInput(req.query.endDate);
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
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

router.get("/reports/inventory", async (req, res, next) => {
  const startDate = parseDateInput(req.query.startDate);
  const endDate = parseDateInput(req.query.endDate);
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
  }

  try {
    const result = await pool.query(
      `WITH period_items AS (
          SELECT oi.order_item_id, oi.menu_item_id, oi.quantity
          FROM customer_order co
          JOIN order_item oi ON co.order_id = oi.order_id
          WHERE DATE(co.order_date) BETWEEN $1 AND $2
       ),
       base_usage AS (
          SELECT mii.inventory_id, SUM(pi.quantity * mii.quantity_used) AS qty_used
          FROM period_items pi
          JOIN menu_item_inventory mii ON mii.menu_item_id = pi.menu_item_id
          GROUP BY mii.inventory_id
       ),
       topping_mod_usage AS (
          SELECT mm.inventory_id, SUM(pi.quantity * mm.quantity_used) AS qty_used
          FROM period_items pi
          JOIN order_item_modification oim ON oim.order_item_id = pi.order_item_id
          JOIN (
            VALUES
              (11, 24, 1.0::numeric),
              (12, 25, 1.0::numeric),
              (13, 26, 1.0::numeric),
              (14, 27, 1.0::numeric),
              (15, 28, 1.0::numeric),
              (16, 29, 1.0::numeric),
              (17, 30, 1.0::numeric),
              (18, 31, 1.0::numeric),
              (19, 32, 1.0::numeric),
              (20, 33, 1.0::numeric)
          ) AS mm(modification_type_id, inventory_id, quantity_used)
            ON mm.modification_type_id = oim.modification_type_id
          GROUP BY mm.inventory_id
       ),
       size_flags AS (
          SELECT
            pi.order_item_id,
            pi.menu_item_id,
            pi.quantity,
            BOOL_OR(oim.modification_type_id = 21) AS has_regular,
            BOOL_OR(oim.modification_type_id = 22) AS has_large
          FROM period_items pi
          LEFT JOIN order_item_modification oim ON oim.order_item_id = pi.order_item_id
          GROUP BY pi.order_item_id, pi.menu_item_id, pi.quantity
       ),
       size_base AS (
          SELECT
            sf.order_item_id,
            sf.quantity,
            sf.has_regular,
            sf.has_large,
            COALESCE(MAX(CASE WHEN mii.inventory_id = 40 THEN mii.quantity_used END), 0) AS medium_cup_qty,
            COALESCE(MAX(CASE WHEN mii.inventory_id = 41 THEN mii.quantity_used END), 0) AS large_cup_qty,
            COALESCE(MAX(CASE WHEN mii.inventory_id = 42 THEN mii.quantity_used END), 0) AS medium_lid_qty,
            COALESCE(MAX(CASE WHEN mii.inventory_id = 43 THEN mii.quantity_used END), 0) AS large_lid_qty
          FROM size_flags sf
          LEFT JOIN menu_item_inventory mii ON mii.menu_item_id = sf.menu_item_id
          GROUP BY sf.order_item_id, sf.quantity, sf.has_regular, sf.has_large
       ),
       size_swap_usage AS (
          SELECT inventory_id, SUM(qty_used) AS qty_used
          FROM (
            SELECT
              40 AS inventory_id,
              CASE
                WHEN has_large AND NOT has_regular THEN -quantity * medium_cup_qty
                WHEN has_regular AND NOT has_large THEN quantity * large_cup_qty
                ELSE 0
              END AS qty_used
            FROM size_base
            UNION ALL
            SELECT
              41 AS inventory_id,
              CASE
                WHEN has_large AND NOT has_regular THEN quantity * medium_cup_qty
                WHEN has_regular AND NOT has_large THEN -quantity * large_cup_qty
                ELSE 0
              END AS qty_used
            FROM size_base
            UNION ALL
            SELECT
              42 AS inventory_id,
              CASE
                WHEN has_large AND NOT has_regular THEN -quantity * medium_lid_qty
                WHEN has_regular AND NOT has_large THEN quantity * large_lid_qty
                ELSE 0
              END AS qty_used
            FROM size_base
            UNION ALL
            SELECT
              43 AS inventory_id,
              CASE
                WHEN has_large AND NOT has_regular THEN quantity * medium_lid_qty
                WHEN has_regular AND NOT has_large THEN -quantity * large_lid_qty
                ELSE 0
              END AS qty_used
            FROM size_base
          ) size_delta
          WHERE qty_used <> 0
          GROUP BY inventory_id
       ),
       usage_totals AS (
          SELECT inventory_id, SUM(qty_used) AS qty_used
          FROM (
            SELECT inventory_id, qty_used FROM base_usage
            UNION ALL
            SELECT inventory_id, qty_used FROM topping_mod_usage
            UNION ALL
            SELECT inventory_id, qty_used FROM size_swap_usage
          ) usage_rows
          GROUP BY inventory_id
       )
       SELECT resource_name,
              (quantity_available + COALESCE(usage_totals.qty_used, 0)) AS starting_qty,
              COALESCE(usage_totals.qty_used, 0) AS qty_used,
              quantity_available AS remaining_qty,
              CASE
                WHEN (quantity_available + COALESCE(usage_totals.qty_used, 0)) > 0
                THEN ROUND((COALESCE(usage_totals.qty_used, 0) * 100.0 / (quantity_available + COALESCE(usage_totals.qty_used, 0)))::numeric, 1)
                ELSE 0
              END AS usage_percent
       FROM inventory
       LEFT JOIN usage_totals ON usage_totals.inventory_id = inventory.inventory_id
       WHERE COALESCE(usage_totals.qty_used, 0) > 0
       ORDER BY COALESCE(usage_totals.qty_used, 0) DESC`,
      [startDate, endDate],
    );
    res.json({ usage: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/reports/x-report", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

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

router.get("/reports/x", (req, res) => {
  const date = req.query.date ? String(req.query.date) : "";
  res.redirect(307, `/api/reports/x-report?date=${encodeURIComponent(date)}`);
});

router.get("/reports/z-report", async (req, res, next) => {
  const date = parseDateInput(req.query.date);
  if (!date)
    return res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });

  try {
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

router.get("/reports/z", (req, res) => {
  const date = req.query.date ? String(req.query.date) : "";
  res.redirect(307, `/api/reports/z-report?date=${encodeURIComponent(date)}`);
});

router.post("/reports/z-report", async (req, res, next) => {
  const date = parseDateInput(req.body?.date || req.query?.date);
  const managerSignature = req.body?.managerSignature || null;

  if (!date)
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
  if (!managerSignature || managerSignature.trim() === "") {
    return res.status(400).json({ error: "Manager signature is required to generate Z-Report" });
  }

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
      await client.query("INSERT INTO z_report_runs(run_date) VALUES ($1)", [date]);
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

    res.json({
      totalOrders: totals.rows[0]?.total_orders || 0,
      totalSales: totals.rows[0]?.total_sales || 0,
      totalCash: totals.rows[0]?.total_cash || 0,
      payments: payments.rows,
      employees: employees.rows,
      managerSignature,
      generatedDate: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.post("/reports/z", (req, res) => {
  res.redirect(307, "/api/reports/z-report");
});

export default router;
