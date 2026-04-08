#!/usr/bin/env python3
"""
Script to output menu items and their ingredients
Reads from CSV files: menu_items.csv, menu_item_inventory.csv, inventory.csv
"""
import csv
from collections import defaultdict

def load_menu_items():
    """Load menu items from CSV"""
    menu_items = {}
    with open('data/menu_items.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            menu_items[int(row['menu_item_id'])] = {
                'name': row['name'],
                'cost': float(row['cost'])
            }
    return menu_items

def load_inventory():
    """Load inventory items from CSV"""
    inventory = {}
    with open('data/inventory.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            inventory[int(row['inventory_id'])] = row['resource_name']
    return inventory

def load_menu_item_inventory():
    """Load menu item inventory relationships"""
    menu_ingredients = defaultdict(list)
    with open('data/menu_item_inventory.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            menu_id = int(row['menu_item_id'])
            inv_id = int(row['inventory_id'])
            qty = float(row['quantity_used'])
            menu_ingredients[menu_id].append((inv_id, qty))
    return menu_ingredients

def main():
    """Output menu items with their ingredients"""
    print("="*60)
    print("Menu Items and Their Ingredients")
    print("Bubble Tea Shop - Team 32")
    print("="*60)
    
    # Load data
    menu_items = load_menu_items()
    inventory = load_inventory()
    menu_ingredients = load_menu_item_inventory()
    
    # Output each menu item with ingredients
    for menu_id in sorted(menu_items.keys()):
        item = menu_items[menu_id]
        print(f"\n{item['name']} (ID: {menu_id}, Cost: ${item['cost']:.2f})")
        print("-" * 50)
        
        if menu_id in menu_ingredients:
            for inv_id, qty in menu_ingredients[menu_id]:
                resource_name = inventory.get(inv_id, f"Unknown (ID: {inv_id})")
                print(f"  - {resource_name}: {qty}")
        else:
            print("  No ingredients found")
    
    print(f"\n{'='*60}")
    print(f"Total menu items: {len(menu_items)}")

if __name__ == '__main__':
    main()