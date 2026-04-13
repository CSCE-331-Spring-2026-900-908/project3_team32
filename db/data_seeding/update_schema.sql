-- Add payment_type to customer_order table
ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50);

-- Add comments to order_item table
ALTER TABLE order_item ADD COLUMN IF NOT EXISTS comments TEXT;

-- Verify changes
\d customer_order
\d order_item
