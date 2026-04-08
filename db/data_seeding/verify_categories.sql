-- Verify category distribution matches our buttons
-- Expected categories: Milk Tea, Fruit Tea, Smoothies, Lattes, Specialty

-- Show items by category
SELECT 
    category,
    menu_item_id,
    name,
    cost
FROM menu_item
ORDER BY category, name;

-- Count by category
SELECT 
    category,
    COUNT(*) as item_count
FROM menu_item
GROUP BY category
ORDER BY category;

-- Expected results:
-- Milk Tea: ~14 items (Classic, Taro, Matcha, Thai, Brown Sugar, Oolong, Honey, Strawberry, Coconut, Almond, etc.)
-- Fruit Tea: ~4 items (Mango Green Tea, Passion Fruit Green Tea, Lychee Black Tea, Peach Oolong Tea)
-- Smoothies: 2 items (Strawberry, Mango)
-- Lattes: 2 items (Matcha Latte, Oat Milk Latte)
-- Specialty: Any remaining items
