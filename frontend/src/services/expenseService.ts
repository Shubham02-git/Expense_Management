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

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  userId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateExpenseData {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  expense_date: string;
  merchant_name?: string;
  merchant_address?: string;
  payment_method: string;
  category_id: string;
  reimbursement_requested?: boolean;
  tax_amount?: number;
  tags?: string[];
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {}

export class ExpenseService {
  // Get all expenses with optional filters
  static async getExpenses(filters: ExpenseFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expense by ID
  static async getExpenseById(id: string) {
    try {
      const response = await api.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  }

  // Create new expense
  static async createExpense(data: CreateExpenseData) {
    try {
      const response = await api.post('/expenses', data);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Update expense
  static async updateExpense(id: string, data: UpdateExpenseData) {
    try {
      const response = await api.put(`/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete expense
  static async deleteExpense(id: string) {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Submit expense for approval
  static async submitExpense(id: string) {
    try {
      const response = await api.post(`/expenses/${id}/submit`);
      return response.data;
    } catch (error) {
      console.error('Error submitting expense:', error);
      throw error;
    }
  }

  // Upload receipt
  static async uploadReceipt(id: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await api.post(`/expenses/${id}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  }

  // Get expense statistics
  static async getExpenseStats() {
    try {
      const response = await api.get('/expenses/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }

  // Get expense categories
  static async getCategories() {
    try {
      const response = await api.get('/expense-categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get supported currencies
  static async getCurrencies() {
    try {
      const response = await api.get('/external/currencies');
      return response.data;
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    }
  }

  // Convert currency
  static async convertCurrency(amount: number, from: string, to: string) {
    try {
      const response = await api.post('/external/convert-currency', {
        amount,
        from,
        to
      });
      return response.data;
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }

  // Export expenses
  static async exportExpenses(filters: ExpenseFilters = {}, format: 'csv' | 'excel' = 'csv') {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      params.append('format', format);

      const response = await api.get(`/expenses/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      return response.data;
    } catch (error) {
      console.error('Error exporting expenses:', error);
      throw error;
    }
  }

  // Bulk operations
  static async bulkUpdateExpenses(expenseIds: string[], data: UpdateExpenseData) {
    try {
      const response = await api.put('/expenses/bulk', {
        expense_ids: expenseIds,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating expenses:', error);
      throw error;
    }
  }

  static async bulkDeleteExpenses(expenseIds: string[]) {
    try {
      const response = await api.delete('/expenses/bulk', {
        data: { expense_ids: expenseIds }
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting expenses:', error);
      throw error;
    }
  }

  static async bulkSubmitExpenses(expenseIds: string[]) {
    try {
      const response = await api.post('/expenses/bulk/submit', {
        expense_ids: expenseIds
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk submitting expenses:', error);
      throw error;
    }
  }
}

export default ExpenseService;