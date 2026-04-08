#!/usr/bin/env python3
"""
Generate inventory data for Sharetea bubble tea shop
Includes ingredients and operational supplies
"""
import csv
import os

def generate_inventory():
    """Generate inventory items with initial quantities"""
    
    inventory = [
        # ── TEA BASES ────────────────────────────────────────────────────────
        (1,  'Black Tea Base',          5000),
        (2,  'Green Tea Base',          4500),
        (3,  'Thai Tea Base',           2500),
        (4,  'Oolong Tea Base',         3000),
        (5,  'Coffee Base',             2000),

        # ── MILK & DAIRY ─────────────────────────────────────────────────────
        (6,  'Whole Milk',              8000),
        (7,  'Oat Milk',                3000),
        (8,  'Coconut Milk',            3000),
        (9,  'Hokkaido Creamer',        2500),
        (10, 'Non-Dairy Creamer',       4000),
        (11, 'Condensed Milk',          2000),

        # ── SWEETENERS ───────────────────────────────────────────────────────
        (12, 'Simple Syrup',            6000),
        (13, 'Brown Sugar Syrup',       3500),
        (14, 'Honey',                   2000),

        # ── SYRUPS & PUREES ──────────────────────────────────────────────────
        (15, 'Peach Syrup',             1500),
        (16, 'Lychee Syrup',            1800),
        (17, 'Wintermelon Syrup',       2000),
        (18, 'Passion Fruit Syrup',     2000),
        (19, 'Strawberry Puree',        2000),
        (20, 'Mango Puree',             2000),
        (21, 'Berry Mix',               2000),
        (22, 'Coconut Cream',           2000),
        (23, 'Lemon Juice',             2000),

        # ── TOPPINGS ─────────────────────────────────────────────────────────
        # (as listed on the Sharetea menu)
        (24, 'Tapioca Pearls',          10000),
        (25, 'Crystal Boba',            4000),
        (26, 'Popping Boba - Strawberry', 4000),
        (27, 'Popping Boba - Mango',    4000),
        (28, 'Honey Jelly',             2500),
        (29, 'Lychee Jelly',            2500),
        (30, 'Coffee Jelly',            2500),
        (31, 'Pudding',                 3500),
        (32, 'Ice Cream',               2000),
        (33, 'Crema (Milk Foam)',       3000),

        # ── POWDERS & SPECIALTY ──────────────────────────────────────────────
        (34, 'Taro Powder',             3000),
        (35, 'Matcha Powder',           2500),
        (36, 'Oreo Crumbles',           2000),
        (37, 'Halo Halo Mix',           2000),

        # ── OPERATIONAL ──────────────────────────────────────────────────────
        (38, 'Ice',                     50000),
        (39, 'Filtered Water',          100000),
        (40, 'Medium Cups (16oz)',      8000),
        (41, 'Large Cups (24oz)',       8000),
        (42, 'Plastic Lids - Medium',   8000),
        (43, 'Plastic Lids - Large',    8000),
        (44, 'Wide Straws',             15000),
        (45, 'Regular Straws',          15000),
        (46, 'Napkins',                 20000),
        (47, 'Plastic Bags',            12000),
        (48, 'Cup Sleeves',             8000),
    ]

    os.makedirs('data', exist_ok=True)

    # Write to CSV
    with open('data/inventory.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['inventory_id', 'resource_name', 'quantity_available'])
        writer.writerows(inventory)

    print(f"✓ Generated {len(inventory)} inventory items → data/inventory.csv")
    return inventory

if __name__ == '__main__':
    generate_inventory()