import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { signToken, requireAuth, verifyGoogleToken } from "../lib/auth.js";
import { normalizeEmployeePin, isValidEmployeePin } from "../lib/validators.js";
import {
  SIZE_MODIFICATION_IDS,
  MODIFICATION_INVENTORY_USAGE,
  addInventoryUsage,
  applySizeInventorySwap,
} from "../lib/inventory.js";

const router = Router();

// ── Employee auth ──────────────────────────────────────────────────────────────

router.post("/auth/google/employee", async (req, res, next) => {
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
        error: "No employee account found for this Google email. Contact your manager.",
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

router.post("/auth/pin/employee", async (req, res, next) => {
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
        error: "PIN is assigned to multiple employees. Ask manager to reset PINs.",
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

// ── Cashier routes ─────────────────────────────────────────────────────────────

router.get("/cashier/modifications", async (req, res, next) => {
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
      if (record.modification_type_id >= 1 && record.modification_type_id <= 6) {
        sugar.push(record);
      } else if (record.modification_type_id >= 7 && record.modification_type_id <= 10) {
        ice.push(record);
      } else if (record.modification_type_id >= 11 && record.modification_type_id <= 20) {
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

router.get("/cashier/most-ordered", async (req, res, next) => {
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

router.post("/cashier/orders", async (req, res, next) => {
  const employeeId = Number(req.body?.employee_id);
  const paymentType = String(req.body?.payment_type || "CARD").trim() || "CARD";
  const tipAmount = Number(req.body?.tip_amount) || 0;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  let customerId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      if (decoded.type === "customer" && decoded.customer_id) {
        customerId = decoded.customer_id;
      }
    } catch {}
  }

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ error: "employee_id must be a positive integer" });
  }
  if (!items.length) {
    return res.status(400).json({ error: "At least one order item is required" });
  }

  const normalizedItems = [];
  for (const item of items) {
    const menuItemId = Number(item?.menu_item_id);
    const quantity = Number(item?.quantity || 1);
    const modificationIds = Array.isArray(item?.modification_ids)
      ? item.modification_ids.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0)
      : [];
    const comments = typeof item?.comments === "string" ? item.comments.trim() : "";

    if (
      !Number.isInteger(menuItemId) || menuItemId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0
    ) {
      return res.status(400).json({ error: "Each item must include a valid menu_item_id and quantity" });
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

    const menuIds = [...new Set(normalizedItems.map((i) => i.menuItemId))];
    const menuResult = await client.query(
      "SELECT menu_item_id, cost FROM menu_item WHERE menu_item_id = ANY($1::int[])",
      [menuIds],
    );
    const menuMap = new Map(menuResult.rows.map((r) => [Number(r.menu_item_id), Number(r.cost || 0)]));

    const allModIds = [...new Set(normalizedItems.flatMap((i) => i.modificationIds))];
    const modMap = new Map();
    if (allModIds.length) {
      const modResult = await client.query(
        "SELECT modification_type_id, cost FROM modification_type WHERE modification_type_id = ANY($1::int[])",
        [allModIds],
      );
      modResult.rows.forEach((r) =>
        modMap.set(Number(r.modification_type_id), Number(r.cost || 0)),
      );
    }

    let itemTotal = 0;
    const pricedItems = normalizedItems.map((item) => {
      const baseCost = menuMap.get(item.menuItemId) || 0;
      const modCost = item.modificationIds.reduce((sum, id) => sum + (modMap.get(id) || 0), 0);
      const itemPrice = baseCost + modCost;
      itemTotal += itemPrice * item.quantity;
      return { ...item, itemPrice };
    });

    const inventoryUsageRows = await client.query(
      `SELECT menu_item_id, inventory_id, quantity_used
       FROM menu_item_inventory
       WHERE menu_item_id = ANY($1::int[])`,
      [menuIds],
    );

    const baseUsageByMenuId = new Map();
    for (const row of inventoryUsageRows.rows) {
      const menuItemId = Number(row.menu_item_id);
      const inventoryId = Number(row.inventory_id);
      const quantityUsed = Number(row.quantity_used || 0);
      if (!baseUsageByMenuId.has(menuItemId)) {
        baseUsageByMenuId.set(menuItemId, []);
      }
      baseUsageByMenuId.get(menuItemId).push({ inventoryId, quantityUsed });
    }

    const inventoryDeductions = new Map();
    for (const item of normalizedItems) {
      const perUnitUsage = new Map();
      const baseUsage = baseUsageByMenuId.get(item.menuItemId) || [];
      for (const usage of baseUsage) {
        addInventoryUsage(perUnitUsage, usage.inventoryId, usage.quantityUsed);
      }

      const hasLargeSize = item.modificationIds.includes(SIZE_MODIFICATION_IDS.LARGE);
      const hasRegularSize = item.modificationIds.includes(SIZE_MODIFICATION_IDS.REGULAR);
      if (hasLargeSize && !hasRegularSize) {
        applySizeInventorySwap(perUnitUsage, "large");
      } else if (hasRegularSize && !hasLargeSize) {
        applySizeInventorySwap(perUnitUsage, "regular");
      }

      for (const modificationId of item.modificationIds) {
        const mappedUsage = MODIFICATION_INVENTORY_USAGE.get(modificationId);
        if (mappedUsage) {
          addInventoryUsage(perUnitUsage, mappedUsage.inventoryId, mappedUsage.quantityUsed);
        }
      }

      for (const [inventoryId, quantityPerItem] of perUnitUsage.entries()) {
        const requiredAmount = quantityPerItem * item.quantity;
        if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) continue;
        addInventoryUsage(inventoryDeductions, inventoryId, requiredAmount);
      }
    }

    if (inventoryDeductions.size > 0) {
      const inventoryIds = [...inventoryDeductions.keys()];
      const inventoryResult = await client.query(
        `SELECT inventory_id, quantity_available
         FROM inventory
         WHERE inventory_id = ANY($1::int[])
         FOR UPDATE`,
        [inventoryIds],
      );
      const inventoryAvailableMap = new Map(
        inventoryResult.rows.map((row) => [
          Number(row.inventory_id),
          Number(row.quantity_available || 0),
        ]),
      );

      for (const [inventoryId, requiredAmount] of inventoryDeductions.entries()) {
        const currentQty = inventoryAvailableMap.get(inventoryId);
        if (!Number.isFinite(currentQty)) continue;
        const deduction = Math.round(requiredAmount);
        if (deduction <= 0) continue;
        const nextQty = Math.max(0, currentQty - deduction);
        await client.query(
          `UPDATE inventory SET quantity_available = $1 WHERE inventory_id = $2`,
          [nextQty, inventoryId],
        );
      }
    }

    const finalTotal = itemTotal + tipAmount;

    const orderResult = await client.query(
      `INSERT INTO customer_order
       (order_id, order_date, total_cost, tip_amount, employee_id, payment_type, customer_id)
       VALUES (
         (SELECT COALESCE(MAX(order_id), 0) + 1 FROM customer_order),
         NOW(), $1, $2, $3, $4, $5
       )
       RETURNING order_id, order_date, total_cost, tip_amount, employee_id, payment_type, customer_id`,
      [finalTotal, tipAmount, employeeId, paymentType, customerId],
    );

    const order = orderResult.rows[0];

    for (const item of pricedItems) {
      const orderItemResult = await client.query(
        `INSERT INTO order_item (order_item_id, order_id, menu_item_id, quantity, item_price, comments)
         VALUES ((SELECT COALESCE(MAX(order_item_id), 0) + 1 FROM order_item), $1, $2, $3, $4, $5)
         RETURNING order_item_id`,
        [order.order_id, item.menuItemId, item.quantity, item.itemPrice, item.comments || null],
      );

      const orderItemId = orderItemResult.rows[0].order_item_id;
      for (const modId of item.modificationIds) {
        await client.query(
          `INSERT INTO order_item_modification (order_item_id, modification_type_id) VALUES ($1, $2)`,
          [orderItemId, modId],
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ order: { ...order, total_cost: Number(order.total_cost) } });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.get("/cashier/orders/today", async (req, res, next) => {
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

router.get("/orders/:id/status", async (req, res, next) => {
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

router.patch(
  "/orders/:id/status",
  requireAuth(["Manager", "Cashier"]),
  async (req, res, next) => {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const allowed = ["In Progress", "Ready", "Completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
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

export default router;
