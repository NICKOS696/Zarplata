import React, { useState, useEffect } from 'react';
import { salesPlansAPI, employeesAPI, brandsAPI, kpiTypesAPI } from '../services/api';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function SalesPlans() {
  const [plans, setPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [kpiTypes, setKpiTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [planType, setPlanType] = useState('brand'); // 'brand' или 'kpi'
  const [formData, setFormData] = useState({
    employee_id: '',
    brand_id: '',
    kpi_type_id: '',
    period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    plan_value: 0,
  });
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    brand_id: '',
    kpi_type_id: '',
    month: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, empsRes, brandsRes, kpisRes] = await Promise.all([
        salesPlansAPI.getAll(),
        employeesAPI.getAll({ is_active: true }),
        brandsAPI.getAll({ is_active: true }),
        kpiTypesAPI.getAll({ is_active: true }),
      ]);
      setPlans(plansRes.data);
      setEmployees(empsRes.data);
      setBrands(brandsRes.data);
      setKpiTypes(kpisRes.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Формируем данные в зависимости от типа плана
      const submitData = {
        employee_id: parseInt(formData.employee_id),
        period_start: formData.period_start,
        period_end: formData.period_end,
        plan_value: parseFloat(formData.plan_value),
      };
      
      if (planType === 'brand') {
        submitData.brand_id = parseInt(formData.brand_id);
        submitData.kpi_type_id = null;
      } else {
        submitData.kpi_type_id = parseInt(formData.kpi_type_id);
        submitData.brand_id = null;
      }
      
      if (editingPlan) {
        await salesPlansAPI.update(editingPlan.id, submitData);
      } else {
        await salesPlansAPI.create(submitData);
      }
      setShowModal(false);
      setEditingPlan(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert(error.response?.data?.detail || 'Ошибка сохранения плана');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setPlanType(plan.brand_id ? 'brand' : 'kpi');
    setFormData({
      employee_id: plan.employee_id,
      brand_id: plan.brand_id || '',
      kpi_type_id: plan.kpi_type_id || '',
      period_start: plan.period_start,
      period_end: plan.period_end,
      plan_value: plan.plan_value,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот план?')) {
      try {
        await salesPlansAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка удаления плана');
      }
    }
  };

  const resetForm = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setPlanType('brand');
    setFormData({
      employee_id: '',
      brand_id: '',
      kpi_type_id: '',
      period_start: format(startOfMonth(now), 'yyyy-MM-dd'),
      period_end: format(endOfMonth(now), 'yyyy-MM-dd'),
      plan_value: 0,
    });
    setEditingPlan(null);
  };

  const getMonthName = (month) => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month - 1];
  };

  // Обновляем период при изменении месяца/года
  useEffect(() => {
    const start = new Date(selectedYear, selectedMonth - 1, 1);
    const end = endOfMonth(start);
    setFormData(prev => ({
      ...prev,
      period_start: format(start, 'yyyy-MM-dd'),
      period_end: format(end, 'yyyy-MM-dd'),
    }));
  }, [selectedYear, selectedMonth]);

  // Фильтрация планов
  const filteredPlans = plans.filter(plan => {
    // Поиск по сотруднику
    if (filters.search) {
      const employee = employees.find(e => e.id === plan.employee_id);
      if (!employee || !employee.full_name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
    }
    // Фильтр по бренду
    if (filters.brand_id && plan.brand_id !== parseInt(filters.brand_id)) {
      return false;
    }
    // Фильтр по KPI
    if (filters.kpi_type_id && plan.kpi_type_id !== parseInt(filters.kpi_type_id)) {
      return false;
    }
    // Фильтр по месяцу
    if (filters.month) {
      const planDate = new Date(plan.period_start);
      const filterMonth = `${planDate.getFullYear()}-${String(planDate.getMonth() + 1).padStart(2, '0')}`;
      if (filterMonth !== filters.month) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Планы продаж</h1>
          <p className="text-gray-600 mt-1">Установка планов для сотрудников</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Добавить план</span>
        </button>
      </div>

      {/* Фильтры */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Поиск по сотруднику */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по сотруднику..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="input pl-10 w-full"
            />
          </div>

          {/* Фильтр по бренду */}
          <select
            value={filters.brand_id}
            onChange={(e) => setFilters({...filters, brand_id: e.target.value})}
            className="input"
          >
            <option value="">Все бренды</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          {/* Фильтр по KPI */}
          <select
            value={filters.kpi_type_id}
            onChange={(e) => setFilters({...filters, kpi_type_id: e.target.value})}
            className="input"
          >
            <option value="">Все KPI</option>
            {kpiTypes.map(kpi => (
              <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
            ))}
          </select>

          {/* Фильтр по месяцу */}
          <div className="flex gap-2">
            <select
              value={filters.month ? filters.month.split('-')[1] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const year = filters.month ? filters.month.split('-')[0] : new Date().getFullYear();
                  setFilters({...filters, month: `${year}-${e.target.value}`});
                } else {
                  setFilters({...filters, month: ''});
                }
              }}
              className="input flex-1"
            >
              <option value="">Все месяцы</option>
              <option value="01">Январь</option>
              <option value="02">Февраль</option>
              <option value="03">Март</option>
              <option value="04">Апрель</option>
              <option value="05">Май</option>
              <option value="06">Июнь</option>
              <option value="07">Июль</option>
              <option value="08">Август</option>
              <option value="09">Сентябрь</option>
              <option value="10">Октябрь</option>
              <option value="11">Ноябрь</option>
              <option value="12">Декабрь</option>
            </select>
            {filters.month && (
              <select
                value={filters.month.split('-')[0]}
                onChange={(e) => {
                  const month = filters.month.split('-')[1];
                  setFilters({...filters, month: `${e.target.value}-${month}`});
                }}
                className="input w-24"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Бренд</th>
                  <th>KPI</th>
                  <th>Период</th>
                  <th>План</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{employees.find(e => e.id === plan.employee_id)?.full_name || '-'}</td>
                    <td>{brands.find(b => b.id === plan.brand_id)?.name || '—'}</td>
                    <td>{kpiTypes.find(k => k.id === plan.kpi_type_id)?.name || '—'}</td>
                    <td className="text-sm text-gray-600">
                      {new Date(plan.period_start).toLocaleDateString('ru-RU')} - {new Date(plan.period_end).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="font-semibold">{plan.plan_value.toLocaleString('ru-RU')}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Редактировать план' : 'Новый план продаж'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Сотрудник</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Выберите сотрудника</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Период:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="input text-sm w-40"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{getMonthName(month)}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="input text-sm w-24"
                >
                  {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Тип плана</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="brand"
                      checked={planType === 'brand'}
                      onChange={(e) => setPlanType(e.target.value)}
                      className="mr-2"
                    />
                    <span>По бренду</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="kpi"
                      checked={planType === 'kpi'}
                      onChange={(e) => setPlanType(e.target.value)}
                      className="mr-2"
                    />
                    <span>По KPI</span>
                  </label>
                </div>
              </div>

              {planType === 'brand' ? (
                <div>
                  <label className="label">Бренд</label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Выберите бренд</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">KPI</label>
                  <select
                    value={formData.kpi_type_id}
                    onChange={(e) => setFormData({ ...formData, kpi_type_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Выберите KPI</option>
                    {kpiTypes.map((kpi) => (
                      <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Значение плана</label>
                <input
                  type="number"
                  value={formData.plan_value}
                  onChange={(e) => setFormData({ ...formData, plan_value: parseFloat(e.target.value) || 0 })}
                  className="input"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesPlans;
