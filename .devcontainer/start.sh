#!/bin/bash

echo "🌟 Starting Expense Management System services..."

# Function to check if port is in use
check_port() {
    netstat -tulpn 2>/dev/null | grep ":$1 " > /dev/null
    return $?
}

# Check and wait for MySQL
echo "🗄️ Checking MySQL database connectivity..."
if mysqladmin ping -h127.0.0.1 -uroot -ppassword --silent 2>/dev/null; then
    echo "✅ MySQL database is running and accessible"
else
    echo "⚠️ MySQL database not accessible. Backend may run in demo mode."
    echo "   Database will be available once MySQL container starts up."
fi

# Start backend in background
echo "🚀 Starting backend server..."
cd /workspaces/Expense_Management/backend

# Try to start normal backend first, fallback to demo mode
if mysqladmin ping -h127.0.0.1 -uroot -ppassword --silent 2>/dev/null; then
  echo "   Using full backend with database"
  npm run dev > /tmp/backend.log 2>&1 &
else
  echo "   Using demo backend (no database required)"
  if [ -f "demo-server.js" ]; then
    npm run demo > /tmp/backend.log 2>&1 &
  else
    echo "   Demo mode not available, trying regular backend anyway"
    npm run dev > /tmp/backend.log 2>&1 &
  fi
fi

BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if check_port 5000; then
    echo "✅ Backend server running on port 5000"
else
    echo "⚠️ Backend server may not have started properly. Check logs:"
    tail -10 /tmp/backend.log
fi

# Start frontend in background
echo "🎨 Starting frontend server..."
cd /workspaces/Expense_Management/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if check_port 3000; then
    echo "✅ Frontend server running on port 3000"
    echo ""
    echo "🎉 Expense Management System is ready!"
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:5000"
    echo ""
    echo "📋 Available commands:"
    echo "   - View logs: tail -f /tmp/frontend.log"
    echo "   - View backend logs: tail -f /tmp/backend.log"
    echo "   - Stop services: pkill -f 'npm run dev'"
else
    echo "⚠️ Frontend server may not have started properly. Check logs:"
    tail -10 /tmp/frontend.log
fi

echo ""
echo "🔍 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"