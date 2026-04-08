-- Fix existing orders that have NULL payment_type
-- This assigns random payment types to existing orders for testing

UPDATE customer_order
SET payment_type = CASE 
    WHEN order_id % 3 = 0 THEN 'CASH'
    WHEN order_id % 3 = 1 THEN 'CARD'
    ELSE 'GIFT CARD'
END
WHERE payment_type IS NULL;

-- Verify the update
SELECT payment_type, COUNT(*) as count, SUM(total_cost) as total
FROM customer_order
GROUP BY payment_type
ORDER BY count DESC;
