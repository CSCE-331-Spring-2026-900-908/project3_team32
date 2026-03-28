package manager;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.RenderingHints;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;

import java.nio.charset.StandardCharsets;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class XReportPanel extends JPanel {

    private static final DateTimeFormatter ORDER_TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final int OPEN_HOUR = 8;
    private static final int CLOSE_HOUR = 21; // last hour shown is 21:00-21:59 (removes 22:00-22:59)

    private static final String DATA_DIR = "../data/";
    private static final String ORDERS_FILE = DATA_DIR + "customer_orders.csv";
    private static final String ORDER_ITEMS_FILE = DATA_DIR + "order_items.csv";
    private static final String MENU_FILE = DATA_DIR + "menu_items.csv";
    private static final String EMPLOYEE_FILE = DATA_DIR + "employees.csv";

    private JTextField dateField;

    private DefaultTableModel hourlyModel;
    private GraphsPanel graphsPanel;

    public XReportPanel() {
        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        add(buildTop(), BorderLayout.NORTH);
        add(buildTabs(), BorderLayout.CENTER);
    }

    private JPanel buildTop() {
        JPanel top = new JPanel(new BorderLayout(10, 10));

        JPanel controls = new JPanel();

        controls.add(new JLabel("Date (YYYY-MM-DD):"));

        dateField = new JTextField(12);
        dateField.setText(LocalDate.now().toString());
        controls.add(dateField);

        JButton loadBtn = new JButton("Load X-Report");
        loadBtn.addActionListener(e -> loadReport());
        controls.add(loadBtn);

        top.add(controls, BorderLayout.WEST);
        return top;
    }

    private JTabbedPane buildTabs() {
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Hourly Breakdown", buildHourlyTab());
        tabs.addTab("Graphs", buildGraphsTab());
        return tabs;
    }

    private JPanel buildHourlyTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));

        String[] cols = {
                "Hour",
                "Transactions",
                "Items Sold",
                "Avg Order Cost",
                "Top Employee (Transactions)",
                "Top Item (Qty)"
        };

        hourlyModel = new DefaultTableModel(cols, 0) {
            @Override public boolean isCellEditable(int r, int c) { return false; }
        };

        JTable table = new JTable(hourlyModel);
        table.setFont(new Font("Arial", Font.PLAIN, 14));
        table.setRowHeight(24);

        panel.add(new JScrollPane(table), BorderLayout.CENTER);
        return panel;
    }

    private JPanel buildGraphsTab() {
        graphsPanel = new GraphsPanel(OPEN_HOUR, CLOSE_HOUR);
        return graphsPanel;
    }

    private void loadReport() {
        LocalDate day;
        try {
            day = LocalDate.parse(dateField.getText().trim());
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "Invalid date format. Use YYYY-MM-DD", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        List<OrderRow> orders;
        List<OrderItemRow> items;
        Map<Long, String> menuNameById;
        Map<Long, String> employeeNameById;

        try {
            orders = readOrders(ORDERS_FILE);
            items = readOrderItems(ORDER_ITEMS_FILE);
            menuNameById = readMenuNames(MENU_FILE);
            employeeNameById = readEmployeeNames(EMPLOYEE_FILE);
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "CSV read error: " + e.getMessage(), "CSV Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        Map<Long, List<OrderItemRow>> itemsByOrder = new HashMap<>();
        for (OrderItemRow it : items) {
            itemsByOrder.computeIfAbsent(it.orderId, k -> new ArrayList<>()).add(it);
        }

        List<OrderRow> todaysOrders = new ArrayList<>();
        for (OrderRow o : orders) {
            if (o.orderDate.toLocalDate().equals(day)) todaysOrders.add(o);
        }

        int[] txnByHour = new int[24];
        int[] itemsByHour = new int[24];
        double[] salesByHour = new double[24];

        @SuppressWarnings("unchecked")
        Map<Long, Integer>[] empTxnByHour = new HashMap[24];   // NEW: employee txns
        @SuppressWarnings("unchecked")
        Map<Long, Integer>[] menuQtyByHour = new HashMap[24];

        for (int h = 0; h < 24; h++) {
            empTxnByHour[h] = new HashMap<>();
            menuQtyByHour[h] = new HashMap<>();
        }

        for (OrderRow o : todaysOrders) {
            int h = o.orderDate.getHour();
            if (h < OPEN_HOUR || h > CLOSE_HOUR) continue;

            txnByHour[h]++;
            salesByHour[h] += o.totalCost;

            // count transaction for this employee in this hour
            empTxnByHour[h].put(o.employeeId, empTxnByHour[h].getOrDefault(o.employeeId, 0) + 1);

            List<OrderItemRow> its = itemsByOrder.getOrDefault(o.orderId, Collections.emptyList());
            for (OrderItemRow it : its) {
                itemsByHour[h] += it.quantity;
                menuQtyByHour[h].put(it.menuItemId, menuQtyByHour[h].getOrDefault(it.menuItemId, 0) + it.quantity);
            }
        }

        hourlyModel.setRowCount(0);

        for (int h = OPEN_HOUR; h <= CLOSE_HOUR; h++) {
            int txns = txnByHour[h];
            int totalItems = itemsByHour[h];
            double avgOrder = txns == 0 ? 0.0 : (salesByHour[h] / txns);

            long topEmpId = -1;
            int topEmpTxns = 0;
            for (Map.Entry<Long, Integer> e : empTxnByHour[h].entrySet()) {
                if (e.getValue() > topEmpTxns) {
                    topEmpTxns = e.getValue();
                    topEmpId = e.getKey();
                }
            }
            String topEmpCell = (topEmpId == -1)
                    ? "N/A"
                    : employeeNameById.getOrDefault(topEmpId, "Employee " + topEmpId) + " (" + topEmpTxns + ")";

            long topMenuId = -1;
            int topMenuQty = 0;
            for (Map.Entry<Long, Integer> e : menuQtyByHour[h].entrySet()) {
                if (e.getValue() > topMenuQty) {
                    topMenuQty = e.getValue();
                    topMenuId = e.getKey();
                }
            }
            String topItemCell = (topMenuId == -1)
                    ? "N/A"
                    : menuNameById.getOrDefault(topMenuId, "Item " + topMenuId) + " (" + topMenuQty + ")";

            hourlyModel.addRow(new Object[]{
                    String.format("%02d:00 - %02d:59", h, h),
                    txns,
                    totalItems,
                    String.format("$%.2f", avgOrder),
                    topEmpCell,
                    topItemCell
            });
        }

        graphsPanel.setSeries(txnByHour, itemsByHour);

        boolean anyOrdersInOpenHours = false;
        for (OrderRow o : todaysOrders) {
            int h = o.orderDate.getHour();
            if (h >= OPEN_HOUR && h <= CLOSE_HOUR) {
                anyOrdersInOpenHours = true;
                break;
            }
        }

        if (!anyOrdersInOpenHours) {
            JOptionPane.showMessageDialog(this, "No orders found for " + day, "No Orders", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private static class OrderRow {
        final long orderId;
        final LocalDateTime orderDate;
        final double totalCost;
        final long employeeId;

        OrderRow(long orderId, LocalDateTime orderDate, double totalCost, long employeeId) {
            this.orderId = orderId;
            this.orderDate = orderDate;
            this.totalCost = totalCost;
            this.employeeId = employeeId;
        }
    }

    private static class OrderItemRow {
        final long orderId;
        final long menuItemId;
        final int quantity;

        OrderItemRow(long orderId, long menuItemId, int quantity) {
            this.orderId = orderId;
            this.menuItemId = menuItemId;
            this.quantity = quantity;
        }
    }

    private static List<OrderRow> readOrders(String path) throws IOException {
        File f = new File(path);
        if (!f.exists()) throw new FileNotFoundException("File not found: " + path);

        List<OrderRow> out = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return out;

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] p = splitCsvLine(line);
                if (p.length < 4) continue;

                long orderId = parseLongSafe(p[0]);
                LocalDateTime ts = LocalDateTime.parse(p[1].trim(), ORDER_TS_FMT);
                double total = parseDoubleSafe(p[2]);
                long emp = parseLongSafe(p[3]);

                out.add(new OrderRow(orderId, ts, total, emp));
            }
        }
        return out;
    }

    private static List<OrderItemRow> readOrderItems(String path) throws IOException {
        File f = new File(path);
        if (!f.exists()) throw new FileNotFoundException("File not found: " + path);

        List<OrderItemRow> out = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return out;

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] p = splitCsvLine(line);
                if (p.length < 4) continue;

                long orderId = parseLongSafe(p[1]);
                long menuItemId = parseLongSafe(p[2]);
                int qty = (int) parseLongSafe(p[3]);

                out.add(new OrderItemRow(orderId, menuItemId, qty));
            }
        }
        return out;
    }

    private static Map<Long, String> readMenuNames(String path) throws IOException {
        File f = new File(path);
        if (!f.exists()) throw new FileNotFoundException("File not found: " + path);

        Map<Long, String> map = new HashMap<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return map;

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] p = splitCsvLine(line);
                if (p.length < 2) continue;

                long id = parseLongSafe(p[0]);
                String name = p[1].trim();
                map.put(id, name);
            }
        }
        return map;
    }

    private static Map<Long, String> readEmployeeNames(String path) throws IOException {
        File f = new File(path);
        if (!f.exists()) throw new FileNotFoundException("File not found: " + path);

        Map<Long, String> map = new HashMap<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String header = br.readLine();
            if (header == null) return map;

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] p = splitCsvLine(line);
                if (p.length < 2) continue;

                long id = parseLongSafe(p[0]);
                String name = p[1].trim();
                map.put(id, name);
            }
        }
        return map;
    }

    private static long parseLongSafe(String s) {
        try { return Long.parseLong(s.trim()); } catch (Exception e) { return 0; }
    }

    private static double parseDoubleSafe(String s) {
        try { return Double.parseDouble(s.trim()); } catch (Exception e) { return 0.0; }
    }

    private static String[] splitCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') { inQuotes = !inQuotes; continue; }
            if (c == ',' && !inQuotes) {
                fields.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        fields.add(cur.toString());
        return fields.toArray(new String[0]);
    }

    private static class GraphsPanel extends JPanel {
        private int[] txns = new int[24];
        private int[] items = new int[24];

        GraphsPanel(int openHour, int closeHour) {
            setLayout(new GridLayout(2, 1, 10, 10));
            add(new BarChartPanel("Transactions per Hour", openHour, closeHour) {
                @Override protected double valueAt(int hour) { return txns[hour]; }
            });
            add(new BarChartPanel("Items per Hour", openHour, closeHour) {
                @Override protected double valueAt(int hour) { return items[hour]; }
            });
        }

        void setSeries(int[] txnsByHour, int[] itemsByHour) {
            this.txns = Arrays.copyOf(txnsByHour, txnsByHour.length);
            this.items = Arrays.copyOf(itemsByHour, itemsByHour.length);
            repaint();
        }
    }

    private static abstract class BarChartPanel extends JPanel {
        private final String title;
        private final int startHour;
        private final int endHour;

        BarChartPanel(String title, int startHour, int endHour) {
            this.title = title;
            this.startHour = startHour;
            this.endHour = endHour;
            setPreferredSize(new Dimension(900, 260));
        }

        protected abstract double valueAt(int hour);

        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2 = (Graphics2D) g;
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            int w = getWidth();
            int h = getHeight();

            int padL = 60, padR = 20, padT = 30, padB = 45;
            int chartW = Math.max(1, w - padL - padR);
            int chartH = Math.max(1, h - padT - padB);

            g2.drawString(title, padL, 18);

            g2.drawLine(padL, padT + chartH, padL + chartW, padT + chartH);
            g2.drawLine(padL, padT, padL, padT + chartH);

            double maxVal = 1.0;
            for (int hr = startHour; hr <= endHour; hr++) {
                maxVal = Math.max(maxVal, valueAt(hr));
            }

            int step = 5;
            int maxTick = ((int) Math.ceil(maxVal / step)) * step;

            for (int v = 0; v <= maxTick; v += step) {
                int y = padT + chartH - (int) ((v / (double) maxTick) * chartH);
                g2.drawLine(padL - 5, y, padL, y);
                g2.drawString(String.valueOf(v), padL - 40, y + 5);
            }

            int hours = (endHour - startHour + 1);
            int barGap = 2;
            int barW = Math.max(1, (chartW - barGap * (hours - 1)) / hours);

            for (int idx = 0; idx < hours; idx++) {
                int hr = startHour + idx;

                double v = valueAt(hr);
                int bh = (int) Math.round((v / maxTick) * chartH);

                int x = padL + idx * (barW + barGap);
                int y = padT + chartH - bh;

                g2.fillRect(x, y, barW, bh);

                if (idx % 2 == 0) {
                    g2.drawString(String.format("%02d", hr), x, padT + chartH + 18);
                }
            }
        }
    }
}