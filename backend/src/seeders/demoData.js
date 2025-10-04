const { Company, User, ExpenseCategory, Expense, sequelize } = require('../models');
const bcrypt = require('bcrypt');

const seedData = async () => {
  try {
    await sequelize.sync({ force: false });
    
    console.log('🌱 Starting database seeding...');

    // Check if demo company already exists
    const existingCompany = await Company.findOne({
      where: { name: 'Demo Company Ltd.' }
    });

    if (existingCompany) {
      console.log('✅ Demo data already exists, skipping seeding');
      return;
    }

    // Create demo company
    const demoCompany = await Company.create({
      name: 'Demo Company Ltd.',
      currency: 'USD',
      currency_symbol: '$',
      country: 'United States',
      address: '123 Business Ave',
      settings: {
        approval_required: true,
        multi_level_approval: true,
        auto_currency_conversion: true
      }
    });

    console.log('✅ Created demo company');

    // Create demo users
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123A!', saltRounds);

    const adminUser = await User.create({
      email: 'admin@democompany.com',
      password: hashedPassword,
      first_name: 'John',
      last_name: 'Admin',
      role: 'admin',
      company_id: demoCompany.id,
      is_active: true
    });

    const managerUser = await User.create({
      email: 'manager@democompany.com',
      password: hashedPassword,
      first_name: 'Jane',
      last_name: 'Manager',
      role: 'manager',
      company_id: demoCompany.id,
      is_active: true
    });

    const employeeUser = await User.create({
      email: 'employee@democompany.com',
      password: hashedPassword,
      first_name: 'Bob',
      last_name: 'Employee',
      role: 'employee',
      company_id: demoCompany.id,
      is_active: true
    });

    console.log('✅ Created demo users');

    // Create expense categories
    const categories = [
      { name: 'Travel', description: 'Travel and accommodation expenses', color: '#3B82F6' },
      { name: 'Meals', description: 'Business meals and entertainment', color: '#EF4444' },
      { name: 'Office Supplies', description: 'Office equipment and supplies', color: '#10B981' },
      { name: 'Software', description: 'Software licenses and subscriptions', color: '#8B5CF6' },
      { name: 'Training', description: 'Professional development and training', color: '#F59E0B' },
      { name: 'Marketing', description: 'Marketing and advertising expenses', color: '#EC4899' },
      { name: 'Utilities', description: 'Internet, phone, and utilities', color: '#6B7280' },
      { name: 'Transportation', description: 'Local transportation and fuel', color: '#14B8A6' }
    ];

    for (const category of categories) {
      await ExpenseCategory.create({
        ...category,
        company_id: demoCompany.id
      });
    }

    console.log('✅ Created expense categories');

    // Create sample expenses
    const expenseCategories = await ExpenseCategory.findAll({
      where: { company_id: demoCompany.id }
    });

    const sampleExpenses = [
      {
        title: 'Flight to Client Meeting',
        description: 'Round trip flight to Los Angeles for client presentation',
        amount: 450.00,
        amount_in_company_currency: 450.00,
        currency: 'USD',
        expense_date: new Date('2024-10-01'),
        merchant_name: 'American Airlines',
        payment_method: 'corporate_card',
        status: 'approved',
        user_id: employeeUser.id,
        category_id: expenseCategories.find(c => c.name === 'Travel').id
      },
      {
        title: 'Team Lunch',
        description: 'Team building lunch with department',
        amount: 125.50,
        amount_in_company_currency: 125.50,
        currency: 'USD',
        expense_date: new Date('2024-10-02'),
        merchant_name: 'The Business Bistro',
        payment_method: 'cash',
        status: 'pending',
        user_id: employeeUser.id,
        category_id: expenseCategories.find(c => c.name === 'Meals').id
      },
      {
        title: 'Adobe Creative Suite License',
        description: 'Annual license renewal for design software',
        amount: 599.99,
        amount_in_company_currency: 599.99,
        currency: 'USD',
        expense_date: new Date('2024-10-03'),
        merchant_name: 'Adobe Inc.',
        payment_method: 'corporate_card',
        status: 'draft',
        user_id: managerUser.id,
        category_id: expenseCategories.find(c => c.name === 'Software').id
      },
      {
        title: 'Conference Registration',
        description: 'Registration for Tech Innovation Summit 2024',
        amount: 899.00,
        amount_in_company_currency: 899.00,
        currency: 'USD',
        expense_date: new Date('2024-09-28'),
        merchant_name: 'TechEvent Corp',
        payment_method: 'corporate_card',
        status: 'approved',
        user_id: managerUser.id,
        category_id: expenseCategories.find(c => c.name === 'Training').id
      },
      {
        title: 'Office Printer Paper',
        description: 'Monthly supply of printer paper and toner',
        amount: 85.99,
        amount_in_company_currency: 85.99,
        currency: 'USD',
        expense_date: new Date('2024-10-01'),
        merchant_name: 'OfficeMax',
        payment_method: 'petty_cash',
        status: 'approved',
        user_id: employeeUser.id,
        category_id: expenseCategories.find(c => c.name === 'Office Supplies').id
      }
    ];

    for (const expense of sampleExpenses) {
      await Expense.create({
        ...expense,
        company_id: demoCompany.id
      });
    }

    console.log('✅ Created sample expenses');
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('Admin: admin@democompany.com / password123A!');
    console.log('Manager: manager@democompany.com / password123A!');
    console.log('Employee: employee@democompany.com / password123A!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Only run seeding if this file is executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };