import pool from "../config/database.js";

export async function initSchema() {
  await pool.query(`
    ALTER TABLE customer_order
    ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0
  `).catch((err) => {
    console.error("Failed to add tip_amount column:", err.message);
  });

  await pool.query(
    "ALTER TABLE employee ADD COLUMN IF NOT EXISTS google_email VARCHAR(255)",
  ).catch((err) => console.error("schema error:", err.message));

  await pool.query(
    "ALTER TABLE employee ADD COLUMN IF NOT EXISTS employee_pin VARCHAR(4)",
  ).catch((err) => console.error("schema error:", err.message));

  await pool.query(`
    DO $$
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
    END $$;
  `).catch((err) => console.error("schema error:", err.message));
}
