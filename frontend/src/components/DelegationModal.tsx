import React, { useState, useEffect } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CheckIcon,
  ChevronUpDownIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  role: string;
  department?: string;
  position?: string;
}

interface Approval {
  id: string;
  expense: {
    id: string;
    title: string;
    amount: number;
    currency: string;
    user: {
      first_name: string;
      last_name: string;
    };
  };
}

interface DelegationModalProps {
  approval: Approval | null;
  isOpen: boolean;
  onClose: () => void;
  onDelegate: (approvalId: string, delegateToId: string, reason: string) => Promise<void>;
  availableUsers: User[];
  isLoading?: boolean;
}

const DelegationModal: React.FC<DelegationModalProps> = ({
  approval,
  isOpen,
  onClose,
  onDelegate,
  availableUsers,
  isLoading = false
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [query, setQuery] = useState('');
  const [delegating, setDelegating] = useState(false);
  const [errors, setErrors] = useState<{ user?: string; reason?: string }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setReason('');
      setQuery('');
      setErrors({});
    }
  }, [isOpen]);

  const filteredUsers = query === ''
    ? availableUsers
    : availableUsers.filter((user) => {
        const searchText = `${user.first_name} ${user.last_name} ${user.email} ${user.employee_id}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

  const validateForm = () => {
    const newErrors: { user?: string; reason?: string } = {};
    
    if (!selectedUser) {
      newErrors.user = 'Please select a user to delegate to';
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Please provide a reason for delegation';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDelegate = async () => {
    if (!approval || !validateForm()) return;

    try {
      setDelegating(true);
      await onDelegate(approval.id, selectedUser!.id, reason.trim());
      onClose();
    } catch (error) {
      console.error('Delegation failed:', error);
    } finally {
      setDelegating(false);
    }
  };

  if (!approval) return null;

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                        <ArrowRightIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-semibold">
                          Delegate Approval
                        </Dialog.Title>
                        <p className="text-indigo-100 text-sm">
                          Transfer approval responsibility
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={onClose}
                      className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expense Info */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{approval.expense.title}</p>
                      <p className="text-sm text-gray-600">
                        {approval.expense.currency} {approval.expense.amount.toLocaleString()} • 
                        {approval.expense.user.first_name} {approval.expense.user.last_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="px-6 py-6 space-y-6">
                  {/* User Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delegate to
                    </label>
                    <Combobox value={selectedUser} onChange={setSelectedUser}>
                      <div className="relative">
                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                          <Combobox.Input
                            className="w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
                            displayValue={(user: User | null) =>
                              user ? `${user.first_name} ${user.last_name}` : ''
                            }
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search for a user..."
                          />
                          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </Combobox.Button>
                        </div>

                        <Transition
                          as={React.Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          afterLeave={() => setQuery('')}
                        >
                          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                            {filteredUsers.length === 0 && query !== '' ? (
                              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                Nothing found.
                              </div>
                            ) : (
                              filteredUsers.map((user) => (
                                <Combobox.Option
                                  key={user.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-3 pl-3 pr-9 ${
                                      active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                    }`
                                  }
                                  value={user}
                                >
                                  {({ selected, active }) => (
                                    <div className="flex items-center space-x-3">
                                      <div className={`rounded-full p-2 ${
                                        active ? 'bg-white/20' : 'bg-gray-100'
                                      }`}>
                                        <UserIcon className={`h-4 w-4 ${
                                          active ? 'text-white' : 'text-gray-600'
                                        }`} />
                                      </div>
                                      <div className="flex-1">
                                        <span className={`block truncate font-medium ${
                                          selected ? 'font-semibold' : ''
                                        }`}>
                                          {user.first_name} {user.last_name}
                                        </span>
                                        <span className={`block text-sm truncate ${
                                          active ? 'text-indigo-200' : 'text-gray-500'
                                        }`}>
                                          {user.email} • {user.employee_id}
                                        </span>
                                        {user.department && (
                                          <span className={`block text-xs truncate ${
                                            active ? 'text-indigo-300' : 'text-gray-400'
                                          }`}>
                                            {user.department}{user.position && ` • ${user.position}`}
                                          </span>
                                        )}
                                      </div>
                                      {selected && (
                                        <CheckIcon
                                          className={`h-5 w-5 ${
                                            active ? 'text-white' : 'text-indigo-600'
                                          }`}
                                        />
                                      )}
                                    </div>
                                  )}
                                </Combobox.Option>
                              ))
                            )}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </Combobox>
                    {errors.user && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{errors.user}</span>
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for delegation
                    </label>
                    <textarea
                      id="reason"
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={`block w-full rounded-lg border px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.reason ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Explain why you're delegating this approval..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Provide context for the delegation (minimum 10 characters)
                    </p>
                    {errors.reason && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{errors.reason}</span>
                      </p>
                    )}
                  </div>

                  {/* Selected User Preview */}
                  {selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg bg-indigo-50 border border-indigo-200 p-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-indigo-100 p-2">
                          <UserIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-indigo-900">
                            Delegating to: {selectedUser.first_name} {selectedUser.last_name}
                          </p>
                          <p className="text-sm text-indigo-700">
                            {selectedUser.email} • {selectedUser.role}
                          </p>
                          {selectedUser.department && (
                            <p className="text-xs text-indigo-600">
                              {selectedUser.department}{selectedUser.position && ` • ${selectedUser.position}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-2xl">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={delegating}
                  >
                    Cancel
                  </button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDelegate}
                    disabled={delegating || !selectedUser || !reason.trim()}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {delegating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Delegating...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightIcon className="h-4 w-4" />
                        <span>Delegate Approval</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DelegationModal;