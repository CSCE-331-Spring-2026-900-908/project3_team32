-- Adds employee auth columns used by Google employee login and PIN login.
ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS employee_pin VARCHAR(4);

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
