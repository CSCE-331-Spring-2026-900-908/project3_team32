package manager;

import common.DatabaseConnection;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.*;

public class ManagerView extends JFrame {
    private CardLayout cardLayout;
    private JPanel contentPanel;
    
    public ManagerView() {
        setTitle("Manager View");
        setSize(1000, 700);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        
        JPanel mainPanel = new JPanel(new BorderLayout());
        
        // Left sidebar
        JPanel sidebar = createSidebar();
        mainPanel.add(sidebar, BorderLayout.WEST);
        
        // Content area with CardLayout
        cardLayout = new CardLayout();
        contentPanel = new JPanel(cardLayout);
        
        contentPanel.add(new MenuManagementPanel(), "MENU");
        contentPanel.add(new InventoryManagementPanel(), "INVENTORY");
        contentPanel.add(new ManagerReportsPanel(), "REPORTS");
        contentPanel.add(new ProductUsageChartPanel(), "USAGE_CHART");
        contentPanel.add(new XReportPanel(), "XREPORT");
        contentPanel.add(new SalesReportPanel(), "SALES_REPORT");
        contentPanel.add(new ZReportPanel(), "ZREPORT");
        contentPanel.add(new EmployeeManagerPanel(), "EMPLOYEE");
        
        mainPanel.add(contentPanel, BorderLayout.CENTER);
        
        add(mainPanel);
        cardLayout.show(contentPanel, "MENU");
    }
    
    private JPanel createSidebar() {
        JPanel sidebar = new JPanel();
        sidebar.setLayout(new BoxLayout(sidebar, BoxLayout.Y_AXIS));
        sidebar.setPreferredSize(new Dimension(150, 0));
        sidebar.setBackground(new Color(240, 240, 240));
        
        String[] buttons = {"Menu", "Inventory", "Reports", "Usage Chart", "X-Report", "Z-Report", "Sales Report", "Employee", "Logout"};
        String[] cards = {"MENU", "INVENTORY", "REPORTS", "USAGE_CHART", "XREPORT", "ZREPORT", "SALES_REPORT", "EMPLOYEE", null};
        
        for (int i = 0; i < buttons.length; i++) {
            JButton btn = new JButton(buttons[i]);
            btn.setMaximumSize(new Dimension(150, 60));
            btn.setAlignmentX(Component.CENTER_ALIGNMENT);
            btn.setFont(new Font("Arial", Font.PLAIN, 14));
            
            if (i == 0) {
                btn.setBackground(new Color(173, 216, 230));
            }
            
            final String card = cards[i];
            if (card != null) {
                btn.addActionListener(e -> {
                    cardLayout.show(contentPanel, card);
                    updateSidebarSelection(sidebar, btn);
                });
            } else {
                // Logout button - return to role selection
                btn.addActionListener(e -> {
                    dispose();
                    try {
                        Class<?> mainClass = Class.forName("Main");
                        Object mainInstance = mainClass.getDeclaredConstructor().newInstance();
                        mainClass.getMethod("setVisible", boolean.class).invoke(mainInstance, true);
                    } catch (Exception ex) {
                        System.err.println("[ERROR] Failed to return to main: " + ex.getMessage());
                        System.exit(0);
                    }
                });
            }
            
            sidebar.add(btn);
        }
        
        return sidebar;
    }
    
    private void updateSidebarSelection(JPanel sidebar, JButton selected) {
        for (Component comp : sidebar.getComponents()) {
            if (comp instanceof JButton) {
                JButton btn = (JButton) comp;
                if (btn == selected) {
                    btn.setBackground(new Color(173, 216, 230));
                } else {
                    btn.setBackground(null);
                }
            }
        }
    }
    
    private JPanel createPlaceholderPanel(String title) {
        JPanel panel = new JPanel(new BorderLayout());
        JLabel label = new JLabel(title + " - Coming Soon", SwingConstants.CENTER);
        label.setFont(new Font("Arial", Font.BOLD, 24));
        panel.add(label, BorderLayout.CENTER);
        return panel;
    }
}
