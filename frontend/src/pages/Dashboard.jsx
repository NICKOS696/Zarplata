import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { TrendingUp, TrendingDown, Users, Target, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    loadDashboard();
  }, [periodStart, periodEnd]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getTeamDashboard(periodStart, periodEnd);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Нет данных</div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Всего сотрудников',
      value: dashboardData.total_employees,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'План продаж',
      value: `${dashboardData.total_plan.toLocaleString('ru-RU')} ₽`,
      icon: Target,
      color: 'bg-purple-500',
    },
    {
      label: 'Факт продаж',
      value: `${dashboardData.total_fact.toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Выполнение плана',
      value: `${dashboardData.avg_completion_percent.toFixed(1)}%`,
      icon: dashboardData.avg_completion_percent >= 100 ? TrendingUp : TrendingDown,
      color: dashboardData.avg_completion_percent >= 100 ? 'bg-green-500' : 'bg-orange-500',
    },
  ];

  // Данные для графика сотрудников
  const employeeChartData = dashboardData.employees.map(emp => ({
    name: emp.employee_name.split(' ')[0],
    план: emp.total_plan,
    факт: emp.total_fact,
    выполнение: emp.completion_percent,
  }));

  // Данные для графика брендов
  const brandChartData = dashboardData.brands.map(brand => ({
    name: brand.brand_name,
    value: brand.total_fact,
    completion: brand.completion_percent,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-600 mt-1">Общая статистика продаж и выполнения</p>
        </div>
        
        <div className="flex space-x-4">
          <div>
            <label className="label">Период с</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">по</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance Chart */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Выполнение по сотрудникам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString('ru-RU')} />
              <Legend />
              <Bar dataKey="план" fill="#94a3b8" />
              <Bar dataKey="факт" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Brand Performance Chart */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Продажи по брендам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={brandChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {brandChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString('ru-RU') + ' ₽'} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Table */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Детализация по сотрудникам</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Должность</th>
                <th>План</th>
                <th>Факт</th>
                <th>Выполнение</th>
                <th>Посещаемость</th>
                <th>Зарплата (прогноз)</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.employees.map((emp) => (
                <tr key={emp.employee_id}>
                  <td className="font-medium">{emp.employee_name}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      emp.position === 'supervisor' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {emp.position === 'supervisor' ? 'Супервайзер' : 'Менеджер'}
                    </span>
                  </td>
                  <td>{emp.total_plan.toLocaleString('ru-RU')} ₽</td>
                  <td>{emp.total_fact.toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <span className={`font-semibold ${
                      emp.completion_percent >= 100 
                        ? 'text-green-600' 
                        : emp.completion_percent >= 80 
                        ? 'text-orange-600' 
                        : 'text-red-600'
                    }`}>
                      {emp.completion_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`font-semibold ${
                      emp.attendance_percent >= 90 
                        ? 'text-green-600' 
                        : emp.attendance_percent >= 80 
                        ? 'text-orange-600' 
                        : 'text-red-600'
                    }`}>
                      {emp.attendance_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="font-semibold">{emp.estimated_salary.toLocaleString('ru-RU')} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
