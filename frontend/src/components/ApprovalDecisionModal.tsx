import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Approval {
  id: string;
  status: string;
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
      first_name: string;
      last_name: string;
      email: string;
    };
    category: {
      name: string;
      color: string;
    };
  };
}

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: Approval | null;
  action: 'approve' | 'reject';
  onConfirm: (comments: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  isOpen,
  onClose,
  approval,
  action,
  onConfirm,
  isLoading = false
}) => {
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const predefinedReasons = [
    'Insufficient documentation',
    'Amount exceeds limit',
    'Missing receipt',
    'Duplicate expense',
    'Policy violation',
    'Incorrect category',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    // Validate required fields for rejection
    if (action === 'reject') {
      if (!comments || comments.trim().length < 10) {
        newErrors.comments = 'Rejection comments are required (minimum 10 characters)';
      }
      if (!reason) {
        newErrors.reason = 'Please select a rejection reason';
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      try {
        await onConfirm(comments.trim(), reason);
        handleClose();
      } catch (error) {
        console.error('Error submitting decision:', error);
      }
    }
  };

  const handleClose = () => {
    setComments('');
    setReason('');
    setErrors({});
    onClose();
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
      month: 'long',
      day: 'numeric'
    });
  };

  if (!approval) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg"
            >
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                      action === 'approve' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {action === 'approve' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        {action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {action === 'approve' 
                          ? 'Confirm your approval of this expense'
                          : 'Provide a reason for rejecting this expense'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Expense Summary */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: approval.expense.category.color }}
                    >
                      {approval.expense.category.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {approval.expense.title}
                        </h4>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatAmount(approval.expense.amount, approval.expense.currency)}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1 text-sm text-gray-500">
                        <p>
                          <span className="font-medium">Employee:</span>{' '}
                          {approval.expense.user.first_name} {approval.expense.user.last_name}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span>{' '}
                          {formatDate(approval.expense.expense_date)}
                        </p>
                        {approval.expense.merchant_name && (
                          <p>
                            <span className="font-medium">Merchant:</span>{' '}
                            {approval.expense.merchant_name}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Category:</span>{' '}
                          {approval.expense.category.name}
                        </p>
                      </div>
                      {approval.expense.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {approval.expense.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {/* Rejection reason (only for reject action) */}
                  {action === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason *
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                          errors.reason ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isLoading}
                      >
                        <option value="">Select a reason</option>
                        {predefinedReasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {errors.reason && (
                        <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
                      )}
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {action === 'approve' ? 'Comments (Optional)' : 'Comments *'}
                      <DocumentTextIcon className="w-4 h-4 inline ml-1" />
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        action === 'approve' 
                          ? 'focus:ring-green-500' 
                          : 'focus:ring-red-500'
                      } ${errors.comments ? 'border-red-500' : 'border-gray-300'}`}
                      rows={4}
                      placeholder={
                        action === 'approve'
                          ? 'Add any comments about this approval (optional)'
                          : 'Please provide detailed feedback about why this expense is being rejected'
                      }
                      disabled={isLoading}
                    />
                    {errors.comments && (
                      <p className="text-red-500 text-sm mt-1">{errors.comments}</p>
                    )}
                    {action === 'reject' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum 10 characters required
                      </p>
                    )}
                  </div>

                  {/* Warning for rejection */}
                  {action === 'reject' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Important
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              Rejecting this expense will return it to the employee for revision.
                              Make sure to provide clear feedback to help them resubmit correctly.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <motion.button
                  type="submit"
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      {action === 'approve' ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          Approve Expense
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-4 h-4 mr-2" />
                          Reject Expense
                        </>
                      )}
                    </>
                  )}
                </motion.button>
                
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApprovalDecisionModal;