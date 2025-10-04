#!/bin/bash

echo "🚀 Setting up Expense Management System..."

# Install dependencies for both frontend and backend
echo "📦 Installing frontend dependencies..."
cd /workspaces/Expense_Management/frontend
npm install

echo "📦 Installing backend dependencies..."
cd /workspaces/Expense_Management/backend
npm install

# Install global tools
echo "🛠 Installing global tools..."
npm install -g @vercel/cli
npm install -g nodemon

# Create environment files if they don't exist
echo "⚙️ Setting up environment files..."

# Backend .env
if [ ! -f "/workspaces/Expense_Management/backend/.env" ]; then
  cat > /workspaces/Expense_Management/backend/.env << EOL
# Database Configuration (Codespaces MySQL)
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=password
DB_NAME=expense_management
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_for_codespaces_demo_change_in_production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# External API Configuration
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
EXCHANGE_RATE_API_KEY=your_api_key_here

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
EMAIL_FROM=your_email@gmail.com
EOL
  echo "✅ Created backend .env file with Codespaces database config"
fi

# Frontend .env.local
if [ ! -f "/workspaces/Expense_Management/frontend/.env.local" ]; then
  cat > /workspaces/Expense_Management/frontend/.env.local << EOL
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
BACKEND_URL=http://localhost:5000

# App Configuration
NEXT_PUBLIC_APP_NAME=Expense Management System
NEXT_PUBLIC_APP_VERSION=1.0.0

# Development
NODE_ENV=development
EOL
  echo "✅ Created frontend .env.local file"
fi

# Set up git hooks and permissions
echo "🔧 Setting up git configuration..."
git config --global --add safe.directory /workspaces/Expense_Management

# Create uploads directory
mkdir -p /workspaces/Expense_Management/backend/uploads

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL database to be ready..."
for i in {1..30}; do
  if mysqladmin ping -h127.0.0.1 -uroot -ppassword --silent; then
    echo "✅ MySQL database is ready!"
    break
  fi
  echo "   Attempt $i/30: MySQL not ready yet, waiting..."
  sleep 2
done

# Test database connection
echo "🔗 Testing database connection..."
if mysql -h127.0.0.1 -uroot -ppassword -e "SHOW DATABASES;" 2>/dev/null; then
  echo "✅ Database connection successful!"
else
  echo "⚠️ Database connection failed - setting up demo mode"
  bash /workspaces/Expense_Management/.devcontainer/setup-demo.sh
fi

echo "✅ Setup complete! Ready to start development."
echo ""
echo "🎯 Next steps:"
echo "   1. Start the backend: cd backend && npm run dev"
echo "   2. Start the frontend: cd frontend && npm run dev"
echo "   3. Access the app at: http://localhost:3000"
echo ""