package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ProductUsageChartPanel extends JPanel {
    private JTextField startDateField;
    private JTextField endDateField;
    private JTable usageTable;
    private DefaultTableModel tableModel;
    private JLabel totalItemsLabel;
    private JLabel totalUsedLabel;
    private JLabel avgUsageLabel;
    private BarChartPanel barChartPanel;

    // Simple data holder for chart
    private static class UsageEntry {
        String name;
        double used;
        UsageEntry(String name, double used) {
            this.name = name;
            this.used = used;
        }
    }

    // Inner panel that draws the bar chart
    private static class BarChartPanel extends JPanel {
        private List<UsageEntry> entries = new ArrayList<>();
        private static final int PADDING = 60;
        private static final int BAR_HEIGHT = 30;
        private static final int BAR_GAP = 10;
        private static final Color BAR_COLOR = new Color(70, 130, 180);
        private static final Color BAR_HOVER_COLOR = new Color(100, 160, 210);
        private int hoveredIndex = -1;

        public BarChartPanel() {
            setBackground(Color.WHITE);
            addMouseMotionListener(new java.awt.event.MouseMotionAdapter() {
                @Override
                public void mouseMoved(java.awt.event.MouseEvent e) {
                    int newHovered = getBarIndexAt(e.getY());
                    if (newHovered != hoveredIndex) {
                        hoveredIndex = newHovered;
                        repaint();
                    }
                }
            });
        }

        private int getBarIndexAt(int y) {
            for (int i = 0; i < entries.size(); i++) {
                int barY = PADDING + i * (BAR_HEIGHT + BAR_GAP);
                if (y >= barY && y <= barY + BAR_HEIGHT) return i;
            }
            return -1;
        }

        public void setData(List<UsageEntry> entries) {
            this.entries = entries;
            // Resize preferred height based on number of entries
            int height = PADDING * 2 + entries.size() * (BAR_HEIGHT + BAR_GAP);
            setPreferredSize(new Dimension(600, Math.max(height, 200)));
            revalidate();
            repaint();
        }

        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2 = (Graphics2D) g;
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            if (entries.isEmpty()) {
                g2.setColor(Color.GRAY);
                g2.setFont(new Font("Arial", Font.ITALIC, 14));
                g2.drawString("No data to display", getWidth() / 2 - 60, getHeight() / 2);
                return;
            }

            double maxVal = entries.stream().mapToDouble(e -> e.used).max().orElse(1.0);
            int chartWidth = getWidth() - PADDING * 2 - 160; // 160 for label on left

            // Draw title
            g2.setFont(new Font("Arial", Font.BOLD, 14));
            g2.setColor(Color.DARK_GRAY);
            g2.drawString("Units Used per Inventory Item", PADDING + 160, 30);

            // Draw axis line
            g2.setColor(Color.LIGHT_GRAY);
            g2.drawLine(PADDING + 160, PADDING - 10, PADDING + 160, PADDING + entries.size() * (BAR_HEIGHT + BAR_GAP));
            g2.drawLine(PADDING + 160, PADDING + entries.size() * (BAR_HEIGHT + BAR_GAP),
                    PADDING + 160 + chartWidth, PADDING + entries.size() * (BAR_HEIGHT + BAR_GAP));

            for (int i = 0; i < entries.size(); i++) {
                UsageEntry entry = entries.get(i);
                int barY = PADDING + i * (BAR_HEIGHT + BAR_GAP);
                int barW = (int) (entry.used / maxVal * chartWidth);

                // Draw label (right-aligned, truncated if needed)
                g2.setFont(new Font("Arial", Font.PLAIN, 12));
                g2.setColor(Color.DARK_GRAY);
                String label = entry.name;
                FontMetrics fm = g2.getFontMetrics();
                int maxLabelWidth = 155;
                while (fm.stringWidth(label) > maxLabelWidth && label.length() > 3) {
                    label = label.substring(0, label.length() - 4) + "...";
                }
                int labelX = PADDING + 155 - fm.stringWidth(label);
                int labelY = barY + BAR_HEIGHT / 2 + fm.getAscent() / 2 - 2;
                g2.drawString(label, labelX, labelY);

                // Draw bar
                Color barColor = (i == hoveredIndex) ? BAR_HOVER_COLOR : BAR_COLOR;
                g2.setColor(barColor);
                g2.fillRoundRect(PADDING + 160, barY, Math.max(barW, 2), BAR_HEIGHT, 6, 6);

                // Draw value label at end of bar
                g2.setColor(Color.DARK_GRAY);
                g2.setFont(new Font("Arial", Font.BOLD, 11));
                String valLabel = String.format("%.1f", entry.used);
                g2.drawString(valLabel, PADDING + 160 + barW + 5, barY + BAR_HEIGHT / 2 + 4);
            }
        }
    }

    public ProductUsageChartPanel() {
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Date selection panel
        JPanel datePanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 10));
        datePanel.add(new JLabel("Start Date (YYYY-MM-DD):"));
        startDateField = new JTextField(12);
        startDateField.setText(LocalDate.now().minusDays(7).toString());
        datePanel.add(startDateField);

        datePanel.add(new JLabel("End Date (YYYY-MM-DD):"));
        endDateField = new JTextField(12);
        endDateField.setText(LocalDate.now().toString());
        datePanel.add(endDateField);

        JButton generateButton = new JButton("Generate Report");
        generateButton.addActionListener(e -> loadUsageData());
        datePanel.add(generateButton);

        add(datePanel, BorderLayout.NORTH);

        // Table model
        String[] columns = {"Inventory Item", "Starting Quantity", "Used", "Remaining", "Usage %"};
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        usageTable = new JTable(tableModel);
        usageTable.setFont(new Font("Arial", Font.PLAIN, 14));
        usageTable.setRowHeight(25);
        usageTable.setAutoCreateRowSorter(true);

        // Bar chart panel
        barChartPanel = new BarChartPanel();
        JScrollPane chartScrollPane = new JScrollPane(barChartPanel);
        chartScrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        chartScrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);

        // Tabbed pane for table vs chart
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.addTab("Table View", new JScrollPane(usageTable));
        tabbedPane.addTab("Bar Chart", chartScrollPane);
        add(tabbedPane, BorderLayout.CENTER);

        // Summary panel
        JPanel summaryPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 20, 10));
        summaryPanel.setBorder(BorderFactory.createTitledBorder("Summary"));

        totalItemsLabel = new JLabel("Total Items: 0");
        totalItemsLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(totalItemsLabel);

        totalUsedLabel = new JLabel("Total Used: 0.0");
        totalUsedLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(totalUsedLabel);

        avgUsageLabel = new JLabel("Avg Usage: 0.0%");
        avgUsageLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(avgUsageLabel);

        add(summaryPanel, BorderLayout.SOUTH);

        loadUsageData();
    }

    private void loadUsageData() {
        tableModel.setRowCount(0);

        String startDate = startDateField.getText().trim();
        String endDate = endDateField.getText().trim();

        try {
            LocalDate.parse(startDate);
            LocalDate.parse(endDate);
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this,
                    "Invalid date format. Use YYYY-MM-DD",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
            return;
        }

        String sql =
            "WITH period_orders AS ( " +
            "    SELECT oi.menu_item_id, SUM(oi.quantity) as items_sold " +
            "    FROM customer_order co " +
            "    JOIN order_item oi ON co.order_id = oi.order_id " +
            "    WHERE DATE(co.order_date) BETWEEN ? AND ? " +
            "    GROUP BY oi.menu_item_id " +
            "), " +
            "inventory_usage AS ( " +
            "    SELECT  " +
            "        i.inventory_id, " +
            "        i.resource_name, " +
            "        i.quantity_available as current_qty, " +
            "        COALESCE(SUM(po.items_sold * mii.quantity_used), 0) as qty_used " +
            "    FROM inventory i " +
            "    LEFT JOIN menu_item_inventory mii ON i.inventory_id = mii.inventory_id " +
            "    LEFT JOIN period_orders po ON mii.menu_item_id = po.menu_item_id " +
            "    GROUP BY i.inventory_id, i.resource_name, i.quantity_available " +
            ") " +
            "SELECT  " +
            "    resource_name, " +
            "    (current_qty + qty_used) as starting_qty, " +
            "    qty_used, " +
            "    current_qty as remaining_qty, " +
            "    CASE  " +
            "        WHEN (current_qty + qty_used) > 0  " +
            "        THEN ROUND((qty_used * 100.0 / (current_qty + qty_used))::numeric, 1) " +
            "        ELSE 0  " +
            "    END as usage_percent " +
            "FROM inventory_usage " +
            "WHERE qty_used > 0 " +
            "ORDER BY qty_used DESC;";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setDate(1, Date.valueOf(startDate));
            ps.setDate(2, Date.valueOf(endDate));

            ResultSet rs = ps.executeQuery();

            int itemCount = 0;
            double totalUsed = 0.0;
            double totalUsagePercent = 0.0;
            List<UsageEntry> chartEntries = new ArrayList<>();

            while (rs.next()) {
                String resourceName = rs.getString("resource_name");
                double startingQty = rs.getDouble("starting_qty");
                double used = rs.getDouble("qty_used");
                double remaining = rs.getDouble("remaining_qty");
                double usagePercent = rs.getDouble("usage_percent");

                tableModel.addRow(new Object[]{
                    resourceName,
                    String.format("%.1f", startingQty),
                    String.format("%.1f", used),
                    String.format("%.1f", remaining),
                    String.format("%.1f%%", usagePercent)
                });

                chartEntries.add(new UsageEntry(resourceName, used));

                itemCount++;
                totalUsed += used;
                totalUsagePercent += usagePercent;
            }

            rs.close();

            // Update bar chart
            barChartPanel.setData(chartEntries);

            // Update summary
            totalItemsLabel.setText("Total Items: " + itemCount);
            totalUsedLabel.setText(String.format("Total Used: %.1f units", totalUsed));
            if (itemCount > 0) {
                avgUsageLabel.setText(String.format("Avg Usage: %.1f%%", totalUsagePercent / itemCount));
            } else {
                avgUsageLabel.setText("Avg Usage: 0.0%");
            }

            if (tableModel.getRowCount() == 0) {
                JOptionPane.showMessageDialog(this,
                    "No inventory usage found for the selected period.",
                    "No Data",
                    JOptionPane.INFORMATION_MESSAGE);
            }

        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this,
                "Error loading usage data: " + e.getMessage(),
                "Database Error",
                JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }
}