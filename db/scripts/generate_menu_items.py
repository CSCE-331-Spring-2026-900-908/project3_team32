#!/usr/bin/env python3
"""
Generate menu items and their inventory mappings
Based on the Sharetea menu with the following categories:
  - Milky Series (items 1-10)
  - Fresh Brew (items 11-12)
  - Fruity Beverage (items 13-18)
  - Non-Caffeinated (items 19-26)
  - New Matcha Series (items 27-31)
  - Ice-Blended (items 32-39)
"""
import csv
import os

def generate_menu_items():
    """Generate menu items with costs and categories, grouped by Sharetea menu series.

    Categories:
      Milk Tea    – classic milk tea drinks
      Fruit Tea   – fruit-forward tea drinks
      Fresh Brew  – plain brewed teas (no milk, no fruit blend)
      Matcha      – matcha fresh milk drinks (non-blended)
      Ice Blended – blended/frozen drinks
      Specialty   – signature drinks that don't fit the above
    """

    # (menu_item_id, name, cost, category)
    menu_items = [
        # ── MILK TEA ──────────────────────────────────────────────────────────
        (1,  'Classic Pearl Milk Tea',                  6.25, 'Milk Tea'),
        (2,  'Honey Pearl Milk Tea',                    6.50, 'Milk Tea'),
        (4,  'Coffee Milk Tea w/ Coffee Jelly',         6.75, 'Milk Tea'),
        (5,  'Hokkaido Pearl Milk Tea',                 6.50, 'Milk Tea'),
        (6,  'Thai Pearl Milk Tea',                     6.25, 'Milk Tea'),
        (7,  'Taro Pearl Milk Tea',                     6.50, 'Milk Tea'),
        (10, 'Coconut Pearl Milk Tea',                  6.50, 'Milk Tea'),
        (27, 'Matcha Pearl Milk Tea',                   6.75, 'Milk Tea'),

        # ── FRUIT TEA ─────────────────────────────────────────────────────────
        (8,  'Mango Green Milk Tea',                    6.50, 'Fruit Tea'),
        (13, 'Mango Green Tea',                         6.25, 'Fruit Tea'),
        (15, 'Berry Lychee Burst',                      6.50, 'Fruit Tea'),
        (16, 'Peach Tea w/ Honey Jelly',                6.50, 'Fruit Tea'),
        (17, 'Mango & Passion Fruit Tea',               6.25, 'Fruit Tea'),
        (30, 'Mango Matcha Fresh Milk',                 7.00, 'Fruit Tea'),
        (36, 'Mango w/ Ice Cream',                      7.50, 'Fruit Tea'),
        (37, 'Strawberry w/ Lychee Jelly & Ice Cream',  7.75, 'Fruit Tea'),
        (38, 'Peach Tea w/ Lychee Jelly',               7.00, 'Fruit Tea'),

        # ── FRESH BREW ────────────────────────────────────────────────────────
        (11, 'Classic Tea',                             5.25, 'Fresh Brew'),
        (12, 'Honey Tea',                               5.50, 'Fresh Brew'),

        # ── MATCHA ────────────────────────────────────────────────────────────
        (28, 'Matcha Fresh Milk',                       6.50, 'Matcha'),
        (29, 'Strawberry Matcha Fresh Milk',            7.00, 'Matcha'),

        # ── ICE BLENDED ───────────────────────────────────────────────────────
        (21, 'Strawberry Coconut Ice Blended',          7.25, 'Ice Blended'),
        (23, 'Halo Halo Ice Blended',                   7.75, 'Ice Blended'),
        (25, 'Wintermelon Lemonade Ice Blended',        6.25, 'Ice Blended'),
        (31, 'Matcha Ice Blended',                      7.25, 'Ice Blended'),
        (32, 'Oreo w/ Pearl',                           7.25, 'Ice Blended'),
        (33, 'Taro w/ Pudding',                         7.25, 'Ice Blended'),
        (34, 'Thai Tea w/ Pearl',                       7.00, 'Ice Blended'),
        (35, 'Coffee w/ Ice Cream',                     7.50, 'Ice Blended'),
        (39, 'Lava Flow',                               7.75, 'Ice Blended'),

        # ── SPECIALTY ─────────────────────────────────────────────────────────
        (3,  'Coffee Creama',                           6.25, 'Specialty'),
        (9,  'Golden Retriever',                        6.75, 'Specialty'),
        (14, 'Passion Chess',                           6.25, 'Specialty'),
        (18, 'Honey Lemonade',                          5.75, 'Specialty'),
        (19, 'Tiger Boba',                              6.75, 'Specialty'),
        (20, 'Strawberry Coconut',                      6.75, 'Specialty'),
        (22, 'Halo Halo',                               7.50, 'Specialty'),
        (24, 'Wintermelon Lemonade',                    5.75, 'Specialty'),
        (26, 'Wintermelon w/ Fresh Milk',               6.25, 'Specialty'),
    ]

    # Sort by menu_item_id for clean CSV output
    menu_items = sorted(menu_items, key=lambda x: x[0])

    os.makedirs('data', exist_ok=True)

    with open('data/menu_items.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['menu_item_id', 'name', 'cost', 'category'])
        writer.writerows(menu_items)

    from collections import Counter
    counts = Counter(row[3] for row in menu_items)
    print(f"✓ Generated {len(menu_items)} menu items → data/menu_items.csv")
    for cat in ['Milk Tea', 'Fruit Tea', 'Fresh Brew', 'Matcha', 'Ice Blended', 'Specialty']:
        print(f"    {cat}: {counts.get(cat, 0)} items")

    # ── INVENTORY MAPPINGS ────────────────────────────────────────────────────
    # Format: (menu_item_id, inventory_id, quantity_used)
    #
    # Inventory ID reference:
    #  1  = Black Tea Base          21 = Berry Mix
    #  2  = Green Tea Base          22 = Coconut Cream
    #  3  = Thai Tea Base           23 = Lemon Juice
    #  4  = Oolong Tea Base         24 = Tapioca Pearls
    #  5  = Coffee Base             25 = Crystal Boba
    #  6  = Whole Milk              26 = Popping Boba - Strawberry
    #  7  = Oat Milk                27 = Popping Boba - Mango
    #  8  = Coconut Milk            28 = Honey Jelly
    #  9  = Hokkaido Creamer        29 = Lychee Jelly
    # 10  = Non-Dairy Creamer       30 = Coffee Jelly
    # 11  = Condensed Milk          31 = Pudding
    # 12  = Simple Syrup            32 = Ice Cream
    # 13  = Brown Sugar Syrup       33 = Crema (Milk Foam)
    # 14  = Honey                   34 = Taro Powder
    # 15  = Peach Syrup             35 = Matcha Powder
    # 16  = Lychee Syrup            36 = Oreo Crumbles
    # 17  = Wintermelon Syrup       37 = Halo Halo Mix
    # 18  = Passion Fruit Syrup     38 = Ice
    # 19  = Strawberry Puree        39 = Filtered Water
    # 20  = Mango Puree             40 = Medium Cups (16oz)
    #                               41 = Large Cups (24oz)
    #                               42 = Plastic Lids - Medium
    #                               43 = Plastic Lids - Large
    #                               44 = Wide Straws
    #                               45 = Regular Straws
    #                               46 = Napkins
    #                               47 = Plastic Bags
    #                               48 = Cup Sleeves

    mappings = [
        # ── MILKY SERIES ─────────────────────────────────────────────────────

        # Classic Pearl Milk Tea (1) - black tea, milk, syrup, pearls
        (1, 1,  1.0),  # Black tea base
        (1, 6,  1.0),  # Whole milk
        (1, 12, 1.0),  # Simple syrup
        (1, 24, 1.0),  # Tapioca pearls
        (1, 38, 1.0),  # Ice
        (1, 40, 1.0),  # Medium cup
        (1, 42, 1.0),  # Medium lid
        (1, 44, 1.0),  # Wide straw
        (1, 46, 1.0),  # Napkin

        # Honey Pearl Milk Tea (2) - black tea, milk, honey, pearls
        (2, 1,  1.0),  # Black tea base
        (2, 6,  1.0),  # Whole milk
        (2, 14, 1.0),  # Honey
        (2, 24, 1.0),  # Tapioca pearls
        (2, 38, 1.0),  # Ice
        (2, 40, 1.0),  # Medium cup
        (2, 42, 1.0),  # Medium lid
        (2, 44, 1.0),  # Wide straw
        (2, 46, 1.0),  # Napkin

        # Coffee Creama (3) - coffee base, non-dairy creamer, crema topping
        (3, 5,  1.0),  # Coffee base
        (3, 10, 1.0),  # Non-dairy creamer
        (3, 12, 1.0),  # Simple syrup
        (3, 33, 1.0),  # Crema (milk foam)
        (3, 38, 1.0),  # Ice
        (3, 40, 1.0),  # Medium cup
        (3, 42, 1.0),  # Medium lid
        (3, 45, 1.0),  # Regular straw
        (3, 46, 1.0),  # Napkin

        # Coffee Milk Tea w/ Coffee Jelly (4) - coffee base, milk, coffee jelly
        (4, 5,  1.0),  # Coffee base
        (4, 6,  1.0),  # Whole milk
        (4, 30, 1.0),  # Coffee jelly
        (4, 12, 1.0),  # Simple syrup
        (4, 38, 1.0),  # Ice
        (4, 40, 1.0),  # Medium cup
        (4, 42, 1.0),  # Medium lid
        (4, 44, 1.0),  # Wide straw
        (4, 46, 1.0),  # Napkin

        # Hokkaido Pearl Milk Tea (5) - black tea, hokkaido creamer, pearls
        (5, 1,  1.0),  # Black tea base
        (5, 9,  1.0),  # Hokkaido creamer
        (5, 24, 1.0),  # Tapioca pearls
        (5, 12, 1.0),  # Simple syrup
        (5, 38, 1.0),  # Ice
        (5, 40, 1.0),  # Medium cup
        (5, 42, 1.0),  # Medium lid
        (5, 44, 1.0),  # Wide straw
        (5, 46, 1.0),  # Napkin

        # Thai Pearl Milk Tea (6) - thai tea, non-dairy creamer, pearls
        (6, 3,  1.0),  # Thai tea base
        (6, 10, 1.0),  # Non-dairy creamer
        (6, 24, 1.0),  # Tapioca pearls
        (6, 12, 1.0),  # Simple syrup
        (6, 38, 1.0),  # Ice
        (6, 40, 1.0),  # Medium cup
        (6, 42, 1.0),  # Medium lid
        (6, 44, 1.0),  # Wide straw
        (6, 46, 1.0),  # Napkin

        # Taro Pearl Milk Tea (7) - black tea, milk, taro powder, pearls
        (7, 1,  1.0),  # Black tea base
        (7, 6,  1.0),  # Whole milk
        (7, 34, 1.0),  # Taro powder
        (7, 24, 1.0),  # Tapioca pearls
        (7, 38, 1.0),  # Ice
        (7, 40, 1.0),  # Medium cup
        (7, 42, 1.0),  # Medium lid
        (7, 44, 1.0),  # Wide straw
        (7, 46, 1.0),  # Napkin

        # Mango Green Milk Tea (8) - green tea, milk, mango puree
        (8, 2,  1.0),  # Green tea base
        (8, 6,  1.0),  # Whole milk
        (8, 20, 1.0),  # Mango puree
        (8, 12, 1.0),  # Simple syrup
        (8, 38, 1.0),  # Ice
        (8, 40, 1.0),  # Medium cup
        (8, 42, 1.0),  # Medium lid
        (8, 44, 1.0),  # Wide straw
        (8, 46, 1.0),  # Napkin

        # Golden Retriever (9) - black tea, milk, brown sugar syrup, pearls
        (9, 1,  1.0),  # Black tea base
        (9, 6,  1.0),  # Whole milk
        (9, 13, 1.0),  # Brown sugar syrup
        (9, 24, 1.0),  # Tapioca pearls
        (9, 38, 1.0),  # Ice
        (9, 40, 1.0),  # Medium cup
        (9, 42, 1.0),  # Medium lid
        (9, 44, 1.0),  # Wide straw
        (9, 46, 1.0),  # Napkin

        # Coconut Pearl Milk Tea (10) - black tea, coconut milk, pearls
        (10, 1,  1.0), # Black tea base
        (10, 8,  1.0), # Coconut milk
        (10, 24, 1.0), # Tapioca pearls
        (10, 12, 1.0), # Simple syrup
        (10, 38, 1.0), # Ice
        (10, 40, 1.0), # Medium cup
        (10, 42, 1.0), # Medium lid
        (10, 44, 1.0), # Wide straw
        (10, 46, 1.0), # Napkin

        # ── FRESH BREW ────────────────────────────────────────────────────────

        # Classic Tea (11) - brewed black tea, light syrup
        (11, 1,  1.0), # Black tea base
        (11, 12, 0.5), # Simple syrup (light)
        (11, 38, 1.0), # Ice
        (11, 40, 1.0), # Medium cup
        (11, 42, 1.0), # Medium lid
        (11, 45, 1.0), # Regular straw
        (11, 46, 1.0), # Napkin

        # Honey Tea (12) - brewed black tea, honey
        (12, 1,  1.0), # Black tea base
        (12, 14, 1.0), # Honey
        (12, 38, 1.0), # Ice
        (12, 40, 1.0), # Medium cup
        (12, 42, 1.0), # Medium lid
        (12, 45, 1.0), # Regular straw
        (12, 46, 1.0), # Napkin

        # ── FRUITY BEVERAGE ───────────────────────────────────────────────────

        # Mango Green Tea (13) - green tea, mango puree, syrup
        (13, 2,  1.0), # Green tea base
        (13, 20, 1.0), # Mango puree
        (13, 12, 1.0), # Simple syrup
        (13, 38, 1.0), # Ice
        (13, 40, 1.0), # Medium cup
        (13, 42, 1.0), # Medium lid
        (13, 45, 1.0), # Regular straw
        (13, 46, 1.0), # Napkin

        # Passion Chess (14) - green tea, passion fruit syrup
        (14, 2,  1.0), # Green tea base
        (14, 18, 1.0), # Passion fruit syrup
        (14, 12, 1.0), # Simple syrup
        (14, 38, 1.0), # Ice
        (14, 40, 1.0), # Medium cup
        (14, 42, 1.0), # Medium lid
        (14, 45, 1.0), # Regular straw
        (14, 46, 1.0), # Napkin

        # Berry Lychee Burst (15) - black tea, berry mix, lychee syrup
        (15, 1,  1.0), # Black tea base
        (15, 21, 1.0), # Berry mix
        (15, 16, 1.0), # Lychee syrup
        (15, 38, 1.0), # Ice
        (15, 40, 1.0), # Medium cup
        (15, 42, 1.0), # Medium lid
        (15, 45, 1.0), # Regular straw
        (15, 46, 1.0), # Napkin

        # Peach Tea w/ Honey Jelly (16) - black tea, peach syrup, honey jelly
        (16, 1,  1.0), # Black tea base
        (16, 15, 1.0), # Peach syrup
        (16, 28, 1.0), # Honey jelly
        (16, 12, 1.0), # Simple syrup
        (16, 38, 1.0), # Ice
        (16, 40, 1.0), # Medium cup
        (16, 42, 1.0), # Medium lid
        (16, 44, 1.0), # Wide straw
        (16, 46, 1.0), # Napkin

        # Mango & Passion Fruit Tea (17) - green tea, mango puree, passion fruit syrup
        (17, 2,  1.0), # Green tea base
        (17, 20, 1.0), # Mango puree
        (17, 18, 1.0), # Passion fruit syrup
        (17, 38, 1.0), # Ice
        (17, 40, 1.0), # Medium cup
        (17, 42, 1.0), # Medium lid
        (17, 45, 1.0), # Regular straw
        (17, 46, 1.0), # Napkin

        # Honey Lemonade (18) - lemon juice, honey, water
        (18, 23, 1.0), # Lemon juice
        (18, 14, 1.0), # Honey
        (18, 39, 1.0), # Filtered water
        (18, 38, 1.0), # Ice
        (18, 40, 1.0), # Medium cup
        (18, 42, 1.0), # Medium lid
        (18, 45, 1.0), # Regular straw
        (18, 46, 1.0), # Napkin

        # ── NON-CAFFEINATED ───────────────────────────────────────────────────

        # Tiger Boba (19) - coconut milk, brown sugar syrup, tapioca pearls
        (19, 8,  1.0), # Coconut milk
        (19, 13, 1.0), # Brown sugar syrup
        (19, 24, 1.0), # Tapioca pearls
        (19, 38, 1.0), # Ice
        (19, 40, 1.0), # Medium cup
        (19, 42, 1.0), # Medium lid
        (19, 44, 1.0), # Wide straw
        (19, 46, 1.0), # Napkin

        # Strawberry Coconut (20) - coconut milk, strawberry puree, coconut cream
        (20, 8,  1.0), # Coconut milk
        (20, 19, 1.0), # Strawberry puree
        (20, 22, 1.0), # Coconut cream
        (20, 38, 1.0), # Ice
        (20, 40, 1.0), # Medium cup
        (20, 42, 1.0), # Medium lid
        (20, 45, 1.0), # Regular straw
        (20, 46, 1.0), # Napkin

        # Strawberry Coconut Ice Blended (21) - blended version of #20
        (21, 8,  1.0), # Coconut milk
        (21, 19, 1.5), # Strawberry puree (extra for blending)
        (21, 22, 1.0), # Coconut cream
        (21, 38, 2.0), # Ice (extra for blending)
        (21, 41, 1.0), # Large cup
        (21, 43, 1.0), # Large lid
        (21, 45, 1.0), # Regular straw
        (21, 46, 1.0), # Napkin

        # Halo Halo (22) - halo halo mix, milk, ice cream, shaved ice
        (22, 37, 1.0), # Halo halo mix
        (22, 6,  1.0), # Whole milk
        (22, 32, 1.0), # Ice cream
        (22, 38, 2.0), # Ice (shaved)
        (22, 41, 1.0), # Large cup
        (22, 43, 1.0), # Large lid
        (22, 44, 1.0), # Wide straw
        (22, 46, 1.0), # Napkin

        # Halo Halo Ice Blended (23) - blended version of #22
        (23, 37, 1.0), # Halo halo mix
        (23, 6,  1.0), # Whole milk
        (23, 32, 1.0), # Ice cream
        (23, 38, 2.0), # Ice
        (23, 41, 1.0), # Large cup
        (23, 43, 1.0), # Large lid
        (23, 44, 1.0), # Wide straw
        (23, 46, 1.0), # Napkin

        # Wintermelon Lemonade (24) - wintermelon syrup, lemon juice, water
        (24, 17, 1.0), # Wintermelon syrup
        (24, 23, 1.0), # Lemon juice
        (24, 39, 1.0), # Filtered water
        (24, 38, 1.0), # Ice
        (24, 40, 1.0), # Medium cup
        (24, 42, 1.0), # Medium lid
        (24, 45, 1.0), # Regular straw
        (24, 46, 1.0), # Napkin

        # Wintermelon Lemonade Ice Blended (25) - blended version of #24
        (25, 17, 1.0), # Wintermelon syrup
        (25, 23, 1.0), # Lemon juice
        (25, 39, 1.0), # Filtered water
        (25, 38, 2.0), # Ice
        (25, 41, 1.0), # Large cup
        (25, 43, 1.0), # Large lid
        (25, 45, 1.0), # Regular straw
        (25, 46, 1.0), # Napkin

        # Wintermelon w/ Fresh Milk (26) - wintermelon syrup, whole milk
        (26, 17, 1.0), # Wintermelon syrup
        (26, 6,  1.0), # Whole milk
        (26, 38, 1.0), # Ice
        (26, 40, 1.0), # Medium cup
        (26, 42, 1.0), # Medium lid
        (26, 45, 1.0), # Regular straw
        (26, 46, 1.0), # Napkin

        # ── NEW MATCHA SERIES ─────────────────────────────────────────────────

        # Matcha Pearl Milk Tea (27) - matcha powder, milk, pearls
        (27, 35, 1.0), # Matcha powder
        (27, 6,  1.0), # Whole milk
        (27, 24, 1.0), # Tapioca pearls
        (27, 12, 1.0), # Simple syrup
        (27, 38, 1.0), # Ice
        (27, 40, 1.0), # Medium cup
        (27, 42, 1.0), # Medium lid
        (27, 44, 1.0), # Wide straw
        (27, 46, 1.0), # Napkin

        # Matcha Fresh Milk (28) - matcha powder, whole milk
        (28, 35, 1.0), # Matcha powder
        (28, 6,  1.0), # Whole milk
        (28, 12, 1.0), # Simple syrup
        (28, 38, 1.0), # Ice
        (28, 40, 1.0), # Medium cup
        (28, 42, 1.0), # Medium lid
        (28, 45, 1.0), # Regular straw
        (28, 46, 1.0), # Napkin

        # Strawberry Matcha Fresh Milk (29) - matcha, strawberry puree, milk
        (29, 35, 1.0), # Matcha powder
        (29, 19, 1.0), # Strawberry puree
        (29, 6,  1.0), # Whole milk
        (29, 12, 1.0), # Simple syrup
        (29, 38, 1.0), # Ice
        (29, 40, 1.0), # Medium cup
        (29, 42, 1.0), # Medium lid
        (29, 45, 1.0), # Regular straw
        (29, 46, 1.0), # Napkin

        # Mango Matcha Fresh Milk (30) - matcha, mango puree, milk
        (30, 35, 1.0), # Matcha powder
        (30, 20, 1.0), # Mango puree
        (30, 6,  1.0), # Whole milk
        (30, 12, 1.0), # Simple syrup
        (30, 38, 1.0), # Ice
        (30, 40, 1.0), # Medium cup
        (30, 42, 1.0), # Medium lid
        (30, 45, 1.0), # Regular straw
        (30, 46, 1.0), # Napkin

        # Matcha Ice Blended (31) - blended matcha, milk, ice
        (31, 35, 1.5), # Matcha powder (extra for blending)
        (31, 6,  1.0), # Whole milk
        (31, 12, 1.0), # Simple syrup
        (31, 38, 2.0), # Ice
        (31, 41, 1.0), # Large cup
        (31, 43, 1.0), # Large lid
        (31, 45, 1.0), # Regular straw
        (31, 46, 1.0), # Napkin

        # ── ICE-BLENDED ───────────────────────────────────────────────────────

        # Oreo w/ Pearl (32) - oreo crumbles, milk, tapioca pearls, blended
        (32, 36, 1.0), # Oreo crumbles
        (32, 6,  1.0), # Whole milk
        (32, 24, 1.0), # Tapioca pearls
        (32, 12, 1.0), # Simple syrup
        (32, 38, 2.0), # Ice
        (32, 41, 1.0), # Large cup
        (32, 43, 1.0), # Large lid
        (32, 44, 1.0), # Wide straw
        (32, 46, 1.0), # Napkin

        # Taro w/ Pudding (33) - taro powder, milk, pudding, blended
        (33, 34, 1.0), # Taro powder
        (33, 6,  1.0), # Whole milk
        (33, 31, 1.0), # Pudding
        (33, 12, 1.0), # Simple syrup
        (33, 38, 2.0), # Ice
        (33, 41, 1.0), # Large cup
        (33, 43, 1.0), # Large lid
        (33, 44, 1.0), # Wide straw
        (33, 46, 1.0), # Napkin

        # Thai Tea w/ Pearl (34) - thai tea, non-dairy creamer, pearls, blended
        (34, 3,  1.0), # Thai tea base
        (34, 10, 1.0), # Non-dairy creamer
        (34, 24, 1.0), # Tapioca pearls
        (34, 12, 1.0), # Simple syrup
        (34, 38, 2.0), # Ice
        (34, 41, 1.0), # Large cup
        (34, 43, 1.0), # Large lid
        (34, 44, 1.0), # Wide straw
        (34, 46, 1.0), # Napkin

        # Coffee w/ Ice Cream (35) - coffee base, milk, ice cream, blended
        (35, 5,  1.0), # Coffee base
        (35, 6,  1.0), # Whole milk
        (35, 32, 1.0), # Ice cream
        (35, 12, 1.0), # Simple syrup
        (35, 38, 2.0), # Ice
        (35, 41, 1.0), # Large cup
        (35, 43, 1.0), # Large lid
        (35, 45, 1.0), # Regular straw
        (35, 46, 1.0), # Napkin

        # Mango w/ Ice Cream (36) - mango puree, milk, ice cream, blended
        (36, 20, 1.5), # Mango puree
        (36, 6,  1.0), # Whole milk
        (36, 32, 1.0), # Ice cream
        (36, 38, 2.0), # Ice
        (36, 41, 1.0), # Large cup
        (36, 43, 1.0), # Large lid
        (36, 45, 1.0), # Regular straw
        (36, 46, 1.0), # Napkin

        # Strawberry w/ Lychee Jelly & Ice Cream (37) - strawberry puree, lychee jelly, ice cream, blended
        (37, 19, 1.5), # Strawberry puree
        (37, 29, 1.0), # Lychee jelly
        (37, 32, 1.0), # Ice cream
        (37, 6,  1.0), # Whole milk
        (37, 38, 2.0), # Ice
        (37, 41, 1.0), # Large cup
        (37, 43, 1.0), # Large lid
        (37, 44, 1.0), # Wide straw
        (37, 46, 1.0), # Napkin

        # Peach Tea w/ Lychee Jelly (38) - black tea, peach syrup, lychee jelly, blended
        (38, 1,  1.0), # Black tea base
        (38, 15, 1.0), # Peach syrup
        (38, 29, 1.0), # Lychee jelly
        (38, 12, 1.0), # Simple syrup
        (38, 38, 2.0), # Ice
        (38, 41, 1.0), # Large cup
        (38, 43, 1.0), # Large lid
        (38, 44, 1.0), # Wide straw
        (38, 46, 1.0), # Napkin

        # Lava Flow (39) - coconut milk, coconut cream, strawberry puree, blended
        (39, 8,  1.0), # Coconut milk
        (39, 22, 1.0), # Coconut cream
        (39, 19, 1.0), # Strawberry puree
        (39, 12, 1.0), # Simple syrup
        (39, 38, 2.0), # Ice
        (39, 41, 1.0), # Large cup
        (39, 43, 1.0), # Large lid
        (39, 45, 1.0), # Regular straw
        (39, 46, 1.0), # Napkin
    ]

    with open('data/menu_item_inventory.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['menu_item_id', 'inventory_id', 'quantity_used'])
        writer.writerows(mappings)

    print(f"✓ Generated {len(mappings)} menu-inventory mappings → data/menu_item_inventory.csv")
    return menu_items, mappings

if __name__ == '__main__':
    generate_menu_items()