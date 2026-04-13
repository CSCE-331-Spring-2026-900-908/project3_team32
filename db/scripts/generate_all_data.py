#!/usr/bin/env python3
"""
Master script to generate all data for Phase 2
Runs all generation scripts in correct order
"""
import subprocess
import sys
from pathlib import Path

def run_script(script_name):
    """Run a Python script and check for errors"""
    print(f"\n{'='*60}")
    print(f"Running {script_name}...")
    print('='*60)
    
    result = subprocess.run(
        [sys.executable, f'scripts/{script_name}'],
        capture_output=False
    )
    
    if result.returncode != 0:
        print(f"Error running {script_name}")
        sys.exit(1)
    
    return result.returncode

def main():
    """Generate all data files"""
    print("="*60)
    print("Project 2 Phase 2 - Data Generation")
    print("Team 32 - Bubble Tea Shop Database")
    print("="*60)
    
    scripts = [
        'generate_employees.py',
        'generate_inventory.py',
        'generate_menu_items.py',
        'generate_modifications.py',
        'generate_orders.py',
    ]
    
    for script in scripts:
        run_script(script)
    
    print("\n" + "="*60)
    print("✓ All data generation complete!")
    print("="*60)
    print("\nGenerated files in data/:")
    print("  - employees.csv")
    print("  - inventory.csv")
    print("  - menu_items.csv")
    print("  - menu_item_inventory.csv")
    print("  - modification_types.csv")
    print("  - customer_orders.csv")
    print("  - order_items.csv")
    print("  - order_item_modifications.csv")
    print("\nNext steps:")
    print("  1. Connect to PostgreSQL: psql -h [host] -U [username] -d [database]")
    print("  2. Create schema: \\i create_schema.sql")
    print("  3. Load data: \\i load_data.sql")

if __name__ == '__main__':
    main()
