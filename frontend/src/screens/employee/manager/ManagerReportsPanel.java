package manager;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import common.DatabaseConnection;

public class ManagerReportsPanel extends JPanel {
    private JTextField dateField;
    private JLabel totalProfitLabel;

    private JTable itemsTable;
    private DefaultTableModel itemsModel;

    private JTable employeeTable;
    private DefaultTableModel employeeModel;

    public ManagerReportsPanel() {
        setLayout(new BorderLayout());

        JPanel top = new JPanel(new FlowLayout(FlowLayout.LEFT));
        top.add(new JLabel("Date (YYYY-MM-DD):"));

        dateField = new JTextField(12);
        dateField.setText(LocalDate.now().toString());
        top.add(dateField);

        JButton run = new JButton("Run Report");
        top.add(run);

        totalProfitLabel = new JLabel("Total Profit: $0.00");
        top.add(Box.createHorizontalStrut(20));
        top.add(totalProfitLabel);

        add(top, BorderLayout.NORTH);

        JTabbedPane tabs = new JTabbedPane();

        String[] itemCols = {"Menu Item ID", "Item Name", "Qty Sold", "Revenue"};
        itemsModel = new DefaultTableModel(itemCols, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        itemsTable = new JTable(itemsModel);
        tabs.addTab("Items Sold", new JScrollPane(itemsTable));

        String[] empCols = {"Employee ID", "Employee Name", "# Sales", "Revenue"};
        employeeModel = new DefaultTableModel(empCols, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        employeeTable = new JTable(employeeModel);
        tabs.addTab("Sales per Employee", new JScrollPane(employeeTable));

        add(tabs, BorderLayout.CENTER);

        JPanel buttons = new JPanel();
        JButton refresh = new JButton("Refresh");
        JButton clear = new JButton("Clear");
        buttons.add(refresh);
        buttons.add(clear);

        add(buttons, BorderLayout.SOUTH);

        run.addActionListener(e -> runReportFromInput(true));
        refresh.addActionListener(e -> runReportFromInput(true));
        clear.addActionListener(e -> clearTables());

        runReportFromInput(false);
    }

    private void runReportFromInput(boolean showPopupIfNoOrders) {
        LocalDate date;
        try {
            date = LocalDate.parse(dateField.getText().trim());
        } catch (DateTimeParseException ex) {
            JOptionPane.showMessageDialog(this, "Invalid date format. Use YYYY-MM-DD.");
            return;
        }

        clearTables();

        loadItemsSold(date);
        loadSalesPerEmployee(date);
        loadTotalProfit(date);

        boolean noOrders =
            (itemsModel.getRowCount() == 0) &&
            (employeeModel.getRowCount() == 0);

        if (showPopupIfNoOrders && noOrders) {
            JOptionPane.showMessageDialog(
                this,
                "No orders found for " + date + ".",
                "No Orders",
                JOptionPane.INFORMATION_MESSAGE
            );
        }
    }

    private void clearTables() {
        itemsModel.setRowCount(0);
        employeeModel.setRowCount(0);
        totalProfitLabel.setText("Total Profit: $0.00");
    }

    private void loadItemsSold(LocalDate day) {
        itemsModel.setRowCount(0);

        String sql =
            "SELECT oi.menu_item_id, m.name AS item_name, " +
            "SUM(oi.quantity) AS qty_sold, " +
            "SUM(oi.quantity * oi.item_price) AS revenue " +
            "FROM customer_order o " +
            "JOIN order_item oi ON o.order_id = oi.order_id " +
            "JOIN menu_item m ON oi.menu_item_id = m.menu_item_id " +
            "WHERE DATE(o.order_date) = ? " +
            "GROUP BY oi.menu_item_id, m.name " +
            "ORDER BY qty_sold DESC, item_name ASC;";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setDate(1, Date.valueOf(day));

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    itemsModel.addRow(new Object[]{
                        rs.getInt("menu_item_id"),
                        rs.getString("item_name"),
                        rs.getLong("qty_sold"),
                        String.format("$%.2f", rs.getDouble("revenue"))
                    });
                }
            }
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, e.getMessage());
        }
    }

    private void loadSalesPerEmployee(LocalDate day) {
        employeeModel.setRowCount(0);

        String sql =
            "SELECT e.employee_id, e.name AS employee_name, " +
            "COUNT(o.order_id) AS sales_count, " +
            "COALESCE(SUM(o.total_cost), 0) AS revenue " +
            "FROM customer_order o " +
            "JOIN employee e ON o.employee_id = e.employee_id " +
            "WHERE DATE(o.order_date) = ? " +
            "GROUP BY e.employee_id, e.name " +
            "ORDER BY sales_count DESC;";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setDate(1, Date.valueOf(day));

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    employeeModel.addRow(new Object[]{
                        rs.getInt("employee_id"),
                        rs.getString("employee_name"),
                        rs.getLong("sales_count"),
                        String.format("$%.2f", rs.getDouble("revenue"))
                    });
                }
            }
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, e.getMessage());
        }
    }

    private void loadTotalProfit(LocalDate day) {
        String sql =
            "SELECT COALESCE(SUM(total_cost), 0) AS total_revenue " +
            "FROM customer_order WHERE DATE(order_date) = ?;";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setDate(1, Date.valueOf(day));

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    totalProfitLabel.setText(
                        String.format("Total Profit: $%.2f", rs.getDouble("total_revenue"))
                    );
                }
            }
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, e.getMessage());
        }
    }
}