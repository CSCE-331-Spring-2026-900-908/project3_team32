#!/usr/bin/env python3
"""
Generate employee data for bubble tea shop
Team of 5 - Creates 12 employees
"""
import csv
from datetime import datetime, timedelta
import random

def generate_employees():
    """Generate employee records"""
    
    # Employee data
    employees = [
        (1, 'Sarah Chen', 'Manager', '2023-01-15'),
        (2, 'Michael Rodriguez', 'Shift Lead', '2023-02-01'),
        (3, 'Emily Johnson', 'Cashier', '2023-03-10'),
        (4, 'David Kim', 'Cashier', '2023-03-15'),
        (5, 'Jessica Martinez', 'Cashier', '2023-04-20'),
        (6, 'Ryan Thompson', 'Cashier', '2023-05-05'),
        (7, 'Amanda Lee', 'Shift Lead', '2023-06-12'),
        (8, 'Brandon Wu', 'Cashier', '2023-07-08'),
        (9, 'Olivia Davis', 'Cashier', '2023-08-15'),
        (10, 'James Park', 'Cashier', '2023-09-01'),
        (11, 'Sophia Nguyen', 'Cashier', '2024-01-10'),
        (12, 'Daniel Brown', 'Cashier', '2024-02-05'),
    ]
    
    # Write to CSV
    with open('data/employees.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['employee_id', 'name', 'position', 'hire_date'])
        writer.writerows(employees)
    
    print(f"✓ Generated {len(employees)} employees → data/employees.csv")
    return employees

if __name__ == '__main__':
    generate_employees()
