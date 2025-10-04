import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import ExpenseService, { ExpenseFilters, CreateExpenseData } from '../services/expenseService';
import { useAuth } from '../components/AuthProvider';

interface Expense {
  id: string;
  expense_number: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  amount_in_company_currency: number;
  exchange_rate: number;
  expense_date: string;
  merchant_name: string;
  merchant_address?: string;
  payment_method: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  receipt_url?: string;
  receipt_filename?: string;
  ocr_data?: any;
  reimbursement_requested: boolean;
  tax_amount?: number;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_id: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  approvals?: Array<{
    id: string;
    status: string;
    decision_date?: string;
    comments?: string;
    approver: {
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
}

const ExpensesPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadExpenses();
      loadCategories();
      loadCurrencies();
    }
  }, [filters, isAuthenticated, user]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await ExpenseService.getExpenses(filters);
      if (response.success) {
        setExpenses(response.data.expenses);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await ExpenseService.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await ExpenseService.getCurrencies();
      if (response.success) {
        setCurrencies(response.data);
      } else {
        // Fallback currencies if API fails
        setCurrencies(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']);
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
      // Fallback currencies
      setCurrencies(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']);
    }
  };

  const handleCreateNew = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleViewExpense = (expense: Expense) => {
    // For now, just show expense details in a modal or redirect
    toast.success(`Viewing expense: ${expense.title}`);
    // TODO: Implement expense detail view
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete "${expense.title}"?`)) {
      return;
    }

    try {
      const response = await ExpenseService.deleteExpense(expense.id);
      if (response.success) {
        toast.success('Expense deleted successfully');
        loadExpenses(); // Reload list
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleSubmitExpense = async (expense: Expense) => {
    try {
      const response = await ExpenseService.submitExpense(expense.id);
      if (response.success) {
        toast.success('Expense submitted for approval');
        loadExpenses(); // Reload list
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast.error('Failed to submit expense');
    }
  };

  const handleFormSubmit = async (formData: any, receipt: File | null) => {
    try {
      setFormLoading(true);

      // Convert form data to API format
      const apiData: CreateExpenseData = {
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        expense_date: formData.expense_date,
        merchant_name: formData.merchant_name,
        merchant_address: formData.merchant_address,
        payment_method: formData.payment_method,
        category_id: formData.category_id,
        reimbursement_requested: formData.reimbursement_requested,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : undefined,
        tags: formData.tags
      };

      let response;
      if (editingExpense) {
        // Update existing expense
        response = await ExpenseService.updateExpense(editingExpense.id, apiData);
      } else {
        // Create new expense
        response = await ExpenseService.createExpense(apiData);
      }

      if (response.success) {
        const expenseId = response.data.id;

        // Upload receipt if provided
        if (receipt) {
          try {
            await ExpenseService.uploadReceipt(expenseId, receipt);
            toast.success('Receipt uploaded successfully');
          } catch (receiptError) {
            console.error('Error uploading receipt:', receiptError);
            toast.error('Expense saved but receipt upload failed');
          }
        }

        toast.success(
          editingExpense ? 'Expense updated successfully' : 'Expense created successfully'
        );
        
        setShowForm(false);
        setEditingExpense(null);
        loadExpenses(); // Reload list
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleFilterChange = (newFilters: ExpenseFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ExpenseForm
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                initialData={editingExpense ? {
                  title: editingExpense.title,
                  description: editingExpense.description,
                  amount: editingExpense.amount.toString(),
                  currency: editingExpense.currency,
                  expense_date: editingExpense.expense_date,
                  merchant_name: editingExpense.merchant_name,
                  category_id: editingExpense.category.id,
                  // Add other fields as needed
                } : undefined}
                categories={categories}
                currencies={currencies}
                isLoading={formLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ExpenseList
                expenses={expenses}
                loading={loading}
                onCreateNew={handleCreateNew}
                onViewExpense={handleViewExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                onSubmitExpense={handleSubmitExpense}
                currentUser={user}
                showFilters={true}
                onFilterChange={handleFilterChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExpensesPage;