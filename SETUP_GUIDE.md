# 🚀 Expense Management System - Complete Setup Guide

## 📋 **Project Overview**
Complete MVP expense management platform built with:
- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind CSS 3.4
- **Backend**: Node.js + Express + MySQL + Sequelize ORM
- **Authentication**: JWT with role-based access (Admin/Manager/Employee)
- **Features**: OCR receipts, multi-level approvals, dashboards, reports

---

## ⚡ **Quick Start**

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend  
cd ../backend
npm install
```

### 2. Database Setup (Choose One)

#### Option A: XAMPP (Recommended)
- Download XAMPP from [apachefriends.org](https://www.apachefriends.org/)
- Start MySQL from XAMPP Control Panel
- Create database: `expense_management`

#### Option B: Standalone MySQL
- Download from [dev.mysql.com](https://dev.mysql.com/downloads/installer/)
- Install MySQL Server + Workbench
- Create database: `expense_management`

#### Option C: Docker
```bash
docker run --name expense-mysql -e MYSQL_ROOT_PASSWORD=password123 -e MYSQL_DATABASE=expense_management -p 3306:3306 -d mysql:8.0
```

### 3. Environment Configuration
Create `backend/.env`:
```env
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=expense_management
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Security
JWT_SECRET=your-super-secret-jwt-key

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Start Application
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2) 
cd frontend
npm run dev
```

**Application URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🎯 **Latest Updates**

### **Package Versions (2025)**
- **Next.js**: 15.1.3 (latest with App Router)
- **React**: 18.3.1 (LTS stable)
- **Tailwind CSS**: 3.4.17 (latest with container queries)
- **Express**: 4.21.1 (latest with security fixes)
- **Sequelize**: 6.37.5 (latest with MySQL 8.0 support)
- **MySQL2**: 3.15.1 (latest driver)

### **Modern Features**
- 🌙 **Dark mode ready** with CSS variables
- 📱 **Container queries** for responsive components
- 🎨 **Design system** with semantic tokens
- ⚡ **Latest security patches** (zero vulnerabilities)
- 🚀 **Performance optimized** builds

---

## 🏗️ **Architecture**

### **Backend Structure**
```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection
│   ├── models/                  # Sequelize models
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Expense.js
│   │   ├── ExpenseCategory.js
│   │   ├── Approval.js
│   │   ├── ApprovalWorkflow.js
│   │   └── AuditLog.js
│   ├── controllers/             # Business logic
│   ├── routes/                  # API endpoints
│   ├── middleware/              # Auth, validation, rate limiting
│   └── utils/                   # Helper functions
├── uploads/                     # File storage
├── .env.example                 # Environment template
└── server.js                    # Application entry
```

### **Frontend Structure**
```
frontend/
├── src/
│   ├── pages/                   # Next.js pages
│   ├── components/              # React components
│   ├── store/                   # Zustand state management
│   ├── styles/                  # Tailwind CSS
│   └── utils/                   # Helper functions
├── public/                      # Static assets
└── next.config.js              # Next.js configuration
```

### **Database Models**
- **Company**: Multi-tenant organization setup
- **User**: Role-based access (Admin/Manager/Employee) 
- **ExpenseCategory**: Hierarchical categorization
- **Expense**: Expense records with receipts
- **ApprovalWorkflow**: Configurable approval rules
- **Approval**: Approval process tracking
- **AuditLog**: Complete audit trail

---

## 🎨 **Design System**

### **Modern Tailwind Classes**
```css
/* Buttons */
.btn-default, .btn-destructive, .btn-outline
.btn-secondary, .btn-ghost, .btn-link

/* Cards */
.card, .card-header, .card-content, .card-footer

/* Forms */
.form-input, .form-textarea, .form-label, .form-error

/* Badges */
.badge-default, .badge-success, .badge-warning

/* Advanced Effects */
.glass-card, .shadow-glow, .text-gradient
```

### **Color System**
```css
/* Semantic Colors (CSS Variables) */
--primary, --secondary, --accent
--destructive, --success, --warning
--background, --foreground, --muted
```

---

## 🛠️ **Development Commands**

### **Frontend**
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### **Backend**
```bash
npm run dev      # Development with nodemon
npm start        # Production server
npm test         # Run tests
```

---

## 🚀 **Production Deployment**

### **Build for Production**
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
NODE_ENV=production npm start
```

### **Environment Variables (Production)**
```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_NAME=expense_management_prod
JWT_SECRET=secure-production-secret
FRONTEND_URL=https://your-domain.com
```

---

## 🎯 **Features Roadmap**

### ✅ **Completed**
- Project structure & latest packages
- MySQL database with Sequelize ORM
- JWT authentication system
- Company setup & user management
- Modern Tailwind CSS design system
- TypeScript configuration
- Security middleware

### 🔄 **In Progress**
- Expense submission forms
- OCR receipt scanning
- Multi-level approval workflows
- Dynamic dashboards
- Reporting & export features

---

## 🔍 **Troubleshooting**

### **Common Issues**

**Database Connection Error:**
- Ensure MySQL is running
- Check credentials in `.env`
- Verify database exists

**Build Errors:**
- Run `npm install` in both directories
- Clear `.next` cache: `rm -rf .next`
- Check Node.js version (18+ required)

**Port Conflicts:**
- Frontend: Change port in `package.json`
- Backend: Change PORT in `.env`

---

## 📚 **Documentation**

- **API Documentation**: Available at `/api/docs` when running
- **Component Storybook**: Run `npm run storybook`
- **Database Schema**: Auto-generated by Sequelize
- **Deployment Guide**: See production section above

---

**Built with ❤️ for Odoo Hackathon 2025**