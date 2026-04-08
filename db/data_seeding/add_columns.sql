-- Add payment_type column to customer_order
ALTER TABLE customer_order ADD COLUMN payment_type VARCHAR(50);

-- Add comments column to order_item
ALTER TABLE order_item ADD COLUMN comments TEXT;

-- Verify the changes
SELECT 'customer_order columns:' as info;
\d customer_order

SELECT 'order_item columns:' as info;
\d order_item

SELECT 'Done! Columns added successfully.' as result;
