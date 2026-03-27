# Frontend Structure

## Overview
React + Vite frontend application for the Sharetea POS system with multiple interface views.

## Directory Structure

```
frontend/
├── src/
│   ├── screens/                # Feature-based screen modules
│   │   ├── portal/            # Portal page - central hub
│   │   │   ├── Portal.jsx
│   │   │   └── Portal.css
│   │   │
│   │   ├── auth/              # Authentication screens
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   │
│   │   ├── employee/          # Employee interfaces
│   │   │   ├── cashier/       # Cashier-specific components
│   │   │   ├── manager/       # Manager-specific components
│   │   │   ├── EmployeeDashboard.jsx
│   │   │   └── EmployeeDashboard.css
│   │   │
│   │   ├── customer/          # Customer interface
│   │   │   ├── pages/         # Customer pages (Menu, Cart, Checkout)
│   │   │   ├── components/    # Customer-specific components
│   │   │   ├── hooks/         # Customer hooks (useCart, useMenu)
│   │   │   └── utils/         # Customer utilities
│   │   │
│   │   └── menu/              # Menu board display
│   │       ├── components/    # Menu board components
│   │       └── hooks/         # Menu board hooks
│   │
│   ├── api/                   # API communication layer
│   │   ├── services/          # Backend API services
│   │   │   ├── authService.js
│   │   │   ├── menuService.js
│   │   │   ├── orderService.js
│   │   │   └── inventoryService.js
│   │   │
│   │   └── external/          # External API integrations
│   │       ├── oauth.js       # Google/GitHub OAuth
│   │       ├── translation.js # Translation API
│   │       ├── weather.js     # Weather API
│   │       └── chatbot.js     # ChatGPT/Claude API
│   │
│   ├── shared/                # Shared/reusable code
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Card.jsx
│   │   │
│   │   ├── hooks/             # Reusable custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useLocalStorage.js
│   │   │   └── useDebounce.js
│   │   │
│   │   ├── utils/             # Utility functions
│   │   │   ├── formatters.js  # Date, currency formatters
│   │   │   ├── validators.js  # Input validators
│   │   │   └── helpers.js     # Helper functions
│   │   │
│   │   ├── constants/         # App-wide constants
│   │   │   ├── routes.js      # Route paths
│   │   │   ├── api.js         # API endpoints
│   │   │   └── config.js      # App configuration
│   │   │
│   │   └── styles/            # Global styles
│   │       ├── variables.css  # CSS variables
│   │       ├── global.css     # Global styles
│   │       └── themes.css     # Theme definitions
│   │
│   ├── context/               # React Context providers
│   │   ├── AuthContext.jsx    # Authentication state
│   │   ├── CartContext.jsx    # Shopping cart state
│   │   └── ThemeContext.jsx   # Theme state
│   │
│   ├── assets/                # Static assets
│   │   ├── images/            # Image files
│   │   ├── icons/             # Icon files
│   │   └── fonts/             # Font files
│   │
│   ├── App.jsx                # Root component with routing
│   ├── main.jsx               # Application entry point
│   └── index.css              # Base styles
│
├── public/                    # Static public assets
├── dist/                      # Production build output
├── index.html                 # HTML entry point
├── server.js                  # Express server for production
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies and scripts
├── .gitignore                 # Git ignore file
└── README.md                  # This file
```

## Architecture Principles

### 1. Screen-Based Organization
- Each interface (portal, auth, employee, customer, menu) is a self-contained screen
- Screens have their own pages, components, hooks, and utilities
- Promotes modularity and easier maintenance

### 2. Separation of Concerns
- **screens/**: Interface-specific code
- **api/**: All backend communication logic
- **shared/**: Reusable code across screens
- **context/**: Global state management

### 3. Component Structure
Each screen follows this pattern:
- **pages/**: Route-level components (containers)
- **components/**: UI components specific to that screen
- **hooks/**: Custom React hooks for that screen
- **utils/**: Helper functions for that screen

### 4. API Layer
- **api/services/**: Backend API calls (PostgreSQL database)
- **api/external/**: External API integrations (OAuth, Translation, Weather, Chatbot)
- Centralized API client with interceptors for auth and error handling

### 5. Shared Resources
- **shared/components/**: Reusable UI components (buttons, modals, inputs)
- **shared/hooks/**: Common hooks (authentication, local storage, debounce)
- **shared/utils/**: Helper functions (date formatting, validation, calculations)
- **shared/constants/**: App-wide constants (routes, API endpoints, config)
- **shared/styles/**: Global CSS, theme variables, mixins

## Required Interfaces (Team of 5)

1. **Portal** - Central hub linking to all interfaces
2. **Employee** - Manager and Cashier interfaces
   - Manager: Desktop interface (keyboard/mouse)
   - Cashier: Touchscreen POS interface
3. **Customer** - Self-service kiosk interface (touchscreen)
4. **Menu** - Non-interactive display interface

## User Flow

```
Portal
  ├─→ Customer → Login → Customer Dashboard
  └─→ Employee → Login → Employee Dashboard
                           ├─→ Manager Interface
                           └─→ Cashier Interface
```

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Create .env file (optional for development)
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```
   Creates optimized build in `dist/` folder

5. **Preview production build:**
   ```bash
   npm run preview
   ```

6. **Run production server:**
   ```bash
   npm start
   ```
   Serves the built app using Express

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS Modules
- **State Management**: React Context API
- **Backend**: Node.js + Express.js (separate)
- **Database**: PostgreSQL on TAMU AWS

## Naming Conventions

- **Components**: PascalCase (e.g., `MenuCard.jsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useCart.js`)
- **Utils**: camelCase (e.g., `formatPrice.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **CSS Modules**: `ComponentName.module.css`
- **Regular CSS**: `ComponentName.css`

## File Organization

- Keep related files together (component + styles)
- One component per file
- Index files for cleaner imports
- Separate business logic from UI components

## Styling Guidelines

- Use CSS for component-scoped styling
- Global styles in `src/shared/styles/`
- CSS variables for theming
- Mobile-first responsive design
- Follow accessibility guidelines (WCAG 2.1)

## Best Practices

- Implement proper error boundaries
- Add loading states for async operations
- Follow accessibility guidelines (WCAG 2.1)
- Write meaningful comments for complex logic
- Keep components small and focused
- Use semantic HTML elements
- Optimize images and assets
- Lazy load routes and components when appropriate

## Development Guidelines

### Component Structure
```jsx
import React from 'react';
import './ComponentName.css';

function ComponentName({ prop1, prop2 }) {
  // Hooks
  // Event handlers
  // Helper functions
  
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

### Custom Hook Structure
```javascript
import { useState, useEffect } from 'react';

export function useCustomHook(param) {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Effect logic
  }, [param]);
  
  return { state, setState };
}
```

### API Service Structure
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const serviceNameService = {
  getAll: async () => {
    const response = await axios.get(`${API_BASE_URL}/endpoint`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/endpoint/${id}`);
    return response.data;
  },
};
```

## Deployment

The app is configured for deployment on Render:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- The Express server in `server.js` serves the built React app

## Accessibility Requirements

The customer interface must comply with WCAG 2.1 standards:
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators
- Alt text for images
- Semantic HTML structure
- ARIA labels where needed

## External APIs Integration

Required external APIs (team of 5):
1. **OAuth** - Google/GitHub authentication
2. **Translation** - Multi-language support
3. **Weather** - Weather data display
4. **Chatbot** - Personal assistant (AI-powered)

## Testing

- Manual testing during development
- Test all user flows
- Verify accessibility compliance
- Cross-browser testing (Chrome required minimum)
- Responsive design testing

## Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Build fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API connection issues:**
- Check backend is running on port 5000
- Verify VITE_API_URL in .env
- Check CORS settings in backend
