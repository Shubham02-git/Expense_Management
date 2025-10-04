import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import ApprovalList from '../components/ApprovalList';
import ApprovalDecisionModal from '../components/ApprovalDecisionModal';
import DelegationModal from '../components/DelegationModal';
import BulkActionsModal from '../components/BulkActionsModal';
import ApprovalService, { ApprovalFilters } from '../services/approvalService';
import { useAuth } from '../components/AuthProvider';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

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

const ApprovalsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [currentApproval, setCurrentApproval] = useState<Approval | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [filters, setFilters] = useState<ApprovalFilters>({
    page: 1,
    limit: 20,
    status: 'pending',
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

  // Load approvals and stats
  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'manager' || user.role === 'admin')) {
      loadApprovals();
      loadStats();
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

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await ApprovalService.getPendingApprovals(filters);
      if (response.success) {
        setApprovals(response.data.approvals);
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await ApprovalService.getApprovalStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading approval stats:', error);
    }
  };

  const handleViewApproval = (approval: Approval) => {
    // TODO: Implement detailed approval view
    toast.success(`Viewing approval for: ${approval.expense.title}`);
  };

  const handleApprove = (approval: Approval) => {
    setCurrentApproval(approval);
    setDecisionAction('approve');
    setShowDecisionModal(true);
  };

  const handleReject = (approval: Approval) => {
    setCurrentApproval(approval);
    setDecisionAction('reject');
    setShowDecisionModal(true);
  };

  const handleDelegate = async (approval: Approval) => {
    setCurrentApproval(approval);
    setShowDelegationModal(true);
  };

  const handleDecisionConfirm = async (comments: string, reason?: string) => {
    if (!currentApproval) return;

    try {
      setDecisionLoading(true);
      
      if (decisionAction === 'approve') {
        const response = await ApprovalService.approveExpense(currentApproval.id, { comments });
        if (response.success) {
          toast.success('Expense approved successfully');
        }
      } else {
        const response = await ApprovalService.rejectExpense(currentApproval.id, { comments, reason });
        if (response.success) {
          toast.success('Expense rejected successfully');
        }
      }
      
      // Reload approvals and stats
      await loadApprovals();
      await loadStats();
      
    } catch (error) {
      console.error('Error processing decision:', error);
      toast.error(`Failed to ${decisionAction} expense`);
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleBulkApprove = async (comments?: string) => {
    if (selectedApprovals.length === 0) {
      toast.error('Please select approvals to process');
      return;
    }

    try {
      setBulkLoading(true);
      const response = await ApprovalService.bulkApproveExpenses(selectedApprovals, comments);
      
      if (response.success) {
        const { approved, failed } = response.data;
        toast.success(`${approved.length} expense${approved.length !== 1 ? 's' : ''} approved successfully`);
        
        if (failed.length > 0) {
          toast.error(`${failed.length} expense${failed.length !== 1 ? 's' : ''} failed to approve`);
        }
        
        setSelectedApprovals([]);
        await loadApprovals();
        await loadStats();
      }
    } catch (error) {
      console.error('Error in bulk approve:', error);
      toast.error('Failed to process bulk approval');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async (comments?: string) => {
    if (selectedApprovals.length === 0) {
      toast.error('Please select approvals to process');
      return;
    }

    try {
      setBulkLoading(true);
      const response = await ApprovalService.bulkRejectExpenses(selectedApprovals, comments);
      
      if (response.success) {
        const { rejected, failed } = response.data;
        toast.success(`${rejected.length} expense${rejected.length !== 1 ? 's' : ''} rejected successfully`);
        
        if (failed.length > 0) {
          toast.error(`${failed.length} expense${failed.length !== 1 ? 's' : ''} failed to reject`);
        }
        
        setSelectedApprovals([]);
        await loadApprovals();
        await loadStats();
      }
    } catch (error) {
      console.error('Error in bulk reject:', error);
      toast.error('Failed to process bulk rejection');
    } finally {
      setBulkLoading(false);
    }
  };

  // Check if user has approval permissions
  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view approvals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Approvals</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and approve expense submissions from your team
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {selectedApprovals.length > 0 && (
                <motion.button
                  onClick={() => setShowBulkModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={bulkLoading}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {bulkLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                  )}
                  Bulk Actions ({selectedApprovals.length})
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_approvals || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">⏳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.by_status?.pending || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.by_status?.approved || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.by_status?.rejected || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approvals List */}
        <ApprovalList
          approvals={approvals}
          loading={loading}
          onViewApproval={handleViewApproval}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelegate={handleDelegate}
          selectedApprovals={selectedApprovals}
          onSelectionChange={setSelectedApprovals}
          showBulkActions={true}
        />

        {/* Decision Modal */}
        <ApprovalDecisionModal
          isOpen={showDecisionModal}
          onClose={() => setShowDecisionModal(false)}
          approval={currentApproval}
          action={decisionAction}
          onConfirm={handleDecisionConfirm}
          isLoading={decisionLoading}
        />

        <DelegationModal
          isOpen={showDelegationModal}
          onClose={() => setShowDelegationModal(false)}
          approval={currentApproval}
          availableUsers={[]} // TODO: Fetch available users from API
          onDelegate={async (approvalId: string, delegateToId: string, reason: string) => {
            try {
              // TODO: Implement delegation API call
              console.log('Delegating approval', approvalId, 'to user', delegateToId, 'with reason:', reason);
              setShowDelegationModal(false);
              // Refresh approvals list after delegation
              loadApprovals();
            } catch (error) {
              console.error('Failed to delegate approval:', error);
            }
          }}
        />

        {/* Bulk Actions Modal */}
        <BulkActionsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedCount={selectedApprovals.length}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          loading={bulkLoading}
        />
      </div>
    </div>
  );
};

export default ApprovalsPage;