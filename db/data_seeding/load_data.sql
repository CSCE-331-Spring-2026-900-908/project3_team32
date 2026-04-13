-- Project 2 Phase 2: Load Data from CSV Files
-- Team 32 - Bubble Tea Shop Database
-- Run this AFTER create_schema.sql

-- Note: Update file paths if needed based on where you run this from

\echo 'Loading employee data...'
\COPY employee (employee_id, name, position, hire_date) FROM 'data/employees.csv' WITH CSV HEADER;

\echo 'Loading inventory data...'
\COPY inventory FROM 'data/inventory.csv' WITH CSV HEADER;

\echo 'Loading menu items...'
\COPY menu_item FROM 'data/menu_items.csv' WITH CSV HEADER;

\echo 'Loading menu item inventory mappings...'
\COPY menu_item_inventory FROM 'data/menu_item_inventory.csv' WITH CSV HEADER;

\echo 'Loading modification types...'
\COPY modification_type FROM 'data/modification_types.csv' WITH CSV HEADER;

\echo 'Loading customer orders...'
\COPY customer_order (order_id, order_date, total_cost, employee_id) FROM 'data/customer_orders.csv' WITH CSV HEADER;

\echo 'Loading order items...'
\COPY order_item (order_item_id, order_id, menu_item_id, quantity, item_price) FROM 'data/order_items.csv' WITH CSV HEADER;

\echo 'Loading order item modifications...'
\COPY order_item_modification FROM 'data/order_item_modifications.csv' WITH CSV HEADER;

-- Verify data loaded
\echo ''
\echo '=== Data Loading Summary ==='
SELECT 'Employees' AS table_name, COUNT(*) AS row_count FROM employee
UNION ALL
SELECT 'Inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_item
UNION ALL
SELECT 'Menu-Inventory Mappings', COUNT(*) FROM menu_item_inventory
UNION ALL
SELECT 'Modification Types', COUNT(*) FROM modification_type
UNION ALL
SELECT 'Customer Orders', COUNT(*) FROM customer_order
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_item
UNION ALL
SELECT 'Order Item Modifications', COUNT(*) FROM order_item_modification;

\echo ''
\echo '=== Total Sales Verification ==='
SELECT 
    COUNT(*) AS total_orders,
    SUM(total_cost) AS total_sales,
    AVG(total_cost) AS avg_order_value,
    MIN(total_cost) AS min_order,
    MAX(total_cost) AS max_order
FROM customer_order;

\echo ''
\echo 'Data loading complete!'
