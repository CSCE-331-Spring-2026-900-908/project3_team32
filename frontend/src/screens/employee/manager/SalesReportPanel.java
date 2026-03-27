package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;
import java.time.LocalDate;

/**
 * Sales Report Panel for displaying sales data by menu item over a time period.
 * Provides both tabular data and visual bar chart representation of top sellers.
 * 
 * @author Team 32
 */
public class SalesReportPanel extends JPanel {
    private JTextField startDateField;
    private JTextField endDateField;
    private JTable salesTable;
    private DefaultTableModel tableModel;
    private JLabel totalItemsLabel;
    private JLabel totalQuantityLabel;
    private JLabel totalRevenueLabel;
    private JPanel chartPanel;
    private java.util.List<SalesData> salesDataList;
    
    /**
     * Constructs a new SalesReportPanel with date selectors, data table, and visualization chart.
     * Initializes with default date range of last 30 days and loads initial sales data.
     */
    public SalesReportPanel() {
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        // Title and date selection panel
        JPanel topPanel = new JPanel(new BorderLayout());
        
        JLabel titleLabel = new JLabel("Sales Report by Item");
        titleLabel.setFont(new Font("Arial", Font.BOLD, 20));
        topPanel.add(titleLabel, BorderLayout.NORTH);
        
        JPanel datePanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 10));
        datePanel.add(new JLabel("Start Date (YYYY-MM-DD):"));
        startDateField = new JTextField(12);
        startDateField.setText(LocalDate.now().minusDays(30).toString());
        datePanel.add(startDateField);
        
        datePanel.add(new JLabel("End Date (YYYY-MM-DD):"));
        endDateField = new JTextField(12);
        endDateField.setText(LocalDate.now().toString());
        datePanel.add(endDateField);
        
        JButton generateButton = new JButton("Generate Report");
        generateButton.setFont(new Font("Arial", Font.PLAIN, 14));
        generateButton.addActionListener(e -> loadSalesData());
        datePanel.add(generateButton);
        
        topPanel.add(datePanel, BorderLayout.SOUTH);
        add(topPanel, BorderLayout.NORTH);
        
        // Main content area with split pane
        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT);
        splitPane.setResizeWeight(0.6);
        
        // Left side: Table
        JPanel tablePanel = new JPanel(new BorderLayout());
        
        // Table for sales data
        String[] columns = {"Menu Item", "Category", "Quantity Sold", "Revenue", "Avg Price", "% of Total"};
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        salesTable = new JTable(tableModel);
        salesTable.setFont(new Font("Arial", Font.PLAIN, 14));
        salesTable.setRowHeight(25);
        
        JScrollPane scrollPane = new JScrollPane(salesTable);
        tablePanel.add(scrollPane, BorderLayout.CENTER);
        
        splitPane.setLeftComponent(tablePanel);
        
        // Right side: Visual chart
        JPanel rightPanel = new JPanel(new BorderLayout());
        JLabel chartTitle = new JLabel("Top 10 Items by Revenue", SwingConstants.CENTER);
        chartTitle.setFont(new Font("Arial", Font.BOLD, 16));
        rightPanel.add(chartTitle, BorderLayout.NORTH);
        
        chartPanel = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                drawBarChart(g);
            }
        };
        chartPanel.setBackground(Color.WHITE);
        chartPanel.setBorder(BorderFactory.createLineBorder(Color.GRAY));
        rightPanel.add(chartPanel, BorderLayout.CENTER);
        
        splitPane.setRightComponent(rightPanel);
        
        add(splitPane, BorderLayout.CENTER);
        
        // Summary panel
        JPanel summaryPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 30, 10));
        summaryPanel.setBorder(BorderFactory.createTitledBorder("Summary"));
        
        totalItemsLabel = new JLabel("Total Items: 0");
        totalItemsLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(totalItemsLabel);
        
        totalQuantityLabel = new JLabel("Total Quantity: 0");
        totalQuantityLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(totalQuantityLabel);
        
        totalRevenueLabel = new JLabel("Total Revenue: $0.00");
        totalRevenueLabel.setFont(new Font("Arial", Font.BOLD, 14));
        summaryPanel.add(totalRevenueLabel);
        
        add(summaryPanel, BorderLayout.SOUTH);
        
        // Load initial data
        salesDataList = new java.util.ArrayList<>();
        loadSalesData();
    }
    
    /**
     * Helper class to store sales data for chart visualization.
     * Contains item name and revenue information for a single menu item.
     * 
     * @author Team 32
     */
    private static class SalesData {
        String itemName;
        double revenue;
        
        /**
         * Creates a new SalesData object.
         * 
         * @param itemName the name of the menu item
         * @param revenue the total revenue generated by this item
         */
        SalesData(String itemName, double revenue) {
            this.itemName = itemName;
            this.revenue = revenue;
        }
    }
    
    /**
     * Draws a horizontal bar chart showing top 10 items by revenue.
     * Uses color-coded bars with item names and revenue values displayed.
     * 
     * @param g the Graphics context to draw on
     */
    private void drawBarChart(Graphics g) {
        if (salesDataList == null || salesDataList.isEmpty()) {
            g.setFont(new Font("Arial", Font.PLAIN, 14));
            g.drawString("No data to display", chartPanel.getWidth() / 2 - 50, chartPanel.getHeight() / 2);
            return;
        }
        
        Graphics2D g2d = (Graphics2D) g;
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        int width = chartPanel.getWidth();
        int height = chartPanel.getHeight();
        int margin = 40;
        int barHeight = 30;
        int spacing = 10;
        
        // Get top 10 items
        java.util.List<SalesData> topItems = salesDataList.stream()
            .limit(10)
            .collect(java.util.stream.Collectors.toList());
        
        if (topItems.isEmpty()) return;
        
        // Find max revenue for scaling
        double maxRevenue = topItems.stream()
            .mapToDouble(sd -> sd.revenue)
            .max()
            .orElse(1.0);
        
        int chartWidth = width - 2 * margin - 150; // Leave space for labels
        int chartHeight = topItems.size() * (barHeight + spacing);
        int startY = Math.max(margin, (height - chartHeight) / 2);
        
        // Draw bars
        Color[] colors = {
            new Color(66, 133, 244),
            new Color(52, 168, 83),
            new Color(251, 188, 5),
            new Color(234, 67, 53),
            new Color(154, 160, 166),
            new Color(255, 109, 0),
            new Color(156, 39, 176),
            new Color(0, 172, 193),
            new Color(76, 175, 80),
            new Color(255, 152, 0)
        };
        
        for (int i = 0; i < topItems.size(); i++) {
            SalesData data = topItems.get(i);
            int y = startY + i * (barHeight + spacing);
            int barWidth = (int) ((data.revenue / maxRevenue) * chartWidth);
            
            // Draw bar
            g2d.setColor(colors[i % colors.length]);
            g2d.fillRect(margin + 150, y, barWidth, barHeight);
            
            // Draw item name
            g2d.setColor(Color.BLACK);
            g2d.setFont(new Font("Arial", Font.PLAIN, 11));
            String itemName = data.itemName;
            if (itemName.length() > 18) {
                itemName = itemName.substring(0, 15) + "...";
            }
            g2d.drawString(itemName, margin, y + barHeight / 2 + 5);
            
            // Draw revenue value
            g2d.setFont(new Font("Arial", Font.BOLD, 11));
            String revenueStr = String.format("$%.2f", data.revenue);
            g2d.drawString(revenueStr, margin + 150 + barWidth + 5, y + barHeight / 2 + 5);
        }
    }
    
    /**
     * Loads sales data from the database for the selected date range.
     * Queries order history to aggregate sales by menu item including quantity sold,
     * revenue, average price, and percentage of total sales.
     * Updates both the data table and visualization chart with results.
     * 
     * @throws SQLException if database connection or query execution fails
     */
    private void loadSalesData() {
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
            "WITH sales_data AS ( " +
            "    SELECT  " +
            "        m.name as item_name, " +
            "        m.category, " +
            "        SUM(oi.quantity) as qty_sold, " +
            "        SUM(oi.quantity * oi.item_price) as revenue, " +
            "        AVG(oi.item_price) as avg_price " +
            "    FROM customer_order co " +
            "    JOIN order_item oi ON co.order_id = oi.order_id " +
            "    JOIN menu_item m ON oi.menu_item_id = m.menu_item_id " +
            "    WHERE DATE(co.order_date) BETWEEN ? AND ? " +
            "    GROUP BY m.menu_item_id, m.name, m.category " +
            "), " +
            "total_revenue AS ( " +
            "    SELECT SUM(revenue) as total FROM sales_data " +
            ") " +
            "SELECT  " +
            "    sd.item_name, " +
            "    COALESCE(sd.category, 'Uncategorized') as category, " +
            "    sd.qty_sold, " +
            "    sd.revenue, " +
            "    sd.avg_price, " +
            "    ROUND((sd.revenue * 100.0 / NULLIF(tr.total, 0))::numeric, 1) as percent_of_total " +
            "FROM sales_data sd " +
            "CROSS JOIN total_revenue tr " +
            "ORDER BY sd.revenue DESC;";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setDate(1, Date.valueOf(startDate));
            ps.setDate(2, Date.valueOf(endDate));
            
            ResultSet rs = ps.executeQuery();
            
            int totalItems = 0;
            int totalQuantity = 0;
            double totalRevenue = 0.0;
            salesDataList.clear();
            
            while (rs.next()) {
                String itemName = rs.getString("item_name");
                String category = rs.getString("category");
                int qtySold = rs.getInt("qty_sold");
                double revenue = rs.getDouble("revenue");
                double avgPrice = rs.getDouble("avg_price");
                double percentOfTotal = rs.getDouble("percent_of_total");
                
                tableModel.addRow(new Object[]{
                    itemName,
                    category,
                    qtySold,
                    String.format("$%.2f", revenue),
                    String.format("$%.2f", avgPrice),
                    String.format("%.1f%%", percentOfTotal)
                });
                
                // Store for chart
                salesDataList.add(new SalesData(itemName, revenue));
                
                totalItems++;
                totalQuantity += qtySold;
                totalRevenue += revenue;
            }
            
            rs.close();
            
            // Update summary
            totalItemsLabel.setText("Total Items: " + totalItems);
            totalQuantityLabel.setText("Total Quantity: " + totalQuantity);
            totalRevenueLabel.setText(String.format("Total Revenue: $%.2f", totalRevenue));
            
            // Repaint chart
            chartPanel.repaint();
            
            if (tableModel.getRowCount() == 0) {
                JOptionPane.showMessageDialog(this,
                    "No sales found for the selected period.",
                    "No Data",
                    JOptionPane.INFORMATION_MESSAGE);
            }
            
        } catch (SQLException e) {
            JOptionPane.showMessageDialog(this,
                "Error loading sales data: " + e.getMessage(),
                "Database Error",
                JOptionPane.ERROR_MESSAGE);
            e.printStackTrace();
        }
    }
}
