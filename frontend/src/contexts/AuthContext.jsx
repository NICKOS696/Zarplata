import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, companiesAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [needsCompanySelection, setNeedsCompanySelection] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли сохраненный токен при загрузке приложения
    const token = localStorage.getItem('token');
    if (token) {
      // Загружаем данные текущего пользователя
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      
      // Загружаем список компаний для admin, director и analyst
      if (['admin', 'director', 'analyst'].includes(response.data.role)) {
        const companiesRes = await companiesAPI.getAll();
        setCompanies(companiesRes.data);
        
        // Для admin и director проверяем сохраненную компанию
        if (['admin', 'director'].includes(response.data.role)) {
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          if (savedCompanyId && companiesRes.data.some(c => c.id === parseInt(savedCompanyId))) {
            setCurrentCompanyId(parseInt(savedCompanyId));
            setNeedsCompanySelection(false);
          } else {
            // Нужно выбрать компанию
            setNeedsCompanySelection(true);
          }
        } else {
          // Для analyst используем company_id из профиля
          setCurrentCompanyId(response.data.company_id);
        }
      } else {
        // Для других ролей используем company_id из профиля
        setCurrentCompanyId(response.data.company_id);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      // Если токен невалидный, удаляем его
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedCompanyId');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const { access_token } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      // Загружаем данные пользователя
      await loadCurrentUser();
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка входа:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка входа в систему' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      // Удаляем токен и данные пользователя
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedCompanyId');
      setUser(null);
      setCurrentCompanyId(null);
      setCompanies([]);
      setNeedsCompanySelection(false);
    }
  };

  // Первоначальный выбор компании (при входе)
  const selectCompany = (companyId) => {
    localStorage.setItem('selectedCompanyId', companyId.toString());
    setCurrentCompanyId(companyId);
    setNeedsCompanySelection(false);
  };

  // Переключение компании (в процессе работы)
  const switchCompany = async (companyId) => {
    try {
      // Сохраняем выбранную компанию
      localStorage.setItem('selectedCompanyId', companyId.toString());
      setCurrentCompanyId(companyId);
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка переключения компании:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Ошибка переключения компании' 
      };
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasAccess = (page) => {
    if (!user) return false;

    // Администратор имеет доступ ко всему
    if (user.role === 'admin') return true;

    // Директор имеет доступ ко всему
    if (user.role === 'director') return true;

    // Определяем доступ по ролям
    const accessMap = {
      analyst: ['summary', 'employees', 'timesheet', 'sales-plans', 'attendance', 'settings'],
      hr: ['employees', 'timesheet'],
      supervisor: ['summary', 'timesheet'],
      manager: ['summary', 'timesheet'],
    };

    const allowedPages = accessMap[user.role] || [];
    return allowedPages.includes(page);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasAccess,
    companies,
    currentCompanyId,
    switchCompany,
    needsCompanySelection,
    selectCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
