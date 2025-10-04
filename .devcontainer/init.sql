-- Initialize Expense Management Database
CREATE DATABASE IF NOT EXISTS expense_management;
USE expense_management;

-- Grant permissions
GRANT ALL PRIVILEGES ON expense_management.* TO 'expense_user'@'%';
GRANT ALL PRIVILEGES ON expense_management.* TO 'root'@'%';
FLUSH PRIVILEGES;

-- Create a basic companies table for initial setup
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    currency_symbol VARCHAR(10) DEFAULT '$',
    country VARCHAR(100),
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create a basic users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
    company_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Insert demo company
INSERT IGNORE INTO companies (id, name, email, currency, currency_symbol, country)
VALUES (1, 'Demo Company', 'demo@company.com', 'USD', '$', 'United States');

-- Insert demo admin user (password: 'password123')
INSERT IGNORE INTO users (id, first_name, last_name, email, password, role, company_id)
VALUES (1, 'Admin', 'User', 'admin@demo.com', '$2b$10$rQ8Kz8qZ8qZ8qZ8qZ8qZ8uzv8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8q', 'admin', 1);

-- Note: Password hash above is for 'password123' - change in production!