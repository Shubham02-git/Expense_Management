import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  DocumentIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  MapPinIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

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

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onSubmit?: (expense: Expense) => void;
  currentUser: any;
}

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSubmit,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'receipt' | 'approvals' | 'history'>('details');
  const [receiptLoaded, setReceiptLoaded] = useState(false);

  if (!expense) return null;

  const statusConfig = {
    draft: { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: DocumentIcon,
      label: 'Draft'
    },
    submitted: { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: ClockIcon,
      label: 'Pending Approval'
    },
    approved: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircleIcon,
      label: 'Approved'
    },
    rejected: { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: XCircleIcon,
      label: 'Rejected'
    },
    paid: { 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      icon: CheckCircleIcon,
      label: 'Paid'
    }
  };

  const StatusIcon = statusConfig[expense.status].icon;
  const canEdit = currentUser?.id === expense.user.id && ['draft', 'rejected'].includes(expense.status);
  const canDelete = currentUser?.id === expense.user.id && expense.status === 'draft';
  const canSubmit = currentUser?.id === expense.user.id && expense.status === 'draft';

  const tabs = [
    { id: 'details', label: 'Details', icon: DocumentIcon },
    { id: 'receipt', label: 'Receipt', icon: EyeIcon },
    { id: 'approvals', label: 'Approvals', icon: UserIcon },
    { id: 'history', label: 'History', icon: ClockIcon }
  ];

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                        <CurrencyDollarIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <Dialog.Title className="text-2xl font-bold">
                          {expense.title}
                        </Dialog.Title>
                        <p className="text-blue-100">
                          {expense.expense_number} • {expense.user.first_name} {expense.user.last_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 rounded-full border px-3 py-1 text-sm font-medium ${statusConfig[expense.status].color} bg-white/20 border-white/30 text-white`}>
                        <StatusIcon className="h-4 w-4" />
                        <span>{statusConfig[expense.status].label}</span>
                      </div>
                      
                      <button
                        onClick={onClose}
                        className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Amount Display */}
                  <div className="mt-6 flex items-baseline space-x-2">
                    <span className="text-4xl font-bold">
                      {expense.currency} {expense.amount.toLocaleString()}
                    </span>
                    {expense.currency !== 'USD' && (
                      <span className="text-lg text-blue-100">
                        ≈ ${expense.amount_in_company_currency.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {(canEdit || canDelete || canSubmit) && (
                  <div className="border-b bg-gray-50 px-8 py-4">
                    <div className="flex space-x-3">
                      {canEdit && onEdit && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onEdit(expense)}
                          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </motion.button>
                      )}
                      
                      {canSubmit && onSubmit && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onSubmit(expense)}
                          className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          <DocumentArrowUpIcon className="h-4 w-4" />
                          <span>Submit for Approval</span>
                        </motion.button>
                      )}
                      
                      {canDelete && onDelete && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onDelete(expense)}
                          className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Navigation */}
                <div className="border-b bg-white">
                  <nav className="flex space-x-8 px-8" aria-label="Tabs">
                    {tabs.map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`group inline-flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-medium transition-all ${
                            isActive
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                        >
                          <TabIcon className={`h-5 w-5 transition-colors ${
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="px-8 py-6 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {activeTab === 'details' && (
                      <motion.div
                        key="details"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                          
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <CalendarIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Expense Date</p>
                                <p className="font-medium">{format(new Date(expense.expense_date), 'PPP')}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <TagIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Category</p>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: expense.category.color }} />
                                  <span className="font-medium">{expense.category.name}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Merchant</p>
                                <p className="font-medium">{expense.merchant_name}</p>
                                {expense.merchant_address && (
                                  <p className="text-sm text-gray-600">{expense.merchant_address}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <CreditCardIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Payment Method</p>
                                <p className="font-medium capitalize">{expense.payment_method}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Financial Details</h3>
                          
                          <div className="space-y-3">
                            <div className="rounded-lg bg-gray-50 p-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Original Amount</span>
                                <span className="font-semibold">{expense.currency} {expense.amount.toLocaleString()}</span>
                              </div>
                              
                              {expense.currency !== 'USD' && (
                                <>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm text-gray-500">Exchange Rate</span>
                                    <span className="text-sm">{expense.exchange_rate}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                    <span className="text-sm text-gray-500">Company Currency</span>
                                    <span className="font-semibold">${expense.amount_in_company_currency.toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              
                              {expense.tax_amount && (
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-sm text-gray-500">Tax Amount</span>
                                  <span className="text-sm">{expense.currency} {expense.tax_amount.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="text-sm text-gray-500">Reimbursement</p>
                                <p className="font-medium">
                                  {expense.reimbursement_requested ? (
                                    <span className="text-green-600">Requested</span>
                                  ) : (
                                    <span className="text-gray-600">Not Requested</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {expense.description && (
                          <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                            <div className="rounded-lg bg-gray-50 p-4">
                              <p className="text-gray-700">{expense.description}</p>
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {expense.tags && expense.tags.length > 0 && (
                          <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {expense.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'receipt' && (
                      <motion.div
                        key="receipt"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="text-center"
                      >
                        {expense.receipt_url ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Receipt</h3>
                            <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300">
                              <img
                                src={expense.receipt_url}
                                alt="Receipt"
                                className="max-w-full h-auto mx-auto"
                                onLoad={() => setReceiptLoaded(true)}
                              />
                              {!receiptLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>
                            {expense.receipt_filename && (
                              <p className="text-sm text-gray-500">
                                File: {expense.receipt_filename}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="py-12">
                            <DocumentIcon className="mx-auto h-16 w-16 text-gray-300" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No Receipt</h3>
                            <p className="mt-2 text-gray-500">No receipt has been uploaded for this expense.</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'approvals' && (
                      <motion.div
                        key="approvals"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">Approval History</h3>
                        
                        {expense.approvals && expense.approvals.length > 0 ? (
                          <div className="space-y-3">
                            {expense.approvals.map((approval, index) => (
                              <div key={approval.id} className="rounded-lg border bg-white p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`rounded-full p-2 ${
                                      approval.status === 'approved' ? 'bg-green-100 text-green-600' :
                                      approval.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                      'bg-yellow-100 text-yellow-600'
                                    }`}>
                                      {approval.status === 'approved' ? (
                                        <CheckCircleIcon className="h-5 w-5" />
                                      ) : approval.status === 'rejected' ? (
                                        <XCircleIcon className="h-5 w-5" />
                                      ) : (
                                        <ClockIcon className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        {approval.approver.first_name} {approval.approver.last_name}
                                      </p>
                                      <p className="text-sm text-gray-500">{approval.approver.email}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                                      approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                    </p>
                                    {approval.decision_date && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {format(new Date(approval.decision_date), 'PPp')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {approval.comments && (
                                  <div className="mt-3 rounded bg-gray-50 p-3">
                                    <div className="flex items-start space-x-2">
                                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                                      <p className="text-sm text-gray-700">{approval.comments}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <UserIcon className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Approvals Yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              This expense hasn't been submitted for approval yet.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'history' && (
                      <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">Activity History</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                            <div className="rounded-full bg-blue-100 p-2">
                              <DocumentIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Expense Created</p>
                              <p className="text-xs text-gray-500">{format(new Date(expense.created_at), 'PPp')}</p>
                            </div>
                          </div>
                          
                          {expense.updated_at !== expense.created_at && (
                            <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                              <div className="rounded-full bg-yellow-100 p-2">
                                <PencilIcon className="h-4 w-4 text-yellow-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Expense Updated</p>
                                <p className="text-xs text-gray-500">{format(new Date(expense.updated_at), 'PPp')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExpenseDetailModal;