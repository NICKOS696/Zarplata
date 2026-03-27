import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? window.location.origin + '/api'
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена и company_id в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Добавляем company_id в заголовок
  const companyId = localStorage.getItem('selectedCompanyId');
  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
  }
  
  return config;
});

// Employees
export const employeesAPI = {
  getAll: (params = {}) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  bulkDelete: (employeeIds) => api.post('/employees/bulk-delete', employeeIds),
  bulkAssignSalaryRule: (employeeIds, salaryRuleId) => api.post('/employees/bulk-assign-salary-rule', { employee_ids: employeeIds, salary_rule_id: salaryRuleId }),
};

// Territories
export const territoriesAPI = {
  getAll: (params = {}) => api.get('/territories', { params }),
  getById: (id) => api.get(`/territories/${id}`),
  create: (data) => api.post('/territories', data),
  update: (id, data) => api.put(`/territories/${id}`, data),
  delete: (id) => api.delete(`/territories/${id}`),
  bulkDelete: (territoryIds) => api.post('/territories/bulk-delete', territoryIds),
  reorder: (data) => api.post('/territories/reorder', data),
  bulkUpdateCriteria: (territoryIds, criteria) => api.post('/territories/bulk-update-criteria', { territory_ids: territoryIds, criteria }),
};

// Brands
export const brandsAPI = {
  getAll: (params = {}) => api.get('/brands', { params }),
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
};

// KPI Types
export const kpiTypesAPI = {
  getAll: (params = {}) => api.get('/kpi-types', { params }),
  getById: (id) => api.get(`/kpi-types/${id}`),
  create: (data) => api.post('/kpi-types', data),
  update: (id, data) => api.put(`/kpi-types/${id}`, data),
  delete: (id) => api.delete(`/kpi-types/${id}`),
};

// Sales Plans
export const salesPlansAPI = {
  getAll: (params = {}) => api.get('/sales-plans', { params }),
  getById: (id) => api.get(`/sales-plans/${id}`),
  create: (data) => api.post('/sales-plans', data),
  update: (id, data) => api.put(`/sales-plans/${id}`, data),
  delete: (id) => api.delete(`/sales-plans/${id}`),
  createBulk: (data) => api.post('/sales-plans/bulk', data),
};

// Sales Facts
export const salesFactsAPI = {
  getAll: (params = {}) => api.get('/sales-facts', { params }),
  create: (data) => api.post('/sales-facts', data),
  createBulk: (data) => api.post('/sales-facts/bulk', data),
};

// Reserved Orders
export const reservedOrdersAPI = {
  getAll: (params = {}) => api.get('/reserved-orders', { params }),
};

// Work Calendar
export const workCalendarAPI = {
  getAll: (params = {}) => api.get('/work-calendar', { params }),
  getByYearMonth: (year, month) => api.get(`/work-calendar/${year}/${month}`),
  create: (data) => api.post('/work-calendar', data),
  update: (year, month, data) => api.put(`/work-calendar/${year}/${month}`, data),
};

// Attendance
export const attendanceAPI = {
  getAll: (params = {}) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
};

// Salary Rules
export const salaryRulesAPI = {
  getAll: (params = {}) => api.get('/salary-rules', { params }),
  getById: (id) => api.get(`/salary-rules/${id}`),
  create: (data) => api.post('/salary-rules', data),
  update: (id, data) => api.put(`/salary-rules/${id}`, data),
  delete: (id) => api.delete(`/salary-rules/${id}`),
};

// Salary Calculations
export const salaryCalculationsAPI = {
  getAll: (params = {}) => api.get('/salary-calculations', { params }),
  calculate: (employeeId, periodStart, periodEnd) =>
    api.post('/salary-calculations/calculate', null, {
      params: { employee_id: employeeId, period_start: periodStart, period_end: periodEnd },
    }),
  calculateTeam: (periodStart, periodEnd, supervisorId = null) =>
    api.post('/salary-calculations/calculate-team', null, {
      params: { period_start: periodStart, period_end: periodEnd, supervisor_id: supervisorId },
    }),
};

// Dashboard
export const dashboardAPI = {
  getTeamDashboard: (periodStart, periodEnd) =>
    api.get('/dashboard/team', {
      params: { period_start: periodStart, period_end: periodEnd },
    }),
};

// Import Logs
export const importLogsAPI = {
  getAll: (params = {}) => api.get('/import-logs', { params }),
};

// Telegram
export const telegramAPI = {
  sendReports: (year, month, employeeIds = null) => {
    let url = `/telegram/send-reports?year=${year}&month=${month}`;
    if (employeeIds && employeeIds.length > 0) {
      employeeIds.forEach(id => {
        url += `&employee_ids=${id}`;
      });
    }
    return api.post(url);
  },
};

// Import from 1C
export const importAPI = {
  parseFile: (file, importType) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/parse?import_type=${importType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  executeImport: (file, importType, year, month, day = null) => {
    const formData = new FormData();
    formData.append('file', file);
    let url = `/import/execute?import_type=${importType}&year=${year}&month=${month}`;
    if (day) url += `&day=${day}`;
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  createEmployee: (employeeData) => api.post('/import/create-employee', employeeData),
  importOrders: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/orders-html', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  importOrderCount: (file, year, month) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/order-count-html?year=${year}&month=${month}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  importBulk: (files, year, month) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return api.post(`/import/bulk?year=${year}&month=${month}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Daily Order Stats
export const dailyOrderStatsAPI = {
  getAll: (params = {}) => api.get('/daily-order-stats', { params }),
};

// Absences
export const absencesAPI = {
  getAll: (params = {}) => api.get('/absences', { params }),
  getById: (id) => api.get(`/absences/${id}`),
  create: (data) => api.post('/absences', data),
  update: (id, data) => api.put(`/absences/${id}`, data),
  delete: (id) => api.delete(`/absences/${id}`),
};

// Bonuses
export const bonusesAPI = {
  getAll: (params = {}) => api.get('/bonuses', { params }),
  getById: (id) => api.get(`/bonuses/${id}`),
  create: (data) => api.post('/bonuses', data),
  update: (id, data) => api.put(`/bonuses/${id}`, data),
  delete: (id) => api.delete(`/bonuses/${id}`),
};

// Timesheet
export const timesheetAPI = {
  calculateAttendance: (year, month) => api.post(`/timesheet/calculate-attendance?year=${year}&month=${month}`),
};

// Authentication
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/current-user'),
  switchCompany: (companyId) => api.post(`/auth/switch-company?company_id=${companyId}`),
};

// Companies
export const companiesAPI = {
  getAll: (params = {}) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// Users (только для admin)
export const usersAPI = {
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Interceptor для добавления токена к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Если получили 401, удаляем токен и перенаправляем на логин
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Telegram Message Templates
export const telegramTemplatesAPI = {
  getAll: (companyId) => api.get('/telegram-templates', { params: { company_id: companyId } }),
  getById: (id) => api.get(`/telegram-templates/${id}`),
  create: (data) => api.post('/telegram-templates', data),
  update: (id, data) => api.put(`/telegram-templates/${id}`, data),
  delete: (id) => api.delete(`/telegram-templates/${id}`),
  render: (templateId, employeeId, year, month) => 
    api.post(`/telegram-templates/${templateId}/render`, null, {
      params: { employee_id: employeeId, year, month }
    }),
  sendReports: (templateId, year, month, employeeIds = null) => {
    const params = new URLSearchParams({
      template_id: templateId,
      year: year,
      month: month
    });
    if (employeeIds && employeeIds.length > 0) {
      employeeIds.forEach(id => params.append('employee_ids', id));
    }
    return api.post(`/telegram/send-reports?${params.toString()}`);
  },
};

export default api;
