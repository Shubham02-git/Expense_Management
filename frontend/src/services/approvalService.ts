import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE_URL = '/api'; // Use Next.js API routes

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ApprovalFilters {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ApprovalDecisionData {
  comments?: string;
  reason?: string;
}

export interface DelegationData {
  delegate_to: string;
  comments?: string;
}

export class ApprovalService {
  // Get pending approvals for current user
  static async getPendingApprovals(filters: ApprovalFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/approvals?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  // Get approval by ID
  static async getApprovalById(id: string) {
    try {
      const response = await api.get(`/approvals/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval:', error);
      throw error;
    }
  }

  // Approve expense
  static async approveExpense(id: string, data: ApprovalDecisionData = {}) {
    try {
      const response = await api.post(`/approvals/${id}/approve`, data);
      return response.data;
    } catch (error) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  // Reject expense
  static async rejectExpense(id: string, data: ApprovalDecisionData) {
    try {
      const response = await api.post(`/approvals/${id}/reject`, data);
      return response.data;
    } catch (error) {
      console.error('Error rejecting expense:', error);
      throw error;
    }
  }

  // Delegate approval
  static async delegateApproval(id: string, data: DelegationData) {
    try {
      const response = await api.post(`/approvals/${id}/delegate`, data);
      return response.data;
    } catch (error) {
      console.error('Error delegating approval:', error);
      throw error;
    }
  }

  // Bulk approve expenses
  static async bulkApproveExpenses(approvalIds: string[], comments?: string) {
    try {
      const response = await api.post('/approvals/bulk/approve', {
        approval_ids: approvalIds,
        comments
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk approving expenses:', error);
      throw error;
    }
  }

  // Bulk reject expenses
  static async bulkRejectExpenses(approvalIds: string[], comments?: string) {
    try {
      const response = await api.post('/approvals/bulk/reject', {
        approval_ids: approvalIds,
        comments
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk rejecting expenses:', error);
      throw error;
    }
  }

  // Get approval statistics
  static async getApprovalStats() {
    try {
      const response = await api.get('/approvals/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      throw error;
    }
  }

  // Get users for delegation
  static async getUsersForDelegation() {
    try {
      const response = await api.get('/users?role=manager,admin&active=true');
      return response.data;
    } catch (error) {
      console.error('Error fetching users for delegation:', error);
      throw error;
    }
  }
}

export default ApprovalService;