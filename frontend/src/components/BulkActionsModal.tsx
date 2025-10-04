import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApprove: (comments?: string) => Promise<void>;
  onReject: (comments?: string) => Promise<void>;
  loading: boolean;
}

export default function BulkActionsModal({ 
  isOpen, 
  onClose, 
  selectedCount, 
  onApprove, 
  onReject,
  loading 
}: BulkActionsModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleActionSelect = (selectedAction: 'approve' | 'reject') => {
    setAction(selectedAction);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!action) return;
    
    try {
      if (action === 'approve') {
        await onApprove(comments || undefined);
      } else {
        await onReject(comments || undefined);
      }
      handleClose();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleClose = () => {
    setAction(null);
    setComments('');
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            {!showConfirmation ? (
              // Action Selection
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Bulk Actions
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Process {selectedCount} selected approval{selectedCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Approve Action */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleActionSelect('approve')}
                    className="w-full p-6 border-2 border-green-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="ml-4 text-left">
                        <h3 className="text-lg font-semibold text-green-900">
                          Approve All Selected
                        </h3>
                        <p className="text-green-700 text-sm mt-1">
                          Approve {selectedCount} expense{selectedCount !== 1 ? 's' : ''} for processing
                        </p>
                      </div>
                      <div className="ml-auto">
                        <motion.div
                          className="p-2 bg-green-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          whileHover={{ rotate: 5 }}
                        >
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Reject Action */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleActionSelect('reject')}
                    className="w-full p-6 border-2 border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                        <XCircleIcon className="w-8 h-8 text-red-600" />
                      </div>
                      <div className="ml-4 text-left">
                        <h3 className="text-lg font-semibold text-red-900">
                          Reject All Selected
                        </h3>
                        <p className="text-red-700 text-sm mt-1">
                          Reject {selectedCount} expense{selectedCount !== 1 ? 's' : ''} with reason
                        </p>
                      </div>
                      <div className="ml-auto">
                        <motion.div
                          className="p-2 bg-red-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          whileHover={{ rotate: 5 }}
                        >
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.button>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Confirmation Step
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${
                      action === 'approve' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {action === 'approve' ? (
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                      ) : (
                        <XCircleIcon className="w-8 h-8 text-red-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <h2 className={`text-2xl font-bold ${
                        action === 'approve' 
                          ? 'text-green-900' 
                          : 'text-red-900'
                      }`}>
                        Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {action === 'approve' ? 'Approve' : 'Reject'} {selectedCount} selected expense{selectedCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Warning for reject */}
                {action === 'reject' && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">
                          Rejection requires explanation
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Please provide a reason for rejecting these expenses to help employees understand the decision.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {action === 'approve' ? 'Comments (optional)' : 'Rejection reason (required)'}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={
                      action === 'approve' 
                        ? 'Add any additional comments...' 
                        : 'Please explain why these expenses are being rejected...'
                    }
                    required={action === 'reject'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    disabled={loading || (action === 'reject' && !comments.trim())}
                    className={`px-8 py-3 rounded-xl font-medium flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      action === 'approve'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        {action === 'approve' ? (
                          <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                          <XCircleIcon className="w-5 h-5" />
                        )}
                        <span>
                          Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}