import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Settings as SettingsIcon,
  Upload,
  FileText,
  Package,
  Target,
  Shield,
  LogOut,
  Building2,
  MessageSquare,
} from 'lucide-react';
import iconLogo from './assets/icon.svg';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import UsersPage from './pages/Users';
import Employees from './pages/Employees';
import SalesPlans from './pages/SalesPlans';
import SalesFacts from './pages/SalesFacts';
import Attendance from './pages/Attendance';
import Timesheet from './pages/Timesheet';
import WorkCalendar from './pages/WorkCalendar';
import SummaryReport from './pages/SummaryReport';
import Settings from './pages/Settings';
import SalaryRuleForm from './pages/SalaryRuleForm';
import DataImport from './pages/DataImport';
import Companies from './pages/Companies';
import TelegramTemplates from './pages/TelegramTemplates';
import CompanySelector from './components/CompanySelector';

function Navigation() {
  const location = useLocation();
  const { user, logout, hasAccess, companies, currentCompanyId, switchCompany } = useAuth();
  
  const allNavItems = [
    { path: '/', icon: FileText, label: 'Сводная таблица', page: 'summary', roles: ['admin', 'director', 'analyst', 'supervisor', 'manager'] },
    { path: '/timesheet', icon: Calendar, label: 'Табель', page: 'timesheet', roles: ['admin', 'director', 'analyst', 'hr', 'supervisor', 'manager'] },
    
    { type: 'divider', roles: ['admin'] },
    
    // Группа "Загрузка данных"
    { type: 'header', label: 'Загрузка данных', roles: ['admin'] },
    { path: '/import', label: 'Загрузка данных', page: 'import', roles: ['admin'], isSubItem: true },
    { path: '/sales-plans', label: 'Планы продаж', page: 'plans', roles: ['admin', 'director', 'analyst'], isSubItem: true },
    { path: '/sales-facts', label: 'Факты продаж', page: 'facts', roles: ['admin', 'director'], isSubItem: true },
    
    { type: 'divider', roles: ['admin'] },
    
    // Группа "Настройки"
    { type: 'header', label: 'Настройки', roles: ['admin'] },
    { path: '/settings', label: 'Общие настройки', page: 'settings', roles: ['admin', 'director', 'analyst'], isSubItem: true },
    { path: '/work-calendar', label: 'Производственный календарь', page: 'calendar', roles: ['admin'], isSubItem: true },
    { path: '/companies', label: 'Компании', page: 'companies', roles: ['admin', 'director'], isSubItem: true },
    { path: '/users', label: 'Пользователи', page: 'users', roles: ['admin', 'director'], isSubItem: true },
    { path: '/employees', label: 'Сотрудники', page: 'employees', roles: ['admin', 'director', 'analyst', 'hr'], isSubItem: true },
    { path: '/telegram-templates', label: 'Шаблоны Telegram', page: 'telegram', roles: ['admin', 'director', 'analyst'], isSubItem: true },
  ];
  
  const handleCompanyChange = async (e) => {
    const companyId = parseInt(e.target.value);
    if (companyId) {
      await switchCompany(companyId);
      window.location.reload(); // Перезагрузка для обновления данных
    }
  };
  
  // Фильтруем пункты меню по ролям
  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  return (
    <nav className="bg-white border-r border-gray-200 w-64 min-h-screen p-4">
      <div className="mb-8 flex flex-col items-center">
        <img src={iconLogo} alt="Zarplata" className="w-24 h-24 mb-3" />
        <p className="text-sm text-gray-500 text-center">Расчет продаж и зарплаты</p>
      </div>
      
      <ul className="space-y-1">
        {navItems.map((item, index) => {
          // Разделитель
          if (item.type === 'divider') {
            return (
              <li key={`divider-${index}`} className="my-3">
                <div className="border-t border-gray-200"></div>
              </li>
            );
          }
          
          // Заголовок группы
          if (item.type === 'header') {
            return (
              <li key={`header-${index}`} className="mt-3 mb-1">
                <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {item.label}
                </div>
              </li>
            );
          }
          
          // Обычный пункт меню
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isSubItem = item.isSubItem;
          
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center rounded-lg transition-colors ${
                  isSubItem 
                    ? 'px-4 py-2 pl-6' 
                    : 'px-4 py-3 space-x-3'
                } ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon size={20} />}
                <span className={isSubItem ? 'text-sm' : ''}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      {/* Нижняя часть - прижата к низу */}
      <div className="mt-auto">
        {/* Переключатель компаний для admin и director */}
        {(user?.role === 'admin' || user?.role === 'director') && companies.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center mb-2">
              <Building2 size={14} className="mr-1 text-gray-500" />
              <span className="text-xs text-gray-500">Компания</span>
            </div>
            <select
              value={currentCompanyId || ''}
              onChange={handleCompanyChange}
              className="w-full px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Показываем текущую компанию для analyst */}
        {user?.role === 'analyst' && user?.company_id && (
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center mb-1">
              <Building2 size={14} className="mr-1 text-gray-500" />
              <span className="text-xs text-gray-500">Компания</span>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {companies.find(c => c.id === user.company_id)?.name || `ID: ${user.company_id}`}
            </p>
          </div>
        )}
        
        {/* Блок пользователя */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <Users size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-primary-600">
                {user?.role === 'admin' && 'Администратор'}
                {user?.role === 'director' && 'Директор'}
                {user?.role === 'analyst' && 'Аналитик'}
                {user?.role === 'hr' && 'HR'}
                {user?.role === 'supervisor' && 'Супервайзер'}
                {user?.role === 'manager' && 'Менеджер'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Кнопка выхода - в самом низу */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Выход</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { user, needsCompanySelection } = useAuth();
  
  // Показываем модальное окно выбора компании если нужно
  if (needsCompanySelection) {
    return <CompanySelector />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="flex-1 p-8">
        <Routes>
          {/* Сводная таблица - для admin, director, analyst, supervisor, manager */}
          <Route path="/" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst', 'supervisor', 'manager']}>
              <SummaryReport />
            </PrivateRoute>
          } />
          
          {/* Загрузка данных - только admin */}
          <Route path="/import" element={
            <PrivateRoute allowedRoles={['admin']}>
              <DataImport />
            </PrivateRoute>
          } />
          
          {/* Сотрудники - admin, director, analyst и hr */}
          <Route path="/employees" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst', 'hr']}>
              <Employees />
            </PrivateRoute>
          } />
          
          {/* Планы продаж - admin, director, analyst */}
          <Route path="/sales-plans" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst']}>
              <SalesPlans />
            </PrivateRoute>
          } />
          
          {/* Факты продаж - admin, director */}
          <Route path="/sales-facts" element={
            <PrivateRoute allowedRoles={['admin', 'director']}>
              <SalesFacts />
            </PrivateRoute>
          } />
          
          {/* Табель - admin, director, analyst, hr, supervisor, manager */}
          <Route path="/timesheet" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst', 'hr', 'supervisor', 'manager']}>
              <Timesheet />
            </PrivateRoute>
          } />
          
          {/* Производственный календарь - только admin */}
          <Route path="/work-calendar" element={
            <PrivateRoute allowedRoles={['admin']}>
              <WorkCalendar />
            </PrivateRoute>
          } />
          
          {/* Пользователи - admin и director */}
          <Route path="/users" element={
            <PrivateRoute allowedRoles={['admin', 'director']}>
              <UsersPage />
            </PrivateRoute>
          } />
          
          {/* Компании - admin и director */}
          <Route path="/companies" element={
            <PrivateRoute allowedRoles={['admin', 'director']}>
              <Companies />
            </PrivateRoute>
          } />
          
          {/* Шаблоны Telegram - admin, director, analyst */}
          <Route path="/telegram-templates" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst']}>
              <TelegramTemplates />
            </PrivateRoute>
          } />
          
          {/* Посещаемость - только admin */}
          <Route path="/attendance" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Attendance />
            </PrivateRoute>
          } />
          
          {/* Настройки - admin, director, analyst */}
          <Route path="/settings" element={
            <PrivateRoute allowedRoles={['admin', 'director', 'analyst']}>
              <Settings />
            </PrivateRoute>
          } />
          
          {/* Правила зарплаты - только admin */}
          <Route path="/salary-rules/new" element={
            <PrivateRoute allowedRoles={['admin']}>
              <SalaryRuleForm />
            </PrivateRoute>
          } />
          <Route path="/salary-rules/:id/edit" element={
            <PrivateRoute allowedRoles={['admin']}>
              <SalaryRuleForm />
            </PrivateRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
