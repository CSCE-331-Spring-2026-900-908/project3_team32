#!/usr/bin/env python3
"""
Generate 52 weeks of order data for bubble tea shop
Team of 5 requirements:
- 52 weeks of sales history (Feb 18, 2025 - Feb 17, 2026)
- ~$1,000,000 total sales
- 3 peak days with significantly higher sales
"""
import csv
import random
from datetime import datetime, timedelta

# Configuration
START_DATE = datetime(2025, 2, 18, 8, 0)  # Feb 18, 2025, 8 AM
END_DATE = datetime(2026, 2, 17, 22, 0)   # Feb 17, 2026, 10 PM
TARGET_SALES = 1_000_000  # $1M target
PEAK_DAYS = [
    datetime(2025, 8, 26),   # Fall semester start
    datetime(2025, 9, 13),   # Football game day
    datetime(2026, 1, 13),   # Spring semester start
]

# Menu items with their IDs and base costs (matches generate_menu_items.py)
MENU_ITEMS = [
    # Milky Series
    (1,  6.25), (2,  6.50), (3,  6.25), (4,  6.75), (5,  6.50),
    (6,  6.25), (7,  6.50), (8,  6.50), (9,  6.75), (10, 6.50),
    # Fresh Brew
    (11, 5.25), (12, 5.50),
    # Fruity Beverage
    (13, 6.25), (14, 6.25), (15, 6.50), (16, 6.50), (17, 6.25), (18, 5.75),
    # Non-Caffeinated
    (19, 6.75), (20, 6.75), (21, 7.25), (22, 7.50), (23, 7.75),
    (24, 5.75), (25, 6.25), (26, 6.25),
    # New Matcha Series
    (27, 6.75), (28, 6.50), (29, 7.00), (30, 7.00), (31, 7.25),
    # Ice-Blended
    (32, 7.25), (33, 7.25), (34, 7.00), (35, 7.50), (36, 7.50),
    (37, 7.75), (38, 7.00), (39, 7.75),
]

# Popular items (weighted selection)
# Classic Pearl, Honey Pearl, Taro, Golden Retriever, Matcha Pearl, Strawberry Matcha
POPULAR_ITEMS = [1, 2, 7, 9, 27, 29]

# Modifications
SUGAR_MODS = [1, 2, 3, 4, 5, 6]        # Sugar levels
ICE_MODS = [7, 8, 9, 10]               # Ice levels
TOPPING_MODS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]  # Toppings (extra cost)
SIZE_MODS = [21, 22]                    # Sizes

# Modification costs
MOD_COSTS = {
    11: 0.75,  # Add Tapioca Pearls
    12: 0.75,  # Add Crystal Boba
    13: 0.75,  # Add Popping Boba (Strawberry)
    14: 0.75,  # Add Popping Boba (Mango)
    15: 0.75,  # Add Honey Jelly
    16: 0.75,  # Add Lychee Jelly
    17: 0.75,  # Add Coffee Jelly
    18: 0.75,  # Add Pudding
    19: 1.00,  # Add Ice Cream
    20: 0.75,  # Add Creama
    22: 1.50,  # Large Size
}

# Employee IDs (12 employees)
EMPLOYEES = list(range(1, 13))

def is_peak_day(date):
    """Check if date is a peak day"""
    return any(date.date() == peak.date() for peak in PEAK_DAYS)

def get_hourly_multiplier(hour):
    """Get order frequency multiplier based on hour of day"""
    if 11 <= hour <= 13:  # Lunch rush
        return 3.0
    elif 17 <= hour <= 20:  # Dinner rush
        return 2.5
    elif 14 <= hour <= 16:  # Afternoon
        return 1.8
    elif 8 <= hour <= 10:  # Morning
        return 1.0
    else:  # Late night
        return 0.5

def get_day_multiplier(date):
    """Get order frequency multiplier based on day of week"""
    weekday = date.weekday()
    if weekday in [5, 6]:  # Weekend
        return 1.3
    elif weekday in [1, 2, 3]:  # Tue-Thu
        return 1.1
    else:  # Mon, Fri
        return 1.0

def generate_order_items(order_id, order_item_id_start):
    """Generate 1-3 items for an order"""
    num_items = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
    items = []
    modifications = []

    for i in range(num_items):
        # Select menu item (favor popular items)
        if random.random() < 0.6:
            menu_item_id, base_cost = random.choice(
                [(id, cost) for id, cost in MENU_ITEMS if id in POPULAR_ITEMS]
            )
        else:
            menu_item_id, base_cost = random.choice(MENU_ITEMS)

        quantity = 1
        item_price = base_cost

        # Add modifications
        item_mods = []

        # Sugar level (90% of orders)
        if random.random() < 0.9:
            item_mods.append(random.choice(SUGAR_MODS))

        # Ice level (85% of orders)
        if random.random() < 0.85:
            item_mods.append(random.choice(ICE_MODS))

        # Size (30% upgrade to large)
        if random.random() < 0.3:
            item_mods.append(22)  # Large size
            item_price += MOD_COSTS[22]
        else:
            item_mods.append(21)  # Regular size (default)

        # Toppings (40% add topping)
        if random.random() < 0.4:
            topping = random.choice(TOPPING_MODS)
            item_mods.append(topping)
            item_price += MOD_COSTS.get(topping, 0)

        order_item_id = order_item_id_start + i
        items.append((order_item_id, order_id, menu_item_id, quantity, round(item_price, 2)))

        for mod_id in item_mods:
            modifications.append((order_item_id, mod_id))

    return items, modifications

def generate_orders():
    """Generate all orders for 52 weeks"""
    print("Generating 52 weeks of order data...")
    print(f"Date range: {START_DATE.date()} to {END_DATE.date()}")
    print(f"Target sales: ${TARGET_SALES:,.2f}")
    print(f"Peak days: {[d.date() for d in PEAK_DAYS]}")
    print()

    orders = []
    order_items = []
    order_item_modifications = []

    order_id = 1
    order_item_id = 1
    total_sales = 0

    current_date = START_DATE

    while current_date <= END_DATE:
        hour = current_date.hour

        # Skip closed hours (11 PM - 7 AM)
        if hour < 8 or hour >= 22:
            current_date += timedelta(hours=1)
            continue

        # Calculate order frequency for this hour
        base_orders_per_hour = 9  # Base rate (adjusted for ~$1M target)
        hour_mult = get_hourly_multiplier(hour)
        day_mult = get_day_multiplier(current_date)
        peak_mult = 4.0 if is_peak_day(current_date) else 1.0

        orders_this_hour = int(base_orders_per_hour * hour_mult * day_mult * peak_mult)
        orders_this_hour = max(1, orders_this_hour)

        for _ in range(orders_this_hour):
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            order_date = current_date.replace(minute=minute, second=second)

            employee_id = random.choice(EMPLOYEES)

            items, mods = generate_order_items(order_id, order_item_id)

            total_cost = sum(item[4] for item in items)

            orders.append((order_id, order_date, round(total_cost, 2), employee_id))
            order_items.extend(items)
            order_item_modifications.extend(mods)

            total_sales += total_cost
            order_id += 1
            order_item_id += len(items)

        current_date += timedelta(hours=1)

    print(f"Generated {len(orders):,} orders")
    print(f"Generated {len(order_items):,} order items")
    print(f"Generated {len(order_item_modifications):,} modifications")
    print(f"Total sales: ${total_sales:,.2f}")
    print(f"Average order value: ${total_sales/len(orders):.2f}")
    print()

    # Write customer_orders.csv
    with open('data/customer_orders.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['order_id', 'order_date', 'total_cost', 'employee_id'])
        for order in orders:
            writer.writerow([order[0], order[1].strftime('%Y-%m-%d %H:%M:%S'), order[2], order[3]])
    print("✓ Wrote data/customer_orders.csv")

    # Write order_items.csv
    with open('data/order_items.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['order_item_id', 'order_id', 'menu_item_id', 'quantity', 'item_price'])
        writer.writerows(order_items)
    print("✓ Wrote data/order_items.csv")

    # Write order_item_modifications.csv
    with open('data/order_item_modifications.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['order_item_id', 'modification_type_id'])
        writer.writerows(order_item_modifications)
    print("✓ Wrote data/order_item_modifications.csv")

    return orders, order_items, order_item_modifications

if __name__ == '__main__':
    generate_orders()
