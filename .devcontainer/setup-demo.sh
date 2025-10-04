#!/bin/bash

echo "🚀 Codespaces Demo Mode Setup"
echo "This script sets up a lightweight demo mode for GitHub Codespaces"

# Create a simple backend demo mode
cd /workspaces/Expense_Management/backend

# Create a demo server file that doesn't require MySQL
cat > demo-server.js << 'EOL'
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Demo data
const demoExpenses = [
  {
    id: '1',
    title: 'Office Supplies',
    description: 'Pens, paper, notebooks',
    amount: 150.00,
    currency: 'USD',
    amount_in_company_currency: 150.00,
    expense_date: '2024-01-15',
    merchant_name: 'Office Depot',
    status: 'pending',
    user: {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@demo.com'
    },
    category: {
      id: '1',
      name: 'Office Supplies',
      color: '#3B82F6',
      icon: '📝'
    }
  },
  {
    id: '2',
    title: 'Business Lunch',
    description: 'Client meeting lunch',
    amount: 85.50,
    currency: 'USD',
    amount_in_company_currency: 85.50,
    expense_date: '2024-01-16',
    merchant_name: 'Restaurant ABC',
    status: 'approved',
    user: {
      id: '2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@demo.com'
    },
    category: {
      id: '2',
      name: 'Meals',
      color: '#10B981',
      icon: '🍽️'
    }
  }
];

// Demo routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'demo', message: 'Backend is running in demo mode' });
});

app.get('/api/expenses', (req, res) => {
  res.json({ success: true, data: demoExpenses });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalExpenses: 2,
      pendingApprovals: 1,
      monthlyTotal: 235.50,
      recentExpenses: demoExpenses
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      token: 'demo-token',
      user: {
        id: '1',
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@codespaces.com',
        role: 'admin',
        company: {
          id: '1',
          name: 'Codespaces Demo Company',
          currency: 'USD',
          currency_symbol: '$'
        }
      }
    }
  });
});

// Catch-all for other routes
app.use('*', (req, res) => {
  res.json({ 
    message: 'Demo API - Route not implemented yet',
    mode: 'demo',
    availableRoutes: ['/api/health', '/api/expenses', '/api/dashboard/stats', '/api/auth/login']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Demo backend running on port ${PORT}`);
  console.log(`📊 Demo mode active - using mock data`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
EOL

echo "✅ Created demo server for Codespaces"

# Update package.json to include demo script
if [ -f "package.json" ]; then
  # Add demo script using npm
  npm pkg set scripts.demo="node demo-server.js"
  echo "✅ Added demo script to package.json"
fi

echo "🎯 Demo mode ready! Use 'npm run demo' to start demo backend"