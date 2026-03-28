package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;

public class EmployeeManagerPanel extends JPanel {

    // Table used to display employee records
    private JTable table;

    // Table model that holds employee data shown in the JTable
    private DefaultTableModel model;

    public EmployeeManagerPanel() {

        // Configure main panel layout and spacing
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Header label for the employee management view
        JLabel titleLabel = new JLabel("Manager View - Employee Management");
        titleLabel.setFont(new Font("Arial", Font.BOLD, 20));
        add(titleLabel, BorderLayout.NORTH);

        // Column headers for the employee table
        String[] columns = {"Employee ID", "Name", "Position", "Hire Date"};

        // Table model to store employee rows (cells are read-only)
        model = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };

        // JTable configured to display employee data
        table = new JTable(model);
        table.setFont(new Font("Arial", Font.PLAIN, 14));
        table.setRowHeight(25);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        // Add table to a scroll pane so large datasets can scroll
        add(new JScrollPane(table), BorderLayout.CENTER);

        // Panel containing action buttons for employee CRUD operations
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton refreshButton = new JButton("Refresh");
        JButton addButton = new JButton("Add Employee");
        JButton editButton = new JButton("Edit Selected");
        JButton deleteButton = new JButton("Delete Selected");

        // Button actions trigger employee-related database operations
        refreshButton.addActionListener(e -> loadEmployee());
        addButton.addActionListener(e -> addEmployee());
        editButton.addActionListener(e -> editEmployee());
        deleteButton.addActionListener(e -> deleteEmployee());

        // Add buttons to the bottom action bar
        buttonPanel.add(addButton);
        buttonPanel.add(editButton);
        buttonPanel.add(deleteButton);
        buttonPanel.add(refreshButton);

        // Place action buttons at the bottom of the panel
        add(buttonPanel, BorderLayout.SOUTH);

        // Load employee records when the panel is first created
        loadEmployee();
    }

    /**
     * Retrieves employee records from the database and populates the table.
     * Existing table rows are cleared before loading fresh data.
     */
    private void loadEmployee() {

        // Remove all existing rows from the table model
        model.setRowCount(0);

        try {
            // Obtain a database connection
            Connection conn = DatabaseConnection.getConnection();

            // Continue only if the connection is valid
            if (conn != null) {
                Statement stmt = conn.createStatement();

                // Query employee records ordered by employee ID
                ResultSet rs = stmt.executeQuery(
                    "SELECT employee_id, name, position, hire_date FROM employee ORDER BY employee_id"
                );

                // Add each employee record to the table model
                while (rs.next()) {
                    model.addRow(new Object[]{
                        rs.getInt("employee_id"),
                        rs.getString("name"),
                        rs.getString("position"),
                        rs.getDate("hire_date")
                    });
                }

                // Release database resources
                rs.close();
                stmt.close();

                System.out.println("[LOG] Loaded " + model.getRowCount() + " employee records");
            }
        } catch (SQLException e) {
            // Error occurred while loading employee data
            System.err.println("[ERROR] Failed to load employees: " + e.getMessage());
            JOptionPane.showMessageDialog(
                this,
                "Failed to load employees: " + e.getMessage(),
                "Database Error",
                JOptionPane.ERROR_MESSAGE
            );
        }
    }

    /**
     * Displays a dialog allowing the manager to add a new employee record.
     * On success, the employee table is refreshed.
     */
    private void addEmployee() {

        // Input fields for new employee data
        JTextField idField = new JTextField(10);
        JTextField nameField = new JTextField(20);
        JTextField positionField = new JTextField(20);
        JTextField hireDateField = new JTextField(10);

        // Dialog layout for employee input
        JPanel panel = new JPanel(new GridLayout(4, 2, 5, 5));
        panel.add(new JLabel("Employee ID:"));
        panel.add(idField);
        panel.add(new JLabel("Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Position:"));
        panel.add(positionField);
        panel.add(new JLabel("Hire Date (YYYY-MM-DD):"));
        panel.add(hireDateField);

        // Show confirmation dialog for adding an employee
        int result = JOptionPane.showConfirmDialog(
            this,
            panel,
            "Add New Employee",
            JOptionPane.OK_CANCEL_OPTION
        );

        // Proceed only if user confirms
        if (result == JOptionPane.OK_OPTION) {

            // Read and trim input values
            String idStr = idField.getText().trim();
            String name = nameField.getText().trim();
            String position = positionField.getText().trim();
            String hireDateStr = hireDateField.getText().trim();

            // Validate that required fields are filled
            if (idStr.isEmpty() || name.isEmpty() || position.isEmpty() || hireDateStr.isEmpty()) {
                JOptionPane.showMessageDialog(
                    this,
                    "Please fill in all fields",
                    "Validation Error",
                    JOptionPane.ERROR_MESSAGE
                );
                return;
            }

            try {
                int employeeId = Integer.parseInt(idStr);
                Date hireDate = Date.valueOf(hireDateStr);

                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {

                    // Insert a new employee record into the database
                    PreparedStatement stmt = conn.prepareStatement(
                        "INSERT INTO employee (employee_id, name, position, hire_date) VALUES (?, ?, ?, ?)"
                    );

                    stmt.setInt(1, employeeId);
                    stmt.setString(2, name);
                    stmt.setString(3, position);
                    stmt.setDate(4, hireDate);

                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Added employee record: " + employeeId);
                    JOptionPane.showMessageDialog(this, "Employee added successfully!");

                    // Refresh table after insertion
                    loadEmployee();
                }
            } catch (NumberFormatException e) {
                // Employee ID was not a valid integer
                JOptionPane.showMessageDialog(
                    this,
                    "Invalid employee ID format",
                    "Validation Error",
                    JOptionPane.ERROR_MESSAGE
                );
            } catch (IllegalArgumentException e) {
                // Date.valueOf failed due to invalid format
                JOptionPane.showMessageDialog(
                    this,
                    "Invalid hire date format. Use YYYY-MM-DD",
                    "Validation Error",
                    JOptionPane.ERROR_MESSAGE
                );
            } catch (SQLException e) {
                // Database error during insert
                System.err.println("[ERROR] Failed to add employee: " + e.getMessage());
                JOptionPane.showMessageDialog(
                    this,
                    "Failed to add employee: " + e.getMessage(),
                    "Database Error",
                    JOptionPane.ERROR_MESSAGE
                );
            }
        }
    }

    /**
     * Allows the manager to modify details of the selected employee.
     * Updates the database and refreshes the table on success.
     */
    private void editEmployee() {

        // Identify the selected employee row
        int selectedRow = table.getSelectedRow();

        // Require a selection before editing
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(
                this,
                "Please select an employee to edit",
                "No Selection",
                JOptionPane.WARNING_MESSAGE
            );
            return;
        }

        // Extract current employee values from the table
        int employeeId = (int) model.getValueAt(selectedRow, 0);
        String currentName = (String) model.getValueAt(selectedRow, 1);
        String currentPosition = (String) model.getValueAt(selectedRow, 2);
        Object currentHireDateObj = model.getValueAt(selectedRow, 3);
        String currentHireDate = String.valueOf(currentHireDateObj);

        // Prepopulate fields with existing employee data
        JTextField nameField = new JTextField(currentName, 20);
        JTextField positionField = new JTextField(currentPosition, 20);
        JTextField hireDateField = new JTextField(currentHireDate, 10);

        JPanel panel = new JPanel(new GridLayout(3, 2, 5, 5));
        panel.add(new JLabel("Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Position:"));
        panel.add(positionField);
        panel.add(new JLabel("Hire Date (YYYY-MM-DD):"));
        panel.add(hireDateField);

        int result = JOptionPane.showConfirmDialog(
            this,
            panel,
            "Edit Employee",
            JOptionPane.OK_CANCEL_OPTION
        );

        if (result == JOptionPane.OK_OPTION) {

            // Read updated values from dialog
            String newName = nameField.getText().trim();
            String newPosition = positionField.getText().trim();
            String newHireDateStr = hireDateField.getText().trim();

            // Validate input fields
            if (newName.isEmpty() || newPosition.isEmpty() || newHireDateStr.isEmpty()) {
                JOptionPane.showMessageDialog(
                    this,
                    "Please fill in all fields",
                    "Validation Error",
                    JOptionPane.ERROR_MESSAGE
                );
                return;
            }

            try {
                Date newHireDate = Date.valueOf(newHireDateStr);

                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {

                    // Update selected employee record
                    PreparedStatement stmt = conn.prepareStatement(
                        "UPDATE employee SET name = ?, position = ?, hire_date = ? WHERE employee_id = ?"
                    );

                    stmt.setString(1, newName);
                    stmt.setString(2, newPosition);
                    stmt.setDate(3, newHireDate);
                    stmt.setInt(4, employeeId);

                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Updated employee ID: " + employeeId);
                    JOptionPane.showMessageDialog(this, "Employee updated successfully!");

                    // Refresh table to reflect changes
                    loadEmployee();
                }
            } catch (IllegalArgumentException e) {
                JOptionPane.showMessageDialog(
                    this,
                    "Invalid hire date format. Use YYYY-MM-DD",
                    "Validation Error",
                    JOptionPane.ERROR_MESSAGE
                );
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to update employee: " + e.getMessage());
                JOptionPane.showMessageDialog(
                    this,
                    "Failed to update employee: " + e.getMessage(),
                    "Database Error",
                    JOptionPane.ERROR_MESSAGE
                );
            }
        }
    }

    /**
     * Deletes the selected employee record after user confirmation.
     * The table is refreshed once deletion is complete.
     */
    private void deleteEmployee() {

        int selectedRow = table.getSelectedRow();

        // Ensure an employee is selected before deletion
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(
                this,
                "Please select an employee to delete",
                "No Selection",
                JOptionPane.WARNING_MESSAGE
            );
            return;
        }

        // Retrieve selected employee details
        int employeeId = (int) model.getValueAt(selectedRow, 0);
        String employeeName = (String) model.getValueAt(selectedRow, 1);

        // Confirm deletion action with the user
        int confirm = JOptionPane.showConfirmDialog(
            this,
            "Are you sure you want to delete '" + employeeName + "'?",
            "Confirm Delete",
            JOptionPane.YES_NO_OPTION
        );

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                Connection conn = DatabaseConnection.getConnection();
                if (conn != null) {

                    // Remove employee record from the database
                    PreparedStatement stmt = conn.prepareStatement(
                        "DELETE FROM employee WHERE employee_id = ?"
                    );

                    stmt.setInt(1, employeeId);
                    stmt.executeUpdate();
                    stmt.close();

                    System.out.println("[LOG] Deleted employee ID: " + employeeId);
                    JOptionPane.showMessageDialog(this, "Employee deleted successfully!");

                    // Refresh table after deletion
                    loadEmployee();
                }
            } catch (SQLException e) {
                System.err.println("[ERROR] Failed to delete employee: " + e.getMessage());
                JOptionPane.showMessageDialog(
                    this,
                    "Failed to delete employee: " + e.getMessage(),
                    "Database Error",
                    JOptionPane.ERROR_MESSAGE
                );
            }
        }
    }
}