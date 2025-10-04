# 🚀 Expense Management System - Setup Guide

## 🔧 **Required API Keys & Services**

### **1. MySQL Database Setup**

**Install MySQL (if not installed):**
```bash
# Download MySQL 8.0+ from: https://dev.mysql.com/downloads/mysql/
# Or use XAMPP/WAMP for Windows
```

**Create Database:**
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE expense_management;

-- Create user (optional)
CREATE USER 'expense_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON expense_management.* TO 'expense_user'@'localhost';
FLUSH PRIVILEGES;
```

### **2. Required API Keys (Free Options Available)**

#### **🔍 OCR Service (Choose One)**

**Option A: Google Vision API (Recommended)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Cloud Vision API"
4. Create Service Account → Download JSON key
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to JSON file path

**Option B: OCR.space (Free Alternative)**
1. Visit [OCR.space](https://ocr.space/ocrapi)
2. Sign up for free API key (25,000 requests/month)
3. Use API key in `OCR_SPACE_API_KEY`

#### **💱 Currency Conversion (Choose One)**

**Option A: ExchangeRate-API (Free)**
1. Visit [ExchangeRate-API](https://exchangerate-api.com/)
2. Sign up for free (1,500 requests/month)
3. Get API key for `EXCHANGE_RATE_API_KEY`

**Option B: Fixer.io (Free)**
1. Visit [Fixer.io](https://fixer.io/)
2. Sign up for free (100 requests/month)
3. Get API key for `FIXER_API_KEY`

#### **📧 Email Service (Choose One)**

**Option A: SendGrid (Recommended)**
1. Visit [SendGrid](https://sendgrid.com/)
2. Sign up for free (100 emails/day)
3. Create API key for `SENDGRID_API_KEY`

**Option B: Gmail SMTP**
1. Enable 2-factor authentication on Gmail
2. Generate App Password in Google Account settings
3. Use credentials in `GMAIL_USER` and `GMAIL_PASS`

#### **☁️ File Storage (Optional)**

**Cloudinary (Free)**
1. Visit [Cloudinary](https://cloudinary.com/)
2. Sign up for free account (25 credits/month)
3. Get credentials from dashboard

### **3. Setup Instructions**

#### **Step 1: Copy Environment Files**
```bash
# Backend
cd backend
cp .env.example .env

# Frontend  
cd ../frontend
cp .env.example .env.local
```

#### **Step 2: Configure Backend (.env)**
```bash
# Edit backend/.env file with your values:

# Database (Required)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=expense_management
DB_USERNAME=root
DB_PASSWORD=your_actual_mysql_password

# JWT (Required - Generate random 32+ character strings)
JWT_SECRET=your_generated_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_generated_refresh_key_min_32_chars

# OCR (Choose one)
GOOGLE_VISION_API_KEY=your_actual_google_api_key
# OR
OCR_SPACE_API_KEY=your_actual_ocr_space_key

# Currency (Choose one)
EXCHANGE_RATE_API_KEY=your_actual_exchange_rate_key
# OR  
FIXER_API_KEY=your_actual_fixer_key

# Email (Choose one)
SENDGRID_API_KEY=your_actual_sendgrid_key
# OR
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password
```

#### **Step 3: Configure Frontend (.env.local)**
```bash
# Edit frontend/.env.local file:

NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_VISION_API_KEY=your_google_key_if_client_side
```

#### **Step 4: Install Dependencies & Start**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend  
npm install
npm run dev
```

### **4. Quick Start (Minimum Required)**

**For basic functionality, you only need:**
1. ✅ **MySQL Database** (local installation)
2. ✅ **Database credentials** in backend/.env
3. ✅ **JWT secrets** (generate random strings)

**Optional for full features:**
- 🔍 OCR API (for receipt scanning)
- 💱 Currency API (for conversions)
- 📧 Email API (for notifications)

### **5. Testing Configuration**

```bash
# Test database connection
cd backend
npm run test:db

# Test API endpoints
npm run test:api

# Check environment variables
npm run check:env
```

## 🔒 **Security Notes**

- ⚠️ **Never commit .env files to Git**
- 🔑 **Use strong, unique JWT secrets**
- 🛡️ **Limit API key permissions**
- 🔒 **Use environment-specific configurations**

## 📞 **Support**

If you encounter issues:
1. Check the console for error messages
2. Verify all required environment variables are set
3. Ensure MySQL is running and accessible
4. Test API keys with simple requests

**Ready to continue building after setup!** 🚀