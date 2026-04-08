-- Verification script to check data after loading
-- Run this after load_data.sql to verify everything is correct

\echo '========================================='
\echo 'Phase 2 Data Verification'
\echo 'Team 32 - Bubble Tea Shop'
\echo '========================================='
\echo ''

-- Check all tables exist
\echo '1. Checking tables exist...'
\dt

\echo ''
\echo '2. Row counts per table:'
SELECT 'employee' AS table_name, COUNT(*) AS rows FROM employee
UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL SELECT 'menu_item', COUNT(*) FROM menu_item
UNION ALL SELECT 'menu_item_inventory', COUNT(*) FROM menu_item_inventory
UNION ALL SELECT 'modification_type', COUNT(*) FROM modification_type
UNION ALL SELECT 'customer_order', COUNT(*) FROM customer_order
UNION ALL SELECT 'order_item', COUNT(*) FROM order_item
UNION ALL SELECT 'order_item_modification', COUNT(*) FROM order_item_modification
ORDER BY table_name;

\echo ''
\echo '3. Sales Summary:'
SELECT 
    COUNT(*) AS total_orders,
    TO_CHAR(SUM(total_cost), '$999,999,999.99') AS total_sales,
    TO_CHAR(AVG(total_cost), '$999.99') AS avg_order,
    TO_CHAR(MIN(total_cost), '$999.99') AS min_order,
    TO_CHAR(MAX(total_cost), '$999.99') AS max_order
FROM customer_order;

\echo ''
\echo '4. Date Range:'
SELECT 
    MIN(order_date)::date AS first_order,
    MAX(order_date)::date AS last_order,
    EXTRACT(DAYS FROM (MAX(order_date) - MIN(order_date))) AS days_span,
    ROUND(EXTRACT(DAYS FROM (MAX(order_date) - MIN(order_date))) / 7.0, 1) AS weeks_span
FROM customer_order;

\echo ''
\echo '5. Peak Days Check (Top 10 days by sales):'
SELECT 
    order_date::date AS date,
    TO_CHAR(order_date, 'Day') AS day_of_week,
    COUNT(*) AS orders,
    TO_CHAR(SUM(total_cost), '$999,999.99') AS daily_sales
FROM customer_order
GROUP BY order_date::date
ORDER BY SUM(total_cost) DESC
LIMIT 10;

\echo ''
\echo '6. Menu Items Check:'
SELECT 
    COUNT(*) AS total_menu_items,
    TO_CHAR(MIN(cost), '$999.99') AS min_price,
    TO_CHAR(MAX(cost), '$999.99') AS max_price,
    TO_CHAR(AVG(cost), '$999.99') AS avg_price
FROM menu_item;

\echo ''
\echo '7. Employee Order Distribution:'
SELECT 
    e.name,
    e.position,
    COUNT(co.order_id) AS orders_taken,
    TO_CHAR(SUM(co.total_cost), '$999,999.99') AS total_sales
FROM employee e
LEFT JOIN customer_order co ON e.employee_id = co.employee_id
GROUP BY e.employee_id, e.name, e.position
ORDER BY COUNT(co.order_id) DESC;

\echo ''
\echo '8. Hourly Order Pattern:'
SELECT 
    EXTRACT(HOUR FROM order_date) AS hour,
    COUNT(*) AS orders,
    TO_CHAR(SUM(total_cost), '$999,999.99') AS sales
FROM customer_order
GROUP BY EXTRACT(HOUR FROM order_date)
ORDER BY hour;

\echo ''
\echo '========================================='
\echo 'Verification Complete!'
\echo '========================================='
\echo ''
\echo 'Requirements Check (Team of 5):'
\echo '  ✓ 52 weeks of data? (should be ~52 weeks)'
\echo '  ✓ ~$1M in sales? (should be close to $1,000,000)'
\echo '  ✓ 3 peak days? (check top 10 days above)'
\echo '  ✓ 20+ menu items? (should be 22)'
\echo ''
