-- Add category column to menu_item table
ALTER TABLE menu_item ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Categorize items based on actual menu data
UPDATE menu_item SET category = 'Milk Tea' 
WHERE name LIKE '%Milk Tea%' OR name LIKE '%Boba Milk%';

UPDATE menu_item SET category = 'Fruit Tea' 
WHERE name LIKE '%Mango%' OR name LIKE '%Passion Fruit%' 
   OR name LIKE '%Lychee%' OR name LIKE '%Peach%'
   OR (name LIKE '%Green Tea%' AND name NOT LIKE '%Milk%')
   OR (name LIKE '%Black Tea%' AND name NOT LIKE '%Milk%')
   OR (name LIKE '%Oolong%' AND name NOT LIKE '%Milk%');

UPDATE menu_item SET category = 'Smoothies' 
WHERE name LIKE '%Smoothie%';

UPDATE menu_item SET category = 'Lattes' 
WHERE name LIKE '%Latte%';

UPDATE menu_item SET category = 'Specialty' 
WHERE category IS NULL;

-- Verify the categorization
SELECT category, COUNT(*) as item_count 
FROM menu_item 
GROUP BY category 
ORDER BY category;

-- Show all items with their categories
SELECT menu_item_id, name, category, cost 
FROM menu_item 
ORDER BY category, name;
