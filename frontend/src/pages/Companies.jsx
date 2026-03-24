import React, { useState, useEffect } from 'react';
import { companiesAPI } from '../services/api';
import { Plus, Edit2, Trash2, Building2, Check, X } from 'lucide-react';

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    telegram_bot_token: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await companiesAPI.getAll();
      setCompanies(response.data);
    } catch (error) {
      console.error('Ошибка загрузки компаний:', error);
      alert('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, formData);
      } else {
        await companiesAPI.create(formData);
      }
      setShowModal(false);
      setEditingCompany(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      telegram_bot_token: company.telegram_bot_token || '',
      is_active: company.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить компанию? Все связанные данные могут быть потеряны!')) {
      try {
        await companiesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка удаления: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      telegram_bot_token: '',
      is_active: true,
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <Building2 className="mr-3" size={32} />
          Управление компаниями
        </h1>
        <button
          onClick={() => {
            setEditingCompany(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Добавить компанию</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <div
            key={company.id}
            className={`card p-6 ${!company.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <Building2 size={24} className="text-primary-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold">{company.name}</h3>
                  <p className="text-sm text-gray-500">ID: {company.id}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                company.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {company.is_active ? 'Активна' : 'Неактивна'}
              </span>
            </div>
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => handleEdit(company)}
                className="flex-1 btn btn-secondary flex items-center justify-center space-x-1"
              >
                <Edit2 size={16} />
                <span>Изменить</span>
              </button>
              <button
                onClick={() => handleDelete(company.id)}
                className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center space-x-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>Нет компаний. Создайте первую компанию.</p>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Building2 className="mr-2" size={24} />
              {editingCompany ? 'Редактировать компанию' : 'Новая компания'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Название компании</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Например: ООО Компания"
                  required
                />
              </div>

              <div>
                <label className="label">Токен Telegram бота</label>
                <input
                  type="text"
                  value={formData.telegram_bot_token}
                  onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                  className="input"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Токен бота для отправки отчётов сотрудникам этой компании
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
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Активна
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingCompany ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCompany(null);
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

export default Companies;
