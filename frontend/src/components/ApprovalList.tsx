import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_level: number;
  comments?: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  expense: {
    id: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    amount_in_company_currency: number;
    expense_date: string;
    merchant_name: string;
    receipt_url?: string;
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
  };
  approver: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ApprovalListProps {
  approvals: Approval[];
  loading: boolean;
  onViewApproval: (approval: Approval) => void;
  onApprove: (approval: Approval) => void;
  onReject: (approval: Approval) => void;
  onDelegate: (approval: Approval) => void;
  selectedApprovals: string[];
  onSelectionChange: (approvalIds: string[]) => void;
  showBulkActions?: boolean;
}

const ApprovalList: React.FC<ApprovalListProps> = ({
  approvals,
  loading,
  onViewApproval,
  onApprove,
  onReject,
  onDelegate,
  selectedApprovals,
  onSelectionChange,
  showBulkActions = true
}) => {
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedApprovals = [...approvals].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Approval];
    let bValue: any = b[sortBy as keyof Approval];
    
    if (sortBy === 'amount') {
      aValue = a.expense.amount_in_company_currency;
      bValue = b.expense.amount_in_company_currency;
    } else if (sortBy === 'expense_date') {
      aValue = a.expense.expense_date;
      bValue = b.expense.expense_date;
    } else if (sortBy === 'employee') {
      aValue = `${a.expense.user.first_name} ${a.expense.user.last_name}`;
      bValue = `${b.expense.user.first_name} ${b.expense.user.last_name}`;
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

  const handleSelectAll = () => {
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const allSelected = pendingApprovals.every(a => selectedApprovals.includes(a.id));
    
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(pendingApprovals.map(a => a.id));
    }
  };

  const handleSelectApproval = (approvalId: string) => {
    if (selectedApprovals.includes(approvalId)) {
      onSelectionChange(selectedApprovals.filter(id => id !== approvalId));
    } else {
      onSelectionChange([...selectedApprovals, approvalId]);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
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

  const getPriorityLevel = (approval: Approval) => {
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const amount = approval.expense.amount_in_company_currency;
    
    if (daysSinceCreated > 7 || amount > 5000) {
      return 'high';
    } else if (daysSinceCreated > 3 || amount > 1000) {
      return 'medium';
    }
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-green-500 bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-500">Loading approvals...</p>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-8 text-center">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
        <p className="mt-1 text-sm text-gray-500">
          You're all caught up! No expenses are waiting for your approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sort controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Pending Approvals</h2>
          <p className="mt-1 text-sm text-gray-500">
            {approvals.filter(a => a.status === 'pending').length} expenses waiting for approval
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {showBulkActions && selectedApprovals.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedApprovals.length} selected
            </span>
          )}
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="expense_date-desc">Latest Date</option>
            <option value="expense_date-asc">Earliest Date</option>
            <option value="employee-asc">Employee A-Z</option>
            <option value="employee-desc">Employee Z-A</option>
          </select>
        </div>
      </div>

      {/* Bulk selection header */}
      {showBulkActions && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={
                approvals.filter(a => a.status === 'pending').length > 0 &&
                approvals.filter(a => a.status === 'pending').every(a => selectedApprovals.includes(a.id))
              }
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Select all pending approvals
            </label>
          </div>
        </div>
      )}

      {/* Approvals list */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          <AnimatePresence>
            {sortedApprovals.map((approval, index) => {
              const priority = getPriorityLevel(approval);
              const isPending = approval.status === 'pending';
              
              return (
                <motion.div
                  key={approval.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 border-l-4 ${getPriorityColor(priority)} hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Selection checkbox */}
                    {showBulkActions && isPending && (
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedApprovals.includes(approval.id)}
                          onChange={() => handleSelectApproval(approval.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    )}

                    {/* Category indicator */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: approval.expense.category.color }}
                      >
                        {approval.expense.category.icon || approval.expense.category.name.charAt(0)}
                      </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {approval.expense.title}
                          </h3>
                          <span className={getStatusBadge(approval.status)}>
                            {getStatusIcon(approval.status)}
                            <span className="ml-1 capitalize">{approval.status}</span>
                          </span>
                          {priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatAmount(approval.expense.amount, approval.expense.currency)}
                          </p>
                          {approval.expense.currency !== 'USD' && (
                            <p className="text-sm text-gray-500">
                              ≈ {formatAmount(approval.expense.amount_in_company_currency, 'USD')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-1" />
                          {approval.expense.user.first_name} {approval.expense.user.last_name}
                        </span>
                        
                        <span className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {formatDate(approval.expense.expense_date)}
                        </span>
                        
                        {approval.expense.merchant_name && (
                          <span className="flex items-center">
                            <DocumentTextIcon className="w-4 h-4 mr-1" />
                            {approval.expense.merchant_name}
                          </span>
                        )}

                        <span className="text-xs">
                          Level {approval.approval_level}
                        </span>
                      </div>

                      {approval.expense.description && (
                        <p className="mt-2 text-sm text-gray-600 truncate">
                          {approval.expense.description}
                        </p>
                      )}

                      {approval.comments && (
                        <div className="mt-2 p-2 bg-gray-100 rounded-md">
                          <p className="text-xs text-gray-600 flex items-center">
                            <ChatBubbleLeftRightIcon className="w-3 h-3 mr-1" />
                            {approval.comments}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => onViewApproval(approval)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                        title="View details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => onApprove(approval)}
                            className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onReject(approval)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Reject"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDelegate(approval)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Delegate"
                          >
                            <ArrowRightIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ApprovalList;