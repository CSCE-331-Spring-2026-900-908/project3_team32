-- Seasonal drinks migration
-- Safe to run at any time: reads current MAX(menu_item_id) and offsets from it.
-- Only INSERTs new rows — does not touch any existing items.

BEGIN;

WITH base AS (
  SELECT COALESCE(MAX(menu_item_id), 0) AS max_id FROM menu_item
)
INSERT INTO menu_item (menu_item_id, name, cost, category)
SELECT base.max_id + 1, 'Cherry Blossom Milk Tea',      6.25, 'Seasonal' FROM base
UNION ALL
SELECT base.max_id + 2, 'Mango Passion Fruit Tea',       6.25, 'Seasonal' FROM base
UNION ALL
SELECT base.max_id + 3, 'Strawberry Lychee Lemonade',    6.50, 'Seasonal' FROM base
UNION ALL
SELECT base.max_id + 4, 'Brown Sugar Taro Milk Tea',     6.50, 'Seasonal' FROM base;

-- Link each new item to cups and lids (inventory_id 40 = medium cup, 42 = medium lid).
-- Large size swap (ids 41, 43) is handled automatically by the order system.
WITH base AS (
  SELECT COALESCE(MAX(menu_item_id), 0) - 3 AS first_id FROM menu_item
)
INSERT INTO menu_item_inventory (menu_item_id, inventory_id, quantity_used)
SELECT first_id + offset_val, inv_id, 1
FROM base,
  (VALUES (0, 40), (0, 42),
          (1, 40), (1, 42),
          (2, 40), (2, 42),
          (3, 40), (3, 42)) AS t(offset_val, inv_id);

COMMIT;
