# Backend Structure

## Overview
Node.js + Express.js backend API for the Sharetea POS system with PostgreSQL database.

## Directory Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   └── database.js      # PostgreSQL connection pool
│   │
│   ├── routes/              # API route definitions
│   │   ├── auth.js          # Authentication routes
│   │   ├── menu.js          # Menu item routes
│   │   ├── orders.js        # Order management routes
│   │   ├── inventory.js     # Inventory routes
│   │   ├── employees.js     # Employee management routes
│   │   └── reports.js       # Reports and analytics routes
│   │
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── menuController.js
│   │   ├── orderController.js
│   │   ├── inventoryController.js
│   │   ├── employeeController.js
│   │   └── reportController.js
│   │
│   ├── models/              # Database models and queries
│   │   ├── Menu.js
│   │   ├── Order.js
│   │   ├── Inventory.js
│   │   ├── Employee.js
│   │   └── Report.js
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── validation.js    # Request validation
│   │   └── errorHandler.js  # Error handling
│   │
│   ├── services/            # External API integrations
│   │   ├── oauth.js         # Google/GitHub OAuth
│   │   ├── translation.js   # Translation API
│   │   ├── weather.js       # Weather API
│   │   └── chatbot.js       # ChatGPT/Claude API
│   │
│   ├── utils/               # Utility functions
│   │   ├── helpers.js       # Helper functions
│   │   ├── validators.js    # Data validators
│   │   └── formatters.js    # Data formatters
│   │
│   └── server.js            # Express app entry point
│
├── scripts/                 # Database scripts
│   ├── migrate.js           # Database migrations
│   ├── seed.js              # Seed data
│   └── backup.js            # Database backup
│
├── tests/                   # Test files
│   ├── auth.test.js
│   ├── menu.test.js
│   └── orders.test.js
│
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Database credentials:**
   - Host: `csce-315-db.engr.tamu.edu`
   - User: `team_32`
   - Database: `team_32_db`
   - Port: `5432`
   - Password: (stored in .env file)

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Run production server:**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth

### Menu
- `GET /api/menu/items` - Get all menu items
- `GET /api/menu/items/:id` - Get item by ID
- `GET /api/menu/categories` - Get all categories
- `POST /api/menu/items` - Create new item (manager only)
- `PUT /api/menu/items/:id` - Update item (manager only)
- `DELETE /api/menu/items/:id` - Delete item (manager only)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get item by ID
- `PUT /api/inventory/:id` - Update inventory item
- `GET /api/inventory/low-stock` - Get low stock items

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/inventory` - Inventory reports
- `GET /api/reports/employees` - Employee reports

### External APIs
- `POST /api/external/translate` - Translate text
- `GET /api/external/weather` - Get weather data
- `POST /api/external/chatbot` - Chatbot interaction

## Database Connection

The database connection is configured in `src/config/database.js` using the `pg` library with connection pooling.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Environment variables for sensitive data
- CORS enabled for frontend communication
- SQL injection prevention with parameterized queries

## Development

- Use `npm run dev` for hot-reloading during development
- All database credentials are stored in `.env` (not committed to git)
- Follow the MVC pattern: Routes → Controllers → Models
