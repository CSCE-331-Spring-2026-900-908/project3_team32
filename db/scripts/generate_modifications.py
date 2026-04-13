#!/usr/bin/env python3
"""
Generate modification types for drink customization
"""
import csv

def generate_modifications():
    """Generate modification types"""
    
    modifications = [
        # (modification_type_id, name, cost)

        # ── SUGAR LEVELS (no extra cost) ─────────────────────────────────────
        (1,  '0% Sugar',   0.00),
        (2,  '25% Sugar',  0.00),
        (3,  '50% Sugar',  0.00),
        (4,  '75% Sugar',  0.00),
        (5,  '100% Sugar', 0.00),
        (6,  '125% Sugar', 0.00),

        # ── ICE LEVELS (no extra cost) ────────────────────────────────────────
        (7,  'No Ice',       0.00),
        (8,  'Less Ice',     0.00),
        (9,  'Regular Ice',  0.00),
        (10, 'Extra Ice',    0.00),

        # ── TOPPINGS (extra cost) ─────────────────────────────────────────────
        # Inventory ID 24 - Tapioca Pearls
        (11, 'Add Tapioca Pearls',          0.75),
        # Inventory ID 25 - Crystal Boba
        (12, 'Add Crystal Boba',            0.75),
        # Inventory ID 26 - Popping Boba (Strawberry)
        (13, 'Add Popping Boba (Strawberry)', 0.75),
        # Inventory ID 27 - Popping Boba (Mango)
        (14, 'Add Popping Boba (Mango)',    0.75),
        # Inventory ID 28 - Honey Jelly
        (15, 'Add Honey Jelly',             0.75),
        # Inventory ID 29 - Lychee Jelly
        (16, 'Add Lychee Jelly',            0.75),
        # Inventory ID 30 - Coffee Jelly
        (17, 'Add Coffee Jelly',            0.75),
        # Inventory ID 31 - Pudding
        (18, 'Add Pudding',                 0.75),
        # Inventory ID 32 - Ice Cream
        (19, 'Add Ice Cream',               1.00),
        # Inventory ID 33 - Crema (Milk Foam)
        (20, 'Add Creama',                  0.75),

        # ── SIZE (price difference handled in order_item) ─────────────────────
        (21, 'Regular Size', 0.00),
        (22, 'Large Size',   1.50),
    ]
    
    # Write to CSV
    with open('data/modification_types.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['modification_type_id', 'name', 'cost'])
        writer.writerows(modifications)
    
    print(f"✓ Generated {len(modifications)} modification types → data/modification_types.csv")
    return modifications

if __name__ == '__main__':
    generate_modifications()