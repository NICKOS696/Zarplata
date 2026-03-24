import React, { useState, useEffect } from 'react';
import { attendanceAPI, employeesAPI, workCalendarAPI, territoriesAPI } from '../services/api';
import { Plus, Calendar, Edit2, Settings, Search } from 'lucide-react';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [workCalendar, setWorkCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    position: '',
    territory_id: '',
  });
  
  const [formData, setFormData] = useState({
    employee_id: '',
    year: selectedYear,
    month: selectedMonth,
    days_worked: 0,
    order_count: 0,
    notes: '',
  });
  
  const [calendarForm, setCalendarForm] = useState({
    year: selectedYear,
    month: selectedMonth,
    working_days: 22,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attRes, empsRes, terrRes] = await Promise.all([
        attendanceAPI.getAll({ year: selectedYear, month: selectedMonth }),
        employeesAPI.getAll({ is_active: true }),
        territoriesAPI.getAll(),
      ]);
      setAttendance(attRes.data);
      setEmployees(empsRes.data);
      setTerritories(terrRes.data);
      
      // Загружаем производственный календарь
      try {
        const calRes = await workCalendarAPI.getByYearMonth(selectedYear, selectedMonth);
        setWorkCalendar(calRes.data);
        setCalendarForm({
          year: selectedYear,
          month: selectedMonth,
          working_days: calRes.data.working_days,
          notes: calRes.data.notes || '',
        });
      } catch (error) {
        // Если календарь не найден, устанавливаем значения по умолчанию
        setWorkCalendar(null);
        setCalendarForm({
          year: selectedYear,
          month: selectedMonth,
          working_days: 22,
          notes: '',
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAttendance) {
        await attendanceAPI.update(editingAttendance.id, {
          days_worked: formData.days_worked,
          order_count: formData.order_count,
          notes: formData.notes,
        });
      } else {
        await attendanceAPI.create(formData);
      }
      setShowModal(false);
      setEditingAttendance(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert(error.response?.data?.detail || 'Ошибка сохранения записи табеля');
    }
  };

  const handleEdit = (record) => {
    setEditingAttendance(record);
    setFormData({
      employee_id: record.employee_id,
      year: record.year,
      month: record.month,
      days_worked: record.days_worked,
      order_count: record.order_count || 0,
      notes: record.notes || '',
    });
    setShowModal(true);
  };

  const handleCalendarSubmit = async (e) => {
    e.preventDefault();
    try {
      if (workCalendar) {
        await workCalendarAPI.update(selectedYear, selectedMonth, {
          working_days: calendarForm.working_days,
          notes: calendarForm.notes,
        });
      } else {
        await workCalendarAPI.create(calendarForm);
      }
      setShowCalendarModal(false);
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения календаря:', error);
      alert(error.response?.data?.detail || 'Ошибка сохранения производственного календаря');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      year: selectedYear,
      month: selectedMonth,
      days_worked: 0,
      order_count: 0,
      notes: '',
    });
  };

  const getMonthName = (month) => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month - 1];
  };

  const getEmployeeInfo = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { name: '-', position: '-', territory: '-' };
    
    const territory = territories.find(t => t.id === employee.territory_id);
    const positionName = employee.position === 'manager' ? 'Менеджер' :
                        employee.position === 'supervisor' ? 'Супервайзер' : 'Торговый агент';
    
    return {
      name: employee.full_name,
      position: positionName,
      territory: territory?.name || '-',
    };
  };

  // Фильтрация табеля
  const filteredAttendance = attendance.filter(att => {
    const employee = employees.find(e => e.id === att.employee_id);
    if (!employee) return false;
    
    // Поиск по сотруднику
    if (filters.search && !employee.full_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Фильтр по должности
    if (filters.position && employee.position !== filters.position) {
      return false;
    }
    // Фильтр по территории
    if (filters.territory_id && employee.territory_id !== parseInt(filters.territory_id)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Табель посещаемости</h1>
          <p className="text-gray-600 mt-1">Учет отработанных дней по месяцам</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCalendarModal(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Settings size={20} />
            <span>Производственный календарь</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingAttendance(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Добавить запись</span>
          </button>
        </div>
      </div>

      {/* Фильтры и период */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

          {/* Фильтр по территории (структуре) */}
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

          {/* Период - месяц */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="input"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>{getMonthName(month)}</option>
            ))}
          </select>

          {/* Период - год */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input"
          >
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {workCalendar && (
          <div className="mt-3 text-sm text-gray-600 text-right">
            Рабочих дней в месяце: <span className="font-semibold">{workCalendar.working_days}</span>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Должность</th>
                  <th>Структура</th>
                  <th>Отработано дней</th>
                  <th>Заявки</th>
                  <th>% посещаемости</th>
                  <th>Примечание</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((record) => {
                  const info = getEmployeeInfo(record.employee_id);
                  const attendancePercent = workCalendar 
                    ? ((record.days_worked / workCalendar.working_days) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <tr key={record.id}>
                      <td className="font-medium">{info.name}</td>
                      <td>{info.position}</td>
                      <td className="text-gray-600">{info.territory}</td>
                      <td className="text-center">
                        <span className="font-semibold">{record.days_worked}</span>
                        {workCalendar && <span className="text-gray-500"> / {workCalendar.working_days}</span>}
                      </td>
                      <td className="text-center">
                        <span className="font-semibold text-purple-600">{record.order_count || 0}</span>
                      </td>
                      <td className="text-center">
                        <span className={`font-semibold ${
                          attendancePercent >= 95 ? 'text-green-600' :
                          attendancePercent >= 80 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {attendancePercent}%
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{record.notes || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Редактировать"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingAttendance ? 'Редактировать запись' : 'Новая запись табеля'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Месяц</label>
                <input
                  type="text"
                  value={`${getMonthName(formData.month)} ${formData.year}`}
                  className="input bg-gray-100"
                  disabled
                />
              </div>

              <div>
                <label className="label">Сотрудник</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="input"
                  required
                  disabled={editingAttendance}
                >
                  <option value="">Выберите сотрудника</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Количество отработанных дней</label>
                <input
                  type="number"
                  value={formData.days_worked}
                  onChange={(e) => setFormData({ ...formData, days_worked: parseFloat(e.target.value) || 0 })}
                  className="input"
                  required
                  min="0"
                  max={workCalendar?.working_days || 31}
                  step="0.5"
                />
                {workCalendar && (
                  <p className="text-xs text-gray-500 mt-1">
                    Максимум: {workCalendar.working_days} дней
                  </p>
                )}
              </div>

              <div>
                <label className="label">Количество заявок (для грейдовой системы)</label>
                <input
                  type="number"
                  value={formData.order_count}
                  onChange={(e) => setFormData({ ...formData, order_count: parseInt(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Используется для расчёта грейда (Стажер/Профессионал/Эксперт)
                </p>
              </div>

              <div>
                <label className="label">Примечание</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Опционально"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => { 
                    setShowModal(false); 
                    setEditingAttendance(null);
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

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Производственный календарь</h2>
            <form onSubmit={handleCalendarSubmit} className="space-y-4">
              <div>
                <label className="label">Месяц</label>
                <input
                  type="text"
                  value={`${getMonthName(selectedMonth)} ${selectedYear}`}
                  className="input bg-gray-100"
                  disabled
                />
              </div>

              <div>
                <label className="label">Количество рабочих дней</label>
                <input
                  type="number"
                  value={calendarForm.working_days}
                  onChange={(e) => setCalendarForm({ ...calendarForm, working_days: parseInt(e.target.value) || 0 })}
                  className="input"
                  required
                  min="1"
                  max="31"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Укажите количество рабочих дней в этом месяце
                </p>
              </div>

              <div>
                <label className="label">Примечание</label>
                <textarea
                  value={calendarForm.notes}
                  onChange={(e) => setCalendarForm({ ...calendarForm, notes: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Например: праздники, сокращенные дни"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
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

export default Attendance;
