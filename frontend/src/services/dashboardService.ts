import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  categoryId?: string;
  status?: string;
}

export interface DashboardStats {
  totalExpenses: number;
  totalAmount: number;
  pendingApprovals: number;
  recentSubmissions: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byCategory: Record<string, { count: number; amount: number; color: string }>;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
  topSpenders: Array<{ 
    user: { 
      first_name: string; 
      last_name: string; 
      email: string; 
    }; 
    total_amount: number; 
    expense_count: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'expense_created' | 'expense_submitted' | 'expense_approved' | 'expense_rejected';
    expense: {
      title: string;
      amount: number;
      currency: string;
      user: { first_name: string; last_name: string };
    };
    created_at: string;
  }>;
}

export class DashboardService {
  // Get dashboard statistics
  static async getDashboardStats(filters: DashboardFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/dashboard/stats?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get expense trends
  static async getExpenseTrends(filters: DashboardFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/dashboard/trends?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expense trends:', error);
      throw error;
    }
  }

  // Get category breakdown
  static async getCategoryBreakdown(filters: DashboardFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/dashboard/categories?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      throw error;
    }
  }

  // Get top spenders
  static async getTopSpenders(filters: DashboardFilters = {}, limit: number = 10) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      params.append('limit', limit.toString());

      const response = await api.get(`/dashboard/top-spenders?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching top spenders:', error);
      throw error;
    }
  }

  // Get recent activity
  static async getRecentActivity(filters: DashboardFilters = {}, limit: number = 20) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      params.append('limit', limit.toString());

      const response = await api.get(`/dashboard/activity?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  // Get budget utilization
  static async getBudgetUtilization(filters: DashboardFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/dashboard/budget?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching budget utilization:', error);
      throw error;
    }
  }

  // Export dashboard data
  static async exportDashboardData(filters: DashboardFilters = {}, format: 'csv' | 'excel' = 'csv') {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      params.append('format', format);

      const response = await api.get(`/dashboard/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      return response.data;
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      throw error;
    }
  }

  // Get comparison data (current vs previous period)
  static async getComparisonData(filters: DashboardFilters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/dashboard/comparison?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      throw error;
    }
  }

  // Get alerts and notifications for dashboard
  static async getDashboardAlerts() {
    try {
      const response = await api.get('/dashboard/alerts');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard alerts:', error);
      throw error;
    }
  }
}

export default DashboardService;