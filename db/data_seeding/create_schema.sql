-- Project 2 Phase 2: Database Schema Creation
-- Team 32 - Bubble Tea Shop Database
-- Based on databasedesign.md

-- Drop tables if they exist (for clean recreation)
DROP TABLE IF EXISTS order_item_modification CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS customer_order CASCADE;
DROP TABLE IF EXISTS menu_item_inventory CASCADE;
DROP TABLE IF EXISTS modification_type CASCADE;
DROP TABLE IF EXISTS menu_item CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS employee CASCADE;

-- Create Employee table
CREATE TABLE employee (
    employee_id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    google_email VARCHAR(255),
    employee_pin VARCHAR(4) CHECK (employee_pin IS NULL OR employee_pin ~ '^[0-9]{4}$')
);

-- Create Inventory table
CREATE TABLE inventory (
    inventory_id INT PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    quantity_available INT NOT NULL CHECK (quantity_available >= 0)
);

-- Create Menu Item table
CREATE TABLE menu_item (
    menu_item_id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
    category VARCHAR(50)
);

-- Create Menu Item Inventory junction table
CREATE TABLE menu_item_inventory (
    menu_item_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity_used DECIMAL(10, 2) NOT NULL CHECK (quantity_used > 0),
    PRIMARY KEY (menu_item_id, inventory_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_item(menu_item_id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
);

-- Create Modification Type table
CREATE TABLE modification_type (
    modification_type_id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0)
);

-- Create Customer Order table
CREATE TABLE customer_order (
    order_id INT PRIMARY KEY,
    order_date TIMESTAMP NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
    employee_id INT NOT NULL,
    payment_type VARCHAR(50),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
);

-- Create Order Item table
CREATE TABLE order_item (
    order_item_id INT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    item_price DECIMAL(10, 2) NOT NULL CHECK (item_price >= 0),
    comments TEXT,
    FOREIGN KEY (order_id) REFERENCES customer_order(order_id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_item(menu_item_id) ON DELETE RESTRICT
);

-- Create Order Item Modification junction table
CREATE TABLE order_item_modification (
    order_item_id INT NOT NULL,
    modification_type_id INT NOT NULL,
    PRIMARY KEY (order_item_id, modification_type_id),
    FOREIGN KEY (order_item_id) REFERENCES order_item(order_item_id) ON DELETE CASCADE,
    FOREIGN KEY (modification_type_id) REFERENCES modification_type(modification_type_id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX idx_customer_order_date ON customer_order(order_date);
CREATE INDEX idx_customer_order_employee ON customer_order(employee_id);
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_order_item_menu ON order_item(menu_item_id);

-- Display created tables
\dt+

COMMENT ON TABLE employee IS 'Stores employee information including position and hire date';
COMMENT ON TABLE inventory IS 'Tracks raw ingredients and operational supplies';
COMMENT ON TABLE menu_item IS 'Defines available menu items with base prices';
COMMENT ON TABLE menu_item_inventory IS 'Maps menu items to required inventory ingredients';
COMMENT ON TABLE modification_type IS 'Defines available drink modifications and their costs';
COMMENT ON TABLE customer_order IS 'Records customer orders with timestamps and totals';
COMMENT ON TABLE order_item IS 'Individual items within an order with historical pricing';
COMMENT ON TABLE order_item_modification IS 'Links order items to their applied modifications';
