package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;

public class MenuManagementPanel extends JPanel {
    private JTable menuTable;
    private DefaultTableModel tableModel;

    public MenuManagementPanel() {
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Title
        JLabel titleLabel = new JLabel("Manager View - Menu Management");
        titleLabel.setFont(new Font("Arial", Font.BOLD, 20));
        add(titleLabel, BorderLayout.NORTH);

        // Table
        String[] columns = { "Menu Item ID", "Name", "Cost" };
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        menuTable = new JTable(tableModel);
        menuTable.setFont(new Font("Arial", Font.PLAIN, 14));
        menuTable.setRowHeight(25);
        menuTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        // Double-click to edit
        menuTable.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseClicked(java.awt.event.MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    editSelectedItem();
                }
            }
        });

        JScrollPane scrollPane = new JScrollPane(menuTable);
        add(scrollPane, BorderLayout.CENTER);

        // Button Panel
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));

        JButton addButton = new JButton("Add New Item");
        JButton editButton = new JButton("Edit Selected");
        JButton deleteButton = new JButton("Delete Selected");
        JButton refreshButton = new JButton("Refresh");

        addButton.addActionListener(e -> addNewItem());
        editButton.addActionListener(e -> editSelectedItem());
        deleteButton.addActionListener(e -> deleteSelectedItem());
        refreshButton.addActionListener(e -> loadMenuItems());

        buttonPanel.add(addButton);
        buttonPanel.add(editButton);
        buttonPanel.add(deleteButton);
        buttonPanel.add(refreshButton);

        add(buttonPanel, BorderLayout.SOUTH);

        // Load data on startup
        loadMenuItems();
    }

    private void loadMenuItems() {
        tableModel.setRowCount(0);

        try {
            Connection conn = DatabaseConnection.getConnection();
            if (conn != null) {
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(
                        "SELECT menu_item_id, name, cost FROM menu_item ORDER BY menu_item_id");

                while (rs.next()) {
                    tableModel.addRow(new Object[] {
                            rs.getInt("menu_item_id"),
                            rs.getString("name"),
                            String.format("$%.2f", rs.getDouble("cost"))
                    });
                }

                rs.close();
                stmt.close();
                System.out.println("[LOG] Loaded " + tableModel.getRowCount() + " menu items");
            }
        } catch (SQLException e) {
            System.err.println("[ERROR] Failed to load menu items: " + e.getMessage());
            JOptionPane.showMessageDialog(this,
                    "Failed to load menu items: " + e.getMessage(),
                    "Database Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void addNewItem() {
        JTextField nameField = new JTextField(20);
        JTextField priceField = new JTextField(10);
        JComboBox<String> categoryBox = new JComboBox<>(new String[]{
            "Milk Tea", "Fruit Tea", "Smoothies", "Lattes", "Specialty", "Seasonal"
        });

        JPanel panel = new JPanel(new GridLayout(3, 2, 5, 5));
        panel.add(new JLabel("Item Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Price:"));
        panel.add(priceField);
        panel.add(new JLabel("Category:"));
        panel.add(categoryBox);

        int result = JOptionPane.showConfirmDialog(this, panel,
                "Add New Menu Item", JOptionPane.OK_CANCEL_OPTION);

        if (result == JOptionPane.OK_OPTION) {
            String name = nameField.getText().trim();
            String priceStr = priceField.getText().trim();
            String category = (String) categoryBox.getSelectedItem();

            if (name.isEmpty() || priceStr.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in all fields",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            try {
                double price = Double.parseDouble(priceStr);
                if (price < 0) {
                    JOptionPane.showMessageDialog(this, "Price cannot be negative");
                    return;
                }

                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "INSERT INTO menu_item (menu_item_id, name, cost, category) " +
                                    "VALUES ((SELECT COALESCE(MAX(menu_item_id), 0) + 1 FROM menu_item), ?, ?, ?)");
                    stmt.setString(1, name);
                    stmt.setDouble(2, price);
                    stmt.setString(3, category);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Added menu item: " + name + " (" + category + ")");
                    JOptionPane.showMessageDialog(this, "Menu item added successfully!");
                    loadMenuItems();
                }
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(this, "Invalid price format",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to add menu item: " + e.getMessage());
                JOptionPane.showMessageDialog(this,
                        "Failed to add menu item: " + e.getMessage(),
                        "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void editSelectedItem() {
        int selectedRow = menuTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select a menu item to edit",
                    "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int itemId = (int) menuTable.getValueAt(selectedRow, 0);
        String currentName = (String) menuTable.getValueAt(selectedRow, 1);
        String currentPriceStr = (String) menuTable.getValueAt(selectedRow, 2);
        double currentPrice = Double.parseDouble(currentPriceStr.replace("$", ""));

        JTextField nameField = new JTextField(currentName, 20);
        JTextField priceField = new JTextField(String.valueOf(currentPrice), 10);

        JPanel panel = new JPanel(new GridLayout(2, 2, 5, 5));
        panel.add(new JLabel("Item Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Price:"));
        panel.add(priceField);

        int result = JOptionPane.showConfirmDialog(this, panel,
                "Edit Menu Item", JOptionPane.OK_CANCEL_OPTION);

        if (result == JOptionPane.OK_OPTION) {
            String newName = nameField.getText().trim();
            String newPriceStr = priceField.getText().trim();

            if (newName.isEmpty() || newPriceStr.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in all fields",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            try {
                double newPrice = Double.parseDouble(newPriceStr);

                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "UPDATE menu_item SET name = ?, cost = ? WHERE menu_item_id = ?");
                    stmt.setString(1, newName);
                    stmt.setDouble(2, newPrice);
                    stmt.setInt(3, itemId);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Updated menu item ID: " + itemId);
                    JOptionPane.showMessageDialog(this, "Menu item updated successfully!");
                    loadMenuItems();
                }
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(this, "Invalid price format",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to update menu item: " + e.getMessage());
                JOptionPane.showMessageDialog(this,
                        "Failed to update menu item: " + e.getMessage(),
                        "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void deleteSelectedItem() {
        int selectedRow = menuTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select a menu item to delete",
                    "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int itemId = (int) menuTable.getValueAt(selectedRow, 0);
        String itemName = (String) menuTable.getValueAt(selectedRow, 1);

        int confirm = JOptionPane.showConfirmDialog(this,
                "Are you sure you want to delete '" + itemName + "'?",
                "Confirm Delete", JOptionPane.YES_NO_OPTION);

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "DELETE FROM menu_item WHERE menu_item_id = ?");
                    stmt.setInt(1, itemId);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Deleted menu item ID: " + itemId);
                    JOptionPane.showMessageDialog(this, "Menu item deleted successfully!");
                    loadMenuItems();
                }
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to delete menu item: " + e.getMessage());
                
                // Check if it's a foreign key constraint error
                if (e.getMessage().contains("foreign key constraint") || 
                    e.getMessage().contains("still referenced")) {
                    JOptionPane.showMessageDialog(this,
                            "Cannot delete '" + itemName + "' because it has been ordered before.\n" +
                            "Menu items with order history cannot be deleted to preserve records.",
                            "Cannot Delete",
                            JOptionPane.WARNING_MESSAGE);
                } else {
                    JOptionPane.showMessageDialog(this,
                            "Failed to delete menu item: " + e.getMessage(),
                            "Database Error",
                            JOptionPane.ERROR_MESSAGE);
                }
            }
        }
    }
}
