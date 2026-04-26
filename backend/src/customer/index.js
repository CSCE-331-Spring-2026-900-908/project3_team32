import { Router } from "express";
import pool from "../config/database.js";
import { signToken, requireAuth, verifyGoogleToken } from "../lib/auth.js";

const router = Router();

// ── Customer auth ─────────────────────────────────────────────────────────────

router.post("/auth/google/customer", async (req, res, next) => {
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

// ── Phone number login (new) ──────────────────────────────────────────────────

router.post("/auth/phone/customer", async (req, res, next) => {
  try {
    let { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }
    let result = await pool.query(
      "SELECT customer_id, name, email, phone FROM customer WHERE phone = $1",
      [cleanPhone]
    );
    let customer;
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO customer (name, email, phone, google_id)
         VALUES ($1, $2, $3, $4)
         RETURNING customer_id, name, email, phone`,
        [`Customer-${cleanPhone.slice(-4)}`, null, cleanPhone, `phone-${cleanPhone}`]
      );
      customer = result.rows[0];
    } else {
      customer = result.rows[0];
    }
    const token = signToken({
      type: "customer",
      customer_id: customer.customer_id,
      name: customer.name,
      email: customer.email,
      phone: cleanPhone
    });
    res.json({
      token,
      user: {
        id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: cleanPhone,
        type: "customer"
      }
    });
  } catch (err) {
    console.error("Phone login error:", err);
    next(err);
  }
});

router.post("/auth/guest/customer", async (req, res) => {
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

// ── Customer routes ────────────────────────────────────────────────────────────

router.get("/customer/orders", requireAuth(), async (req, res, next) => {
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

router.get("/customer/most-ordered", requireAuth(), async (req, res, next) => {
  const customerId = req.user?.customer_id;
  if (!customerId) {
    return res.status(401).json({ error: "Customer account required" });
  }
  try {
    const result = await pool.query(
      `SELECT m.menu_item_id, m.name, m.cost, m.category, SUM(oi.quantity) as order_count
       FROM customer_order co
       JOIN order_item oi ON co.order_id = oi.order_id
       JOIN menu_item m ON oi.menu_item_id = m.menu_item_id
       WHERE co.customer_id = $1
       GROUP BY m.menu_item_id, m.name, m.cost, m.category
       ORDER BY order_count DESC
       LIMIT 12`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Most Ordered SQL Error:", error.message);
    res.json([]);
  }
});

router.get("/customer/saved-favorites", requireAuth(), async (req, res, next) => {
  const customerId = req.user?.customer_id;
  if (!customerId) {
    return res.status(401).json({ error: "Customer account required" });
  }
  try {
    const result = await pool.query(
      `SELECT f.favorite_id, f.item_data
       FROM customer_favorite f
       WHERE f.customer_id = $1
       ORDER BY f.favorite_id DESC`,
      [customerId]
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
});

router.post("/customer/saved-favorites", requireAuth(), async (req, res, next) => {
  const customerId = req.user?.customer_id;
  if (!customerId) {
    return res.status(401).json({ error: "Customer account required" });
  }
  const itemDataStr = JSON.stringify(req.body.item_data || {});
  try {
    const favRes = await pool.query(
      `INSERT INTO customer_favorite (customer_id, item_data) VALUES ($1, $2) RETURNING favorite_id`,
      [customerId, itemDataStr]
    );
    res.json({ favorite_id: favRes.rows[0].favorite_id });
  } catch (err) {
    console.error("Failed to save favorite:", err.message);
    res.status(500).json({ error: "Failed to save favorite" });
  }
});

router.delete("/customer/saved-favorites/:id", requireAuth(), async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM customer_favorite WHERE favorite_id = $1`, [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete favorite:", err.message);
    res.status(500).json({ error: "Failed to delete favorite" });
  }
});

export default router;