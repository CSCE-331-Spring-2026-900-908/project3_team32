package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;

public class InventoryManagementPanel extends JPanel {
    private JTable table;
    private DefaultTableModel model;

    public InventoryManagementPanel() {
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Title
        JLabel titleLabel = new JLabel("Manager View - Inventory Management");
        titleLabel.setFont(new Font("Arial", Font.BOLD, 20));
        add(titleLabel, BorderLayout.NORTH);

        // Table
        String[] columns = { "Inventory ID", "Resource Name", "Quantity Available" };
        model = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        table = new JTable(model);
        table.setFont(new Font("Arial", Font.PLAIN, 14));
        table.setRowHeight(25);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        add(new JScrollPane(table), BorderLayout.CENTER);

        // Button Panel
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton refreshButton = new JButton("Refresh");
        JButton addButton = new JButton("Add Item");
        JButton editButton = new JButton("Edit Selected");
        JButton deleteButton = new JButton("Delete Selected");

        refreshButton.addActionListener(e -> loadInventory());
        addButton.addActionListener(e -> addItem());
        editButton.addActionListener(e -> editItem());
        deleteButton.addActionListener(e -> deleteItem());

        buttonPanel.add(addButton);
        buttonPanel.add(editButton);
        buttonPanel.add(deleteButton);
        buttonPanel.add(refreshButton);

        add(buttonPanel, BorderLayout.SOUTH);

        loadInventory();
    }

    private void loadInventory() {
        model.setRowCount(0);

        try {
            Connection conn = DatabaseConnection.getConnection();
            if (conn != null) {
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(
                        "SELECT inventory_id, resource_name, quantity_available FROM inventory ORDER BY inventory_id");

                while (rs.next()) {
                    model.addRow(new Object[] {
                            rs.getInt("inventory_id"),
                            rs.getString("resource_name"),
                            rs.getInt("quantity_available")
                    });
                }

                rs.close();
                stmt.close();
                System.out.println("[LOG] Loaded " + model.getRowCount() + " inventory items");
            }
        } catch (SQLException e) {
            System.err.println("[ERROR] Failed to load inventory: " + e.getMessage());
            JOptionPane.showMessageDialog(this,
                    "Failed to load inventory: " + e.getMessage(),
                    "Database Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void addItem() {
        JTextField nameField = new JTextField(20);
        JTextField quantityField = new JTextField(10);

        JPanel panel = new JPanel(new GridLayout(2, 2, 5, 5));
        panel.add(new JLabel("Resource Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Quantity:"));
        panel.add(quantityField);

        int result = JOptionPane.showConfirmDialog(this, panel,
                "Add New Inventory Item", JOptionPane.OK_CANCEL_OPTION);

        if (result == JOptionPane.OK_OPTION) {
            String name = nameField.getText().trim();
            String quantityStr = quantityField.getText().trim();

            if (name.isEmpty() || quantityStr.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in all fields",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            try {
                int quantity = Integer.parseInt(quantityStr);

                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "INSERT INTO inventory (inventory_id, resource_name, quantity_available) " +
                                    "VALUES ((SELECT COALESCE(MAX(inventory_id), 0) + 1 FROM inventory), ?, ?)");
                    stmt.setString(1, name);
                    stmt.setInt(2, quantity);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Added inventory item: " + name);
                    JOptionPane.showMessageDialog(this, "Inventory item added successfully!");
                    loadInventory();
                }
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(this, "Invalid quantity format",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to add inventory item: " + e.getMessage());
                JOptionPane.showMessageDialog(this,
                        "Failed to add inventory item: " + e.getMessage(),
                        "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void editItem() {
        int selectedRow = table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select an inventory item to edit",
                    "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int itemId = (int) model.getValueAt(selectedRow, 0);
        String currentName = (String) model.getValueAt(selectedRow, 1);
        int currentQuantity = (int) model.getValueAt(selectedRow, 2);

        JTextField nameField = new JTextField(currentName, 20);
        JTextField quantityField = new JTextField(String.valueOf(currentQuantity), 10);

        JPanel panel = new JPanel(new GridLayout(2, 2, 5, 5));
        panel.add(new JLabel("Resource Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Quantity:"));
        panel.add(quantityField);

        int result = JOptionPane.showConfirmDialog(this, panel,
                "Edit Inventory Item", JOptionPane.OK_CANCEL_OPTION);

        if (result == JOptionPane.OK_OPTION) {
            String newName = nameField.getText().trim();
            String newQuantityStr = quantityField.getText().trim();

            if (newName.isEmpty() || newQuantityStr.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Please fill in all fields",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            try {
                int newQuantity = Integer.parseInt(newQuantityStr);
                if (newQuantity < 0) {
                    JOptionPane.showMessageDialog(this, "Quantity cannot be negative");
                    return;
                }
                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "UPDATE inventory SET resource_name = ?, quantity_available = ? WHERE inventory_id = ?");
                    stmt.setString(1, newName);
                    stmt.setInt(2, newQuantity);
                    stmt.setInt(3, itemId);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Updated inventory item ID: " + itemId);
                    JOptionPane.showMessageDialog(this, "Inventory item updated successfully!");
                    loadInventory();
                }
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(this, "Invalid quantity format",
                        "Validation Error", JOptionPane.ERROR_MESSAGE);
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to update inventory item: " + e.getMessage());
                JOptionPane.showMessageDialog(this,
                        "Failed to update inventory item: " + e.getMessage(),
                        "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void deleteItem() {
        int selectedRow = table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select an inventory item to delete",
                    "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int itemId = (int) model.getValueAt(selectedRow, 0);
        String itemName = (String) model.getValueAt(selectedRow, 1);

        int confirm = JOptionPane.showConfirmDialog(this,
                "Are you sure you want to delete '" + itemName + "'?",
                "Confirm Delete", JOptionPane.YES_NO_OPTION);

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {
                    PreparedStatement stmt = conn.prepareStatement(
                            "DELETE FROM inventory WHERE inventory_id = ?");
                    stmt.setInt(1, itemId);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Deleted inventory item ID: " + itemId);
                    JOptionPane.showMessageDialog(this, "Inventory item deleted successfully!");
                    loadInventory();
                }
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to delete inventory item: " + e.getMessage());
                JOptionPane.showMessageDialog(this,
                        "Failed to delete inventory item: " + e.getMessage(),
                        "Database Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }
}
