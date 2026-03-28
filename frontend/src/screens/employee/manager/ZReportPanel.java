package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;
import java.time.LocalDate;

public class ZReportPanel extends JPanel {

    private JTextField dateField;
    private JTextArea summaryArea;
    private DefaultTableModel paymentModel;
    private JButton runButton;

    public ZReportPanel() {

        setLayout(new BorderLayout(8, 8));

        JPanel header = new JPanel(new FlowLayout(FlowLayout.LEFT));
        header.add(new JLabel("Date (YYYY-MM-DD):"));

        dateField = new JTextField(12);
        dateField.setText(LocalDate.now().toString());
        header.add(dateField);

        runButton = new JButton("Run Z-Report");
        runButton.addActionListener(e -> runZ());
        header.add(runButton);

        add(header, BorderLayout.NORTH);

        summaryArea = new JTextArea(14, 80);
        summaryArea.setEditable(false);
        add(new JScrollPane(summaryArea), BorderLayout.CENTER);

        String[] cols = {"Payment Method", "Count", "Total", "Pct"};
        paymentModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int r, int c) {
                return false;
            }
        };

        JTable payTable = new JTable(paymentModel);
        add(new JScrollPane(payTable), BorderLayout.EAST);
    }

    private void runZ() {

        String dateStr = dateField.getText().trim();

        try {
            LocalDate.parse(dateStr);
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this,
                    "Invalid date format. Use YYYY-MM-DD",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(this,
                "Close day and generate Z-Report?",
                "Confirm",
                JOptionPane.YES_NO_OPTION);

        if (confirm != JOptionPane.YES_OPTION)
            return;

        try (Connection conn = DatabaseConnection.getConnection()) {

            conn.setAutoCommit(false);

            // Ensure table exists
            try (Statement s = conn.createStatement()) {
                s.execute(
                        "CREATE TABLE IF NOT EXISTS z_report_runs (" +
                        "run_date DATE PRIMARY KEY, " +
                        "run_at TIMESTAMP NOT NULL DEFAULT NOW()" +
                        ");"
                );
            }

            // Attempt to insert immediately (this enforces single run)
            try (PreparedStatement insertRun = conn.prepareStatement(
                    "INSERT INTO z_report_runs(run_date) VALUES (?)")) {

                insertRun.setDate(1, Date.valueOf(dateStr));
                insertRun.executeUpdate();

            } catch (SQLException e) {

                // PostgreSQL duplicate key violation
                if ("23505".equals(e.getSQLState())) {
                    conn.rollback();
                    JOptionPane.showMessageDialog(this,
                            "Z-Report already generated for this date.",
                            "Already Generated",
                            JOptionPane.WARNING_MESSAGE);
                    return;
                } else {
                    throw e;
                }
            }

            int totalOrders = 0;
            double totalSales = 0.0;
            double totalCash = 0.0;

            // Totals
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COUNT(*), COALESCE(SUM(total_cost),0) " +
                    "FROM customer_order WHERE DATE(order_date)=?")) {

                ps.setDate(1, Date.valueOf(dateStr));
                ResultSet rs = ps.executeQuery();

                if (rs.next()) {
                    totalOrders = rs.getInt(1);
                    totalSales = rs.getDouble(2);
                }
            }

            // Total Cash
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COALESCE(SUM(total_cost),0) " +
                    "FROM customer_order " +
                    "WHERE DATE(order_date)=? AND payment_type='Cash'")) {

                ps.setDate(1, Date.valueOf(dateStr));
                ResultSet rs = ps.executeQuery();

                if (rs.next()) {
                    totalCash = rs.getDouble(1);
                }
            }

            // Payment breakdown
            paymentModel.setRowCount(0);

            try (PreparedStatement ps = conn.prepareStatement(
                    "WITH pt AS (" +
                    " SELECT COALESCE(payment_type,'Not Specified') AS method," +
                    " COUNT(*) AS cnt," +
                    " SUM(total_cost) AS total" +
                    " FROM customer_order" +
                    " WHERE DATE(order_date)=?" +
                    " GROUP BY payment_type)," +
                    " grand AS (" +
                    " SELECT COALESCE(SUM(total_cost),0) AS g" +
                    " FROM customer_order WHERE DATE(order_date)=?)" +
                    " SELECT method, cnt, total," +
                    " ROUND((total * 100.0 / NULLIF(g,0))::numeric,1)" +
                    " FROM pt CROSS JOIN grand")) {

                ps.setDate(1, Date.valueOf(dateStr));
                ps.setDate(2, Date.valueOf(dateStr));

                ResultSet rs = ps.executeQuery();

                while (rs.next()) {
                    paymentModel.addRow(new Object[]{
                            rs.getString(1),
                            rs.getInt(2),
                            String.format("$%.2f", rs.getDouble(3)),
                            String.format("%.1f%%", rs.getDouble(4))
                    });
                }
            }

            // Employee summary
            StringBuilder sb = new StringBuilder();

            sb.append("Z-Report for ").append(dateStr).append("\n\n");
            sb.append("Total Orders: ").append(totalOrders).append("\n");
            sb.append(String.format("Total Sales: $%.2f\n", totalSales));
            sb.append(String.format("Total Cash: $%.2f\n\n", totalCash));

            sb.append("Employee Summary:\n");

            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COALESCE(e.name,'Unknown'), COUNT(*)" +
                    " FROM customer_order o" +
                    " LEFT JOIN employee e ON o.employee_id=e.employee_id" +
                    " WHERE DATE(order_date)=?" +
                    " GROUP BY e.name" +
                    " ORDER BY COUNT(*) DESC")) {

                ps.setDate(1, Date.valueOf(dateStr));
                ResultSet rs = ps.executeQuery();

                while (rs.next()) {
                    sb.append(" - ")
                      .append(rs.getString(1))
                      .append(" : ")
                      .append(rs.getInt(2))
                      .append(" orders\n");
                }
            }

            sb.append("\n");
            sb.append("Manager Signature: ____________________________\n");
            sb.append("Date: ____________________________\n");

            summaryArea.setText(sb.toString());

            conn.commit();

            JOptionPane.showMessageDialog(this,
                    "Z-Report successfully generated.",
                    "Success",
                    JOptionPane.INFORMATION_MESSAGE);

        } catch (SQLException ex) {
            ex.printStackTrace();
            JOptionPane.showMessageDialog(this,
                    "Database error: " + ex.getMessage(),
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
        }
    }
}