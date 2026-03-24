import React, { useState, useEffect } from 'react';
import { workCalendarAPI } from '../services/api';
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react';

function WorkCalendar() {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    working_days: 22,
    notes: '',
  });

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const response = await workCalendarAPI.getAll();
      setCalendars(response.data);
    } catch (error) {
      console.error('Ошибка загрузки календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCalendar) {
        await workCalendarAPI.update(editingCalendar.id, formData);
      } else {
        await workCalendarAPI.create(formData);
      }
      setShowModal(false);
      setEditingCalendar(null);
      resetForm();
      loadCalendars();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (calendar) => {
    setEditingCalendar(calendar);
    setFormData({
      year: calendar.year,
      month: calendar.month,
      working_days: calendar.working_days,
      notes: calendar.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить запись календаря?')) {
      try {
        await workCalendarAPI.delete(id);
        loadCalendars();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      working_days: 22,
      notes: '',
    });
  };

  // Группируем по годам
  const calendarsByYear = calendars.reduce((acc, cal) => {
    if (!acc[cal.year]) {
      acc[cal.year] = [];
    }
    acc[cal.year].push(cal);
    return acc;
  }, {});

  // Сортируем годы по убыванию
  const sortedYears = Object.keys(calendarsByYear).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-3" size={32} />
            Производственный календарь
          </h1>
          <p className="text-gray-600 mt-1">Количество рабочих дней по месяцам</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCalendar(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Добавить месяц</span>
        </button>
      </div>

      {/* Календарь по годам */}
      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {sortedYears.map(year => (
            <div key={year} className="card">
              <h2 className="text-2xl font-bold mb-4">{year} год</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const calendar = calendarsByYear[year]?.find(c => c.month === month);
                  return (
                    <div
                      key={month}
                      className={`border rounded-lg p-4 ${
                        calendar ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{monthNames[month - 1]}</h3>
                        {calendar && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(calendar)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Редактировать"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(calendar.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      {calendar ? (
                        <div>
                          <div className="text-3xl font-bold text-primary-600">
                            {calendar.working_days}
                          </div>
                          <div className="text-sm text-gray-500">рабочих дней</div>
                          {calendar.notes && (
                            <div className="mt-2 text-xs text-gray-600 italic">
                              {calendar.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setFormData({
                              year: parseInt(year),
                              month: month,
                              working_days: 22,
                              notes: '',
                            });
                            setEditingCalendar(null);
                            setShowModal(true);
                          }}
                          className="text-sm text-gray-500 hover:text-primary-600"
                        >
                          + Добавить
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {sortedYears.length === 0 && (
            <div className="card text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Календарь пуст. Добавьте первый месяц.</p>
              <button
                onClick={() => {
                  resetForm();
                  setEditingCalendar(null);
                  setShowModal(true);
                }}
                className="btn btn-primary"
              >
                Добавить месяц
              </button>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCalendar ? 'Редактировать месяц' : 'Добавить месяц'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Год</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="input"
                  required
                  min="2020"
                  max="2100"
                />
              </div>

              <div>
                <label className="label">Месяц</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  {monthNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Количество рабочих дней</label>
                <input
                  type="number"
                  value={formData.working_days}
                  onChange={(e) => setFormData({ ...formData, working_days: parseInt(e.target.value) })}
                  className="input"
                  required
                  min="1"
                  max="31"
                />
              </div>

              <div>
                <label className="label">Примечание (необязательно)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Например: праздники, сокращенные дни..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingCalendar ? 'Сохранить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCalendar(null);
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
    </div>
  );
}

export default WorkCalendar;
