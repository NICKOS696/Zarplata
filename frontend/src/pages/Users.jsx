import React, { useState, useEffect } from 'react';
import { usersAPI, employeesAPI, companiesAPI } from '../services/api';
import { Plus, Edit2, Trash2, Users as UsersIcon, Shield, Building2 } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'analyst',
    company_id: '',
    employee_id: '',
    is_active: true,
  });

  const roleNames = {
    admin: 'Администратор',
    director: 'Директор',
    analyst: 'Аналитик',
    hr: 'HR',
    supervisor: 'Супервайзер',
    manager: 'Менеджер',
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    director: 'bg-orange-100 text-orange-800',
    analyst: 'bg-cyan-100 text-cyan-800',
    hr: 'bg-blue-100 text-blue-800',
    supervisor: 'bg-purple-100 text-purple-800',
    manager: 'bg-green-100 text-green-800',
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, employeesRes, companiesRes] = await Promise.all([
        usersAPI.getAll(),
        employeesAPI.getAll(),
        companiesAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setEmployees(employeesRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        employee_id: formData.employee_id ? parseInt(formData.employee_id) : null,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
      };
      
      // Только для director company_id должен быть null (он переключается между компаниями)
      if (data.role === 'director') {
        data.company_id = null;
      }

      if (editingUser) {
        // Если пароль не изменился, не отправляем его
        if (!data.password) {
          delete data.password;
        }
        await usersAPI.update(editingUser.id, data);
      } else {
        await usersAPI.create(data);
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Пароль не показываем
      role: user.role,
      company_id: user.company_id || '',
      employee_id: user.employee_id || '',
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const choice = window.confirm('Нажмите OK чтобы ПОЛНОСТЬЮ удалить пользователя, или Отмена чтобы отменить.\n\nДля деактивации используйте редактирование.');
    if (choice) {
      try {
        await usersAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка удаления: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleDeactivate = async (user) => {
    try {
      await usersAPI.update(user.id, { is_active: false });
      loadData();
    } catch (error) {
      console.error('Ошибка деактивации:', error);
      alert('Ошибка деактивации: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'analyst',
      company_id: '',
      employee_id: '',
      is_active: true,
    });
  };

  const getCompanyById = (id) => {
    return companies.find(c => c.id === id);
  };

  const getEmployeeById = (id) => {
    return employees.find(emp => emp.id === id);
  };

  const supervisors = employees.filter(emp => emp.position === 'supervisor');
  const managers = employees.filter(emp => emp.position === 'manager');

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Управление пользователями</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Добавить пользователя</span>
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Логин</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Компания</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Связанный сотрудник</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const employee = user.employee_id ? getEmployeeById(user.employee_id) : null;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                        {roleNames[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.company_id ? (
                        <span className="flex items-center text-sm">
                          <Building2 size={14} className="mr-1 text-gray-400" />
                          {getCompanyById(user.company_id)?.name || `ID: ${user.company_id}`}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Все компании</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee ? employee.full_name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Логин</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">
                  Пароль {editingUser && '(оставьте пустым, чтобы не менять)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="label">Роль</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, employee_id: '', company_id: '' })}
                  className="input"
                  required
                >
                  <option value="admin">Администратор</option>
                  <option value="director">Директор</option>
                  <option value="analyst">Аналитик</option>
                  <option value="hr">HR</option>
                  <option value="supervisor">Супервайзер</option>
                  <option value="manager">Менеджер</option>
                </select>
              </div>

              {/* Выбор компании для всех ролей кроме admin и director */}
              {(formData.role === 'analyst' || formData.role === 'hr' || formData.role === 'supervisor' || formData.role === 'manager') && (
                <div>
                  <label className="label">Компания</label>
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

              {/* Подсказка для admin */}
              {formData.role === 'admin' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Администратор имеет доступ ко всем компаниям и может переключаться между ними
                  </p>
                </div>
              )}

              {/* Подсказка для director */}
              {formData.role === 'director' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Директор может переключаться между всеми компаниями и управлять пользователями
                  </p>
                </div>
              )}

              {formData.role === 'supervisor' && (
                <div>
                  <label className="label">Выберите супервайзера</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Выберите...</option>
                    {supervisors.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === 'manager' && (
                <div>
                  <label className="label">Выберите менеджера</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Выберите...</option>
                    {managers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Активен
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
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

export default Users;
