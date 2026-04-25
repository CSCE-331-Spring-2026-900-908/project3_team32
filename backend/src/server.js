import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database.js";
import { initSchema } from "./lib/schema.js";
import { signToken } from "./lib/auth.js";
import menuRouter from "./menu/index.js";
import customerRouter from "./customer/index.js";
import cashierRouter from "./cashier/index.js";
import managerRouter from "./manager/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

await initSchema();

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

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "healthy", database: "connected", timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", database: "disconnected", error: error.message });
  }
});

app.get("/api", (req, res) => {
  res.json({ message: "Sharetea POS API" });
});

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

app.use("/api", menuRouter);
app.use("/api", customerRouter);
app.use("/api", cashierRouter);
app.use("/api", managerRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
