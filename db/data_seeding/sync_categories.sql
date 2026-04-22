-- script made to change categories from csv

-- Load CSV into a temp table
CREATE TEMP TABLE menu_item_import (
    menu_item_id INT,
    name VARCHAR(255),
    cost DECIMAL(10,2),
    category VARCHAR(50)
);
 
\COPY menu_item_import FROM 'data/menu_items.csv' WITH CSV HEADER;
 
-- Sync categories from the CSV
UPDATE menu_item m
SET category = i.category
FROM menu_item_import i
WHERE m.menu_item_id = i.menu_item_id;
 
-- Verify results
SELECT m.menu_item_id, m.name, m.category FROM menu_item m ORDER BY m.menu_item_id;
 
SELECT category, COUNT(*) as item_count FROM menu_item GROUP BY category ORDER BY category;