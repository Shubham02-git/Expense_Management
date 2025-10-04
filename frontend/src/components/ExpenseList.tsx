import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import ExpenseDetailModal from './ExpenseDetailModal';

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

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  onCreateNew: () => void;
  onViewExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onSubmitExpense: (expense: Expense) => void;
  currentUser: any;
  showFilters?: boolean;
  onFilterChange?: (filters: any) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  loading,
  onCreateNew,
  onViewExpense,
  onEditExpense,
  onDeleteExpense,
  onSubmitExpense,
  currentUser,
  showFilters = true,
  onFilterChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Expense];
    let bValue: any = b[sortBy as keyof Expense];
    
    if (sortBy === 'amount') {
      aValue = a.amount_in_company_currency;
      bValue = b.amount_in_company_currency;
    }
    
    // Handle undefined values
    if (aValue === undefined || aValue === null) aValue = '';
    if (bValue === undefined || bValue === null) bValue = '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
      case 'submitted':
        return <DocumentArrowUpIcon className="w-4 h-4 text-blue-500" />;
      case 'approved':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'paid':
        return <BanknotesIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'paid':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const canEdit = (expense: Expense) => {
    return (
      (expense.user.id === currentUser?.userId || currentUser?.role === 'admin') &&
      ['draft', 'rejected'].includes(expense.status)
    );
  };

  const canDelete = (expense: Expense) => {
    return (
      (expense.user.id === currentUser?.userId || currentUser?.role === 'admin') &&
      ['draft', 'rejected'].includes(expense.status)
    );
  };

  const canSubmit = (expense: Expense) => {
    return expense.user.id === currentUser?.userId && expense.status === 'draft';
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your expense submissions
          </p>
        </div>
        
        <motion.button
          onClick={onCreateNew}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Expense
        </motion.button>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="expense_date-desc">Latest Expense Date</option>
                <option value="expense_date-asc">Earliest Expense Date</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading expenses...</p>
          </div>
        ) : sortedExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating your first expense.'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <div className="mt-6">
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Expense
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {sortedExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: expense.category.color }}
                        >
                          {expense.category.icon || expense.category.name.charAt(0)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {expense.title}
                            </h3>
                            <span className={getStatusBadge(expense.status)}>
                              {getStatusIcon(expense.status)}
                              <span className="ml-1 capitalize">{expense.status}</span>
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-1" />
                              {formatDate(expense.expense_date)}
                            </span>
                            
                            {expense.merchant_name && (
                              <span className="flex items-center">
                                <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                                {expense.merchant_name}
                              </span>
                            )}
                            
                            <span className="text-xs">
                              by {expense.user.first_name} {expense.user.last_name}
                            </span>
                          </div>
                          
                          {expense.description && (
                            <p className="mt-1 text-sm text-gray-600 truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatAmount(expense.amount, expense.currency)}
                        </p>
                        {expense.currency !== 'USD' && (
                          <p className="text-sm text-gray-500">
                            ≈ {formatAmount(expense.amount_in_company_currency, 'USD')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewExpense(expense)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                          title="View expense"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        
                        {canEdit(expense) && (
                          <button
                            onClick={() => onEditExpense(expense)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Edit expense"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canSubmit(expense) && (
                          <button
                            onClick={() => onSubmitExpense(expense)}
                            className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                            title="Submit for approval"
                          >
                            <DocumentArrowUpIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canDelete(expense) && (
                          <button
                            onClick={() => onDeleteExpense(expense)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete expense"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedExpense(null);
        }}
        onEdit={onEditExpense}
        onDelete={onDeleteExpense}
        onSubmit={onSubmitExpense}
        currentUser={currentUser}
      />
    </div>
  );
};

export default ExpenseList;