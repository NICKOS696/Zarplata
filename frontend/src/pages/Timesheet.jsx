import React, { useState, useEffect } from 'react';
import { employeesAPI, territoriesAPI, absencesAPI, bonusesAPI } from '../services/api';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Users } from 'lucide-react';
import { CURRENCY } from '../config';

function Timesheet() {
  // Функция форматирования даты из YYYY-MM-DD в DD.MM.YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };
  const [activeTab, setActiveTab] = useState('employees'); // employees, absences, bonuses
  const [employees, setEmployees] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkUpdatingEmployees, setBulkUpdatingEmployees] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [bulkHireDate, setBulkHireDate] = useState('');
  const [bulkTerminationDate, setBulkTerminationDate] = useState('');
  
  // Модальные окна
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [editingBonus, setEditingBonus] = useState(null);
  
  // Формы
  const [absenceForm, setAbsenceForm] = useState({
    employee_id: '',
    absence_date: '',
    reason: '',
  });
  
  const [bonusForm, setBonusForm] = useState({
    employee_id: '',
    bonus_date: '',
    amount: 0,
    note: '',
  });
  
  // Фильтры для вкладки "Все сотрудники"
  const [employeeFilters, setEmployeeFilters] = useState({
    search: '',
    position: '',
    territory_id: '',
    status: '', // working, terminated
  });
  
  // Фильтры для пропусков
  const today = new Date();
  const [absenceFilters, setAbsenceFilters] = useState({
    search: '',
    position: '',
    territory_id: '',
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  
  // Фильтры для бонусов
  const [bonusFilters, setBonusFilters] = useState({
    search: '',
    position: '',
    territory_id: '',
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });

  useEffect(() => {
    loadData();
  }, [absenceFilters.year, absenceFilters.month, bonusFilters.year, bonusFilters.month]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Формируем даты для фильтрации пропусков
      const absenceStartDate = `${absenceFilters.year}-${String(absenceFilters.month).padStart(2, '0')}-01`;
      const absenceEndDate = new Date(absenceFilters.year, absenceFilters.month, 0);
      const absenceEndDateStr = `${absenceFilters.year}-${String(absenceFilters.month).padStart(2, '0')}-${absenceEndDate.getDate()}`;
      
      // Формируем даты для фильтрации бонусов
      const bonusStartDate = `${bonusFilters.year}-${String(bonusFilters.month).padStart(2, '0')}-01`;
      const bonusEndDate = new Date(bonusFilters.year, bonusFilters.month, 0);
      const bonusEndDateStr = `${bonusFilters.year}-${String(bonusFilters.month).padStart(2, '0')}-${bonusEndDate.getDate()}`;
      
      const [empsRes, terrsRes, absRes, bonRes] = await Promise.all([
        employeesAPI.getAll(),
        territoriesAPI.getAll(),
        absencesAPI.getAll({ date_from: absenceStartDate, date_to: absenceEndDateStr }),
        bonusesAPI.getAll({ date_from: bonusStartDate, date_to: bonusEndDateStr }),
      ]);
      setEmployees(empsRes.data);
      setTerritories(terrsRes.data);
      setAbsences(absRes.data);
      setBonuses(bonRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ПРОПУСКИ ====================
  
  const handleAbsenceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAbsence) {
        await absencesAPI.update(editingAbsence.id, absenceForm);
      } else {
        await absencesAPI.create(absenceForm);
      }
      setShowAbsenceModal(false);
      setEditingAbsence(null);
      resetAbsenceForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения пропуска:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditAbsence = (absence) => {
    setEditingAbsence(absence);
    setAbsenceForm({
      employee_id: absence.employee_id,
      absence_date: absence.absence_date,
      reason: absence.reason || '',
    });
    setShowAbsenceModal(true);
  };

  const handleDeleteAbsence = async (id) => {
    if (window.confirm('Удалить запись о пропуске?')) {
      try {
        await absencesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const resetAbsenceForm = () => {
    setAbsenceForm({
      employee_id: '',
      absence_date: '',
      reason: '',
    });
  };

  // ==================== БОНУСЫ ====================
  
  const handleBonusSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBonus) {
        await bonusesAPI.update(editingBonus.id, bonusForm);
      } else {
        await bonusesAPI.create(bonusForm);
      }
      setShowBonusModal(false);
      setEditingBonus(null);
      resetBonusForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения бонуса:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditBonus = (bonus) => {
    setEditingBonus(bonus);
    setBonusForm({
      employee_id: bonus.employee_id,
      bonus_date: bonus.bonus_date,
      amount: bonus.amount,
      note: bonus.note || '',
    });
    setShowBonusModal(true);
  };

  const handleDeleteBonus = async (id) => {
    if (window.confirm('Удалить запись о бонусе?')) {
      try {
        await bonusesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const resetBonusForm = () => {
    setBonusForm({
      employee_id: '',
      bonus_date: '',
      amount: 0,
      note: '',
    });
  };

  // ==================== ФИЛЬТРАЦИЯ ====================
  
  const getEmployeeById = (id) => employees.find(emp => emp.id === id);
  const getTerritoryById = (id) => territories.find(t => t.id === id);
  
  const getEmployeeStatus = (employee) => {
    if (employee.termination_date) {
      return 'Не работает';
    }
    return 'Работает';
  };
  
  const filteredEmployees = employees.filter(emp => {
    if (employeeFilters.search && !emp.full_name.toLowerCase().includes(employeeFilters.search.toLowerCase())) {
      return false;
    }
    if (employeeFilters.position && emp.position !== employeeFilters.position) {
      return false;
    }
    if (employeeFilters.territory_id && emp.territory_id !== parseInt(employeeFilters.territory_id)) {
      return false;
    }
    if (employeeFilters.status === 'working' && emp.termination_date) {
      return false;
    }
    if (employeeFilters.status === 'terminated' && !emp.termination_date) {
      return false;
    }
    return true;
  });

  const allVisibleSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployeeIds.includes(e.id));

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) return prev.filter(id => id !== employeeId);
      return [...prev, employeeId];
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedEmployeeIds(prev => {
      const visibleIds = filteredEmployees.map(e => e.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !visibleIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  };

  const handleBulkSetDates = async () => {
    if (selectedEmployeeIds.length === 0) {
      alert('Выберите сотрудников');
      return;
    }

    if (!bulkHireDate && !bulkTerminationDate) {
      alert('Укажите дату приема и/или дату увольнения');
      return;
    }

    if (!window.confirm(`Применить даты к выбранным сотрудникам: ${selectedEmployeeIds.length}?`)) {
      return;
    }

    try {
      setBulkUpdatingEmployees(true);

      const payload = {
        ...(bulkHireDate ? { hire_date: bulkHireDate } : {}),
        ...(bulkTerminationDate ? { termination_date: bulkTerminationDate } : {}),
      };

      let updated = 0;
      const errors = [];

      for (const employeeId of selectedEmployeeIds) {
        try {
          await employeesAPI.update(employeeId, payload);
          updated += 1;
        } catch (e) {
          const emp = employees.find(x => x.id === employeeId);
          errors.push(`${emp?.full_name || employeeId}: ${e.response?.data?.detail || e.message}`);
        }
      }

      await loadData();

      let msg = `Готово!\nОбновлено: ${updated}`;
      if (errors.length > 0) {
        msg += `\nОшибки (${errors.length}):\n${errors.join('\n')}`;
      }
      alert(msg);
    } finally {
      setBulkUpdatingEmployees(false);
    }
  };
  
  const filteredAbsences = absences.filter(absence => {
    const employee = getEmployeeById(absence.employee_id);
    if (!employee) return false;
    
    if (absenceFilters.search && !employee.full_name.toLowerCase().includes(absenceFilters.search.toLowerCase())) {
      return false;
    }
    if (absenceFilters.position && employee.position !== absenceFilters.position) {
      return false;
    }
    if (absenceFilters.territory_id && employee.territory_id !== parseInt(absenceFilters.territory_id)) {
      return false;
    }
    return true;
  });
  
  const filteredBonuses = bonuses.filter(bonus => {
    const employee = getEmployeeById(bonus.employee_id);
    if (!employee) return false;
    
    if (bonusFilters.search && !employee.full_name.toLowerCase().includes(bonusFilters.search.toLowerCase())) {
      return false;
    }
    if (bonusFilters.position && employee.position !== bonusFilters.position) {
      return false;
    }
    if (bonusFilters.territory_id && employee.territory_id !== parseInt(bonusFilters.territory_id)) {
      return false;
    }
    return true;
  });

  const positionNames = {
    agent: 'Торговый агент',
    supervisor: 'Супервайзер',
    manager: 'Менеджер',
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Табель</h1>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 flex items-end justify-between">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline-block mr-2" size={18} />
            Все сотрудники
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'absences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline-block mr-2" size={18} />
            Пропуски
          </button>
          <button
            onClick={() => setActiveTab('bonuses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bonuses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="inline-block mr-2" size={18} />
            Бонусы
          </button>
        </nav>
        
        {/* Массовые действия - справа от вкладок */}
        {activeTab === 'employees' && selectedEmployeeIds.length > 0 && (
          <div className="flex items-end gap-3 pb-2">
            <div className="text-sm text-gray-700 font-medium whitespace-nowrap">
              Выбрано: {selectedEmployeeIds.length}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Дата приема (массово)</label>
              <input
                type="date"
                value={bulkHireDate}
                onChange={(e) => setBulkHireDate(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Дата увольнения (массово)</label>
              <input
                type="date"
                value={bulkTerminationDate}
                onChange={(e) => setBulkTerminationDate(e.target.value)}
                className="input text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleBulkSetDates}
              disabled={bulkUpdatingEmployees || selectedEmployeeIds.length === 0}
              className="btn btn-primary text-sm"
            >
              {bulkUpdatingEmployees ? '...' : 'Применить к выбранным'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedEmployeeIds([])}
              disabled={bulkUpdatingEmployees || selectedEmployeeIds.length === 0}
              className="btn btn-secondary text-sm"
            >
              Снять выделение
            </button>
          </div>
        )}
      </div>

      {/* Вкладка: Все сотрудники */}
      {activeTab === 'employees' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Все сотрудники</h2>
          
          {/* Фильтры */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Поиск по ФИО..."
              value={employeeFilters.search}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, search: e.target.value })}
              className="input"
            />
            <select
              value={employeeFilters.position}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, position: e.target.value })}
              className="input"
            >
              <option value="">Все должности</option>
              <option value="agent">Торговый агент</option>
              <option value="supervisor">Супервайзер</option>
              <option value="manager">Менеджер</option>
            </select>
            <select
              value={employeeFilters.territory_id}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, territory_id: e.target.value })}
              className="input"
            >
              <option value="">Все структуры</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={employeeFilters.status}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, status: e.target.value })}
              className="input"
            >
              <option value="">Все статусы</option>
              <option value="working">Работает</option>
              <option value="terminated">Не работает</option>
            </select>
          </div>

          {/* Таблица сотрудников */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="mr-2"
                      title="Выбрать всех (по текущему фильтру)"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сотрудник</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Структура</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата приема</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата увольнения</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onChange={() => toggleEmployeeSelection(emp.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{emp.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emp.position === 'manager' 
                          ? 'bg-green-100 text-green-800' 
                          : emp.position === 'supervisor'
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {positionNames[emp.position]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.territory_id ? getTerritoryById(emp.territory_id)?.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(emp.hire_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(emp.termination_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        emp.termination_date ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {getEmployeeStatus(emp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Вкладка: Пропуски */}
      {activeTab === 'absences' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Пропуски</h2>
            <button
              onClick={() => {
                setEditingAbsence(null);
                resetAbsenceForm();
                setShowAbsenceModal(true);
              }}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Добавить пропуск</span>
            </button>
          </div>
          
          {/* Фильтры */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <input
              type="text"
              placeholder="Поиск по ФИО..."
              value={absenceFilters.search}
              onChange={(e) => setAbsenceFilters({ ...absenceFilters, search: e.target.value })}
              className="input"
            />
            <select
              value={absenceFilters.position}
              onChange={(e) => setAbsenceFilters({ ...absenceFilters, position: e.target.value })}
              className="input"
            >
              <option value="">Все должности</option>
              <option value="agent">Торговый агент</option>
              <option value="supervisor">Супервайзер</option>
              <option value="manager">Менеджер</option>
            </select>
            <select
              value={absenceFilters.territory_id}
              onChange={(e) => setAbsenceFilters({ ...absenceFilters, territory_id: e.target.value })}
              className="input"
            >
              <option value="">Все структуры</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={absenceFilters.year}
              onChange={(e) => setAbsenceFilters({ ...absenceFilters, year: parseInt(e.target.value) })}
              className="input"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={absenceFilters.month}
              onChange={(e) => setAbsenceFilters({ ...absenceFilters, month: parseInt(e.target.value) })}
              className="input"
            >
              <option value={1}>Январь</option>
              <option value={2}>Февраль</option>
              <option value={3}>Март</option>
              <option value={4}>Апрель</option>
              <option value={5}>Май</option>
              <option value={6}>Июнь</option>
              <option value={7}>Июль</option>
              <option value={8}>Август</option>
              <option value={9}>Сентябрь</option>
              <option value={10}>Октябрь</option>
              <option value={11}>Ноябрь</option>
              <option value={12}>Декабрь</option>
            </select>
          </div>

          {/* Таблица пропусков */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сотрудник</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Структура</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата пропуска</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Причина</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAbsences.map((absence) => {
                  const employee = getEmployeeById(absence.employee_id);
                  if (!employee) return null;
                  
                  return (
                    <tr key={absence.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{employee.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.position === 'manager' 
                            ? 'bg-green-100 text-green-800' 
                            : employee.position === 'supervisor'
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {positionNames[employee.position]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.territory_id ? getTerritoryById(employee.territory_id)?.name : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(absence.absence_date)}</td>
                      <td className="px-6 py-4">{absence.reason || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditAbsence(absence)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteAbsence(absence.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Вкладка: Бонусы */}
      {activeTab === 'bonuses' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Бонусы</h2>
            <button
              onClick={() => {
                setEditingBonus(null);
                resetBonusForm();
                setShowBonusModal(true);
              }}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Добавить бонус</span>
            </button>
          </div>
          
          {/* Фильтры */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <input
              type="text"
              placeholder="Поиск по ФИО..."
              value={bonusFilters.search}
              onChange={(e) => setBonusFilters({ ...bonusFilters, search: e.target.value })}
              className="input"
            />
            <select
              value={bonusFilters.position}
              onChange={(e) => setBonusFilters({ ...bonusFilters, position: e.target.value })}
              className="input"
            >
              <option value="">Все должности</option>
              <option value="agent">Торговый агент</option>
              <option value="supervisor">Супервайзер</option>
              <option value="manager">Менеджер</option>
            </select>
            <select
              value={bonusFilters.territory_id}
              onChange={(e) => setBonusFilters({ ...bonusFilters, territory_id: e.target.value })}
              className="input"
            >
              <option value="">Все структуры</option>
              {territories.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={bonusFilters.year}
              onChange={(e) => setBonusFilters({ ...bonusFilters, year: parseInt(e.target.value) })}
              className="input"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={bonusFilters.month}
              onChange={(e) => setBonusFilters({ ...bonusFilters, month: parseInt(e.target.value) })}
              className="input"
            >
              <option value={1}>Январь</option>
              <option value={2}>Февраль</option>
              <option value={3}>Март</option>
              <option value={4}>Апрель</option>
              <option value={5}>Май</option>
              <option value={6}>Июнь</option>
              <option value={7}>Июль</option>
              <option value={8}>Август</option>
              <option value={9}>Сентябрь</option>
              <option value={10}>Октябрь</option>
              <option value={11}>Ноябрь</option>
              <option value={12}>Декабрь</option>
            </select>
          </div>

          {/* Таблица бонусов */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сотрудник</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Структура</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата бонуса</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Примечание</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBonuses.map((bonus) => {
                  const employee = getEmployeeById(bonus.employee_id);
                  if (!employee) return null;
                  
                  return (
                    <tr key={bonus.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{employee.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.position === 'manager' 
                            ? 'bg-green-100 text-green-800' 
                            : employee.position === 'supervisor'
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {positionNames[employee.position]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.territory_id ? getTerritoryById(employee.territory_id)?.name : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(bonus.bonus_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">
                        {bonus.amount.toLocaleString('ru-RU')} {CURRENCY}
                      </td>
                      <td className="px-6 py-4">{bonus.note || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditBonus(bonus)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteBonus(bonus.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модальное окно: Пропуск */}
      {showAbsenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingAbsence ? 'Редактировать пропуск' : 'Новый пропуск'}
            </h2>
            <form onSubmit={handleAbsenceSubmit} className="space-y-4">
              <div>
                <label className="label">Сотрудник</label>
                <select
                  value={absenceForm.employee_id}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, employee_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Дата пропуска</label>
                <input
                  type="date"
                  value={absenceForm.absence_date}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, absence_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Причина</label>
                <textarea
                  value={absenceForm.reason}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Болезнь, отпуск и т.д."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAbsenceModal(false);
                    setEditingAbsence(null);
                    resetAbsenceForm();
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

      {/* Модальное окно: Бонус */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingBonus ? 'Редактировать бонус' : 'Новый бонус'}
            </h2>
            <form onSubmit={handleBonusSubmit} className="space-y-4">
              <div>
                <label className="label">Сотрудник</label>
                <select
                  value={bonusForm.employee_id}
                  onChange={(e) => setBonusForm({ ...bonusForm, employee_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">Выберите сотрудника</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Дата бонуса</label>
                <input
                  type="date"
                  value={bonusForm.bonus_date}
                  onChange={(e) => setBonusForm({ ...bonusForm, bonus_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Сумма ({CURRENCY})</label>
                <input
                  type="number"
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm({ ...bonusForm, amount: parseFloat(e.target.value) || 0 })}
                  className="input"
                  required
                  step="1000"
                  min="0"
                />
              </div>

              <div>
                <label className="label">Примечание</label>
                <textarea
                  value={bonusForm.note}
                  onChange={(e) => setBonusForm({ ...bonusForm, note: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="За что выдан бонус"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBonusModal(false);
                    setEditingBonus(null);
                    resetBonusForm();
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
    </div>
  );
}

export default Timesheet;
