import React, { useState, useEffect } from 'react';
import { employeesAPI, salaryRulesAPI, territoriesAPI, companiesAPI } from '../services/api';
import { Plus, Edit2, Trash2, UserCheck, UserX, Search, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY } from '../config';

function Employees() {
  const { user, currentCompanyId } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [salaryRules, setSalaryRules] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignRuleId, setBulkAssignRuleId] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    name_1c: '',
    position: 'agent',
    telegram_id: '',
    supervisor_id: '',
    manager_id: '',
    territory_id: '',
    salary_rule_id: '',
    company_id: '',
    is_active: true,
    hire_date: '',
    termination_date: '',
    probation_days: 0,
  });
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    position: '',
    supervisor_id: '',
    manager_id: '',
    territory_id: '',
    is_active: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [empsRes, rulesRes, territoriesRes, companiesRes] = await Promise.all([
        employeesAPI.getAll(),
        salaryRulesAPI.getAll(),
        territoriesAPI.getAll(),
        companiesAPI.getAll()
      ]);
      setEmployees(empsRes.data);
      setSalaryRules(rulesRes.data);
      setTerritories(territoriesRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки сотрудников:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Очищаем пустые строки для ID полей и дат
      const cleanedData = {
        ...formData,
        telegram_id: formData.telegram_id || null,  // Пустая строка -> null
        supervisor_id: formData.supervisor_id || null,
        manager_id: formData.manager_id || null,
        territory_id: formData.territory_id || null,
        salary_rule_id: formData.salary_rule_id || null,
        company_id: formData.company_id ? parseInt(formData.company_id) : (currentCompanyId || 1),
        hire_date: formData.hire_date || null,
        termination_date: formData.termination_date || null,
        probation_days: formData.probation_days || 0,
      };
      
      if (editingEmployee) {
        await employeesAPI.update(editingEmployee.id, cleanedData);
      } else {
        await employeesAPI.create(cleanedData);
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      console.error('Детали ошибки:', error.response?.data);
      alert('Ошибка сохранения сотрудника: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      name_1c: employee.name_1c || '',
      position: employee.position,
      telegram_id: employee.telegram_id || '',
      supervisor_id: employee.supervisor_id || '',
      manager_id: employee.manager_id || '',
      territory_id: employee.territory_id || '',
      salary_rule_id: employee.salary_rule_id || '',
      company_id: employee.company_id || '',
      is_active: employee.is_active,
      hire_date: employee.hire_date || '',
      termination_date: employee.termination_date || '',
      probation_days: employee.probation_days || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите деактивировать сотрудника?')) {
      try {
        await employeesAPI.delete(id);
        loadEmployees();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) {
      alert('Выберите сотрудников для удаления');
      return;
    }
    
    if (window.confirm(`Вы уверены, что хотите удалить ${selectedEmployees.length} сотрудников? Это действие нельзя отменить!`)) {
      try {
        const response = await employeesAPI.bulkDelete(selectedEmployees);
        alert(response.data.message);
        setSelectedEmployees([]);
        loadEmployees();
      } catch (error) {
        console.error('Ошибка массового удаления:', error);
        alert('Ошибка удаления сотрудников: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleBulkAssignSalaryRule = async () => {
    if (!bulkAssignRuleId) {
      alert('Выберите правило зарплаты');
      return;
    }
    
    try {
      const response = await employeesAPI.bulkAssignSalaryRule(selectedEmployees, parseInt(bulkAssignRuleId));
      alert(response.data.message);
      setSelectedEmployees([]);
      setBulkAssignRuleId('');
      setShowBulkAssignModal(false);
      loadEmployees();
    } catch (error) {
      console.error('Ошибка массового назначения правил:', error);
      alert('Ошибка назначения правил: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleSelectEmployee = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(empId => empId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      name_1c: '',
      position: 'agent',
      telegram_id: '',
      supervisor_id: '',
      manager_id: '',
      territory_id: '',
      salary_rule_id: '',
      company_id: currentCompanyId || '',
      is_active: true,
      hire_date: '',
      termination_date: '',
      probation_days: 0,
    });
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : '';
  };

  const supervisors = employees.filter(emp => emp.position === 'supervisor');
  const managers = employees.filter(emp => emp.position === 'manager');

  // Фильтрация сотрудников
  const filteredEmployees = employees.filter(emp => {
    // Поиск по ФИО
    if (filters.search && !emp.full_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Фильтр по должности
    if (filters.position && emp.position !== filters.position) {
      return false;
    }
    // Фильтр по супервайзеру
    if (filters.supervisor_id && emp.supervisor_id !== parseInt(filters.supervisor_id)) {
      return false;
    }
    // Фильтр по менеджеру
    if (filters.manager_id && emp.manager_id !== parseInt(filters.manager_id)) {
      return false;
    }
    // Фильтр по территории
    if (filters.territory_id && emp.territory_id !== parseInt(filters.territory_id)) {
      return false;
    }
    // Фильтр по статусу
    if (filters.is_active !== '' && emp.is_active !== (filters.is_active === 'true')) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Сотрудники</h1>
          <p className="text-gray-600 mt-1">Управление торговой командой</p>
        </div>
        <div className="flex space-x-3">
          {selectedEmployees.length > 0 && (
            <>
              <button
                onClick={() => setShowBulkAssignModal(true)}
                className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
              >
                <UserCheck size={20} />
                <span>Назначить правило ({selectedEmployees.length})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
              >
                <Trash2 size={20} />
                <span>Удалить выбранных ({selectedEmployees.length})</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              resetForm();
              setEditingEmployee(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Добавить сотрудника</span>
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Поиск по ФИО */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по ФИО..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="input pl-10 w-full"
            />
          </div>

          {/* Фильтр по должности */}
          <select
            value={filters.position}
            onChange={(e) => setFilters({...filters, position: e.target.value})}
            className="input"
          >
            <option value="">Все должности</option>
            <option value="agent">Торговый агент</option>
            <option value="supervisor">Супервайзер</option>
            <option value="manager">Менеджер</option>
          </select>

          {/* Фильтр по супервайзеру */}
          <select
            value={filters.supervisor_id}
            onChange={(e) => setFilters({...filters, supervisor_id: e.target.value})}
            className="input"
          >
            <option value="">Все супервайзеры</option>
            {supervisors.map(sup => (
              <option key={sup.id} value={sup.id}>{sup.full_name}</option>
            ))}
          </select>

          {/* Фильтр по менеджеру */}
          <select
            value={filters.manager_id}
            onChange={(e) => setFilters({...filters, manager_id: e.target.value})}
            className="input"
          >
            <option value="">Все менеджеры</option>
            {managers.map(mgr => (
              <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
            ))}
          </select>

          {/* Фильтр по территории */}
          <select
            value={filters.territory_id}
            onChange={(e) => setFilters({...filters, territory_id: e.target.value})}
            className="input"
          >
            <option value="">Все территории</option>
            {territories.map(ter => (
              <option key={ter.id} value={ter.id}>{ter.name}</option>
            ))}
          </select>

          {/* Фильтр по статусу */}
          <select
            value={filters.is_active}
            onChange={(e) => setFilters({...filters, is_active: e.target.value})}
            className="input"
          >
            <option value="">Все статусы</option>
            <option value="true">Активен</option>
            <option value="false">Неактивен</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th>ФИО</th>
                  <th>Название в 1С</th>
                  <th>Компания</th>
                  <th>Должность</th>
                  <th>Супервайзер</th>
                  <th>Менеджер</th>
                  <th>Территория</th>
                  <th>Правило зарплаты</th>
                  <th>Telegram ID</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className={selectedEmployees.includes(employee.id) ? 'bg-blue-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="font-medium">{employee.full_name}</td>
                    <td className="text-gray-600">{employee.name_1c || '-'}</td>
                    <td className="text-gray-600">
                      {employee.company_id ? (
                        <span className="flex items-center text-sm">
                          <Building2 size={14} className="mr-1 text-gray-400" />
                          {getCompanyName(employee.company_id)}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        employee.position === 'manager' 
                          ? 'bg-green-100 text-green-800' 
                          : employee.position === 'supervisor'
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.position === 'manager' ? 'Менеджер' : employee.position === 'supervisor' ? 'Супервайзер' : 'Торговый агент'}
                      </span>
                    </td>
                    <td>
                      {employee.supervisor_id 
                        ? employees.find(e => e.id === employee.supervisor_id)?.full_name || '-'
                        : '-'}
                    </td>
                    <td>
                      {employee.manager_id
                        ? employees.find(e => e.id === employee.manager_id)?.full_name || '-'
                        : '-'}
                    </td>
                    <td className="text-gray-600">
                      {territories.find(t => t.id === employee.territory_id)?.name || '-'}
                    </td>
                    <td className="text-gray-600">
                      {salaryRules.find(r => r.id === employee.salary_rule_id)?.name || '-'}
                    </td>
                    <td className="text-gray-600">{employee.telegram_id || '-'}</td>
                    <td>
                      {employee.is_active ? (
                        <span className="flex items-center text-green-600">
                          <UserCheck size={16} className="mr-1" />
                          Активен
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <UserX size={16} className="mr-1" />
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ФИО</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Название в 1С</label>
                <input
                  type="text"
                  value={formData.name_1c}
                  onChange={(e) => setFormData({ ...formData, name_1c: e.target.value })}
                  className="input"
                  placeholder="Как сотрудник называется в 1С"
                />
              </div>

              <div>
                <label className="label">Должность</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="input"
                  required
                >
                  <option value="agent">Торговый агент</option>
                  <option value="supervisor">Супервайзер</option>
                  <option value="manager">Менеджер</option>
                </select>
              </div>

              {/* Выбор компании - только для admin и director */}
              {(user?.role === 'admin' || user?.role === 'director') && companies.length > 0 && (
                <div>
                  <label className="label flex items-center">
                    <Building2 size={16} className="mr-1" />
                    Компания
                  </label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Выберите компанию...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.position === 'agent' && (
                <>
                  <div>
                    <label className="label">Супервайзер</label>
                    <select
                      value={formData.supervisor_id}
                      onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Не выбран</option>
                      {supervisors.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Менеджер</label>
                    <select
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Не выбран</option>
                      {managers.map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formData.position === 'supervisor' && (
                <div>
                  <label className="label">Менеджер</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Не выбран</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Telegram ID</label>
                <input
                  type="text"
                  value={formData.telegram_id}
                  onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                  className="input"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="label">Территория/Структура</label>
                <select
                  value={formData.territory_id}
                  onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                  className="input"
                >
                  <option value="">Не выбрано</option>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Выберите к какой территории относится сотрудник
                </p>
              </div>

              <div>
                <label className="label">Правило зарплаты (мотивационная сетка)</label>
                <select
                  value={formData.salary_rule_id}
                  onChange={(e) => setFormData({ ...formData, salary_rule_id: e.target.value })}
                  className="input"
                >
                  <option value="">Не выбрано</option>
                  {salaryRules
                    .filter(rule => rule.position === formData.position && rule.is_active)
                    .map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Выберите правило расчета зарплаты для этого сотрудника
                </p>
              </div>

              <div>
                <label className="label">Дата приема на работу</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Дата увольнения</label>
                <input
                  type="date"
                  value={formData.termination_date}
                  onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Оставьте пустым, если сотрудник работает
                </p>
              </div>

              <div>
                <label className="label">Дни стажировки</label>
                <input
                  type="number"
                  value={formData.probation_days}
                  onChange={(e) => setFormData({ ...formData, probation_days: parseInt(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Количество дней стажировки (считаются как 0.5 дня)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Активен
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно массового назначения правил */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              Назначить правило зарплаты
            </h2>
            <p className="text-gray-600 mb-4">
              Выбрано сотрудников: <strong>{selectedEmployees.length}</strong>
            </p>
            
            <div className="mb-4">
              <label className="label">Правило зарплаты</label>
              <select
                value={bulkAssignRuleId}
                onChange={(e) => setBulkAssignRuleId(e.target.value)}
                className="input"
                required
              >
                <option value="">Выберите правило</option>
                {salaryRules.filter(rule => rule.is_active).map(rule => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} ({rule.position === 'agent' ? 'Агент' : rule.position === 'supervisor' ? 'Супервайзер' : 'Менеджер'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkAssignSalaryRule}
                className="btn btn-primary flex-1"
                disabled={!bulkAssignRuleId}
              >
                Назначить
              </button>
              <button
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignRuleId('');
                }}
                className="btn btn-secondary flex-1"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
