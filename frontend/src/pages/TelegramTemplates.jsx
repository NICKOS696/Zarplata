import React, { useState, useEffect } from 'react';
import { telegramTemplatesAPI } from '../services/api';
import { Plus, Edit2, Trash2, MessageSquare, Copy, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function TelegramTemplates() {
  const { currentCompanyId } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    template_text: '',
    is_active: true
  });

  // Список доступных переменных
  const variables = [
    { category: 'Основные', items: [
      { name: '{employee_name}', desc: 'Имя сотрудника' },
      { name: '{territory}', desc: 'Территория' },
      { name: '{date}', desc: 'Текущая дата' },
      { name: '{month}', desc: 'Месяц' },
      { name: '{year}', desc: 'Год' },
    ]},
    { category: 'Зарплата', items: [
      { name: '{fixed_salary}', desc: 'Фиксированная зарплата' },
      { name: '{travel_allowance}', desc: 'Дорожные' },
      { name: '{bonus}', desc: 'Бонус' },
      { name: '{days_worked}', desc: 'Отработано дней' },
      { name: '{working_days}', desc: 'Рабочих дней в месяце' },
    ]},
    { category: 'Бренды (цикл)', items: [
      { name: '{brands_loop}...{/brands_loop}', desc: 'Цикл по брендам' },
      { name: '{brand_name}', desc: 'Название бренда (в цикле)' },
      { name: '{brand_plan}', desc: 'План по бренду' },
      { name: '{brand_fact}', desc: 'Факт по бренду' },
      { name: '{brand_percent}', desc: 'Процент выполнения' },
      { name: '{brand_accrual}', desc: 'Начисление по бренду' },
      { name: '{progress_bar}', desc: 'Шкала выполнения ▰▰▰▱▱' },
    ]},
    { category: 'KPI (цикл)', items: [
      { name: '{kpi_loop}...{/kpi_loop}', desc: 'Цикл по KPI' },
      { name: '{kpi_name}', desc: 'Название KPI (в цикле)' },
      { name: '{kpi_plan}', desc: 'План по KPI' },
      { name: '{kpi_fact}', desc: 'Факт по KPI' },
      { name: '{kpi_percent}', desc: 'Процент выполнения' },
      { name: '{kpi_accrual}', desc: 'Начисление по KPI' },
    ]},
    { category: 'Итоги', items: [
      { name: '{total_plan}', desc: 'Общий план' },
      { name: '{total_fact}', desc: 'Общий факт' },
      { name: '{total_percent}', desc: 'Общий процент' },
      { name: '{total_accrual}', desc: 'Общее начисление' },
      { name: '{total_salary}', desc: 'Итого к выплате' },
      { name: '{order_count}', desc: 'Количество заявок' },
      { name: '{reserved_orders}', desc: 'Резервные заявки' },
    ]},
    { category: 'Прогноз', items: [
      { name: '{forecast_result}', desc: 'Прогнозируемый результат' },
      { name: '{forecast_percent}', desc: 'Прогноз выполнения %' },
      { name: '{plan_per_day}', desc: 'План на завтра' },
      { name: '{days_remaining}', desc: 'Осталось рабочих дней' },
    ]},
  ];

  useEffect(() => {
    loadTemplates();
  }, [currentCompanyId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await telegramTemplatesAPI.getAll(currentCompanyId);
      setTemplates(response.data);
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
      alert('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        template_text: template.template_text,
        is_active: template.is_active
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        template_text: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      template_text: '',
      is_active: true
    });
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await telegramTemplatesAPI.update(editingTemplate.id, templateForm);
      } else {
        await telegramTemplatesAPI.create({
          ...templateForm,
          company_id: currentCompanyId
        });
      }
      await loadTemplates();
      handleCloseModal();
    } catch (error) {
      console.error('Ошибка сохранения шаблона:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот шаблон?')) return;
    
    try {
      await telegramTemplatesAPI.delete(id);
      await loadTemplates();
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error);
      alert('Ошибка удаления шаблона');
    }
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateForm.template_text;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    setTemplateForm({ ...templateForm, template_text: newText });
    
    // Восстанавливаем фокус и позицию курсора
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const getPreviewText = () => {
    // Простой пример подстановки для превью
    return templateForm.template_text
      .replace(/{employee_name}/g, 'Иван Иванов')
      .replace(/{territory}/g, 'Москва')
      .replace(/{date}/g, new Date().toLocaleDateString('ru-RU'))
      .replace(/{month}/g, new Date().toLocaleDateString('ru-RU', { month: 'long' }))
      .replace(/{fixed_salary}/g, '1 500 000')
      .replace(/{travel_allowance}/g, '150 000')
      .replace(/{total_salary}/g, '2 800 000')
      .replace(/{brands_loop}([\s\S]*?){\/brands_loop}/g, (match, content) => {
        return ['АУРА', 'Я САМАЯ'].map(brand => 
          content.replace(/{brand_name}/g, brand)
            .replace(/{brand_plan}/g, '20 000 000')
            .replace(/{brand_fact}/g, '17 000 000')
            .replace(/{brand_percent}/g, '85')
            .replace(/{brand_accrual}/g, '500 000')
            .replace(/{progress_bar}/g, '▰▰▰▰▰▰▰▰▱▱')
        ).join('\n');
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="mr-3" size={32} />
            Шаблоны сообщений Telegram
          </h1>
          <p className="text-gray-600 mt-1">Конструктор сообщений для отправки в Telegram</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Создать шаблон</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Загрузка...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Нет созданных шаблонов. Создайте первый шаблон!
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3 max-h-32 overflow-y-auto font-mono">
                {template.template_text.substring(0, 200)}
                {template.template_text.length > 200 && '...'}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenModal(template)}
                  className="btn btn-sm btn-secondary flex-1 flex items-center justify-center space-x-1"
                >
                  <Edit2 size={16} />
                  <span>Редактировать</span>
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Форма */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Название шаблона</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="input w-full"
                      placeholder="Например: Ежедневный отчет"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium">Текст сообщения</label>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Eye size={16} />
                        <span>{showPreview ? 'Скрыть' : 'Показать'} превью</span>
                      </button>
                    </div>
                    <textarea
                      id="template-text"
                      value={templateForm.template_text}
                      onChange={(e) => setTemplateForm({ ...templateForm, template_text: e.target.value })}
                      className="input w-full font-mono text-sm"
                      rows={showPreview ? 10 : 20}
                      placeholder="Введите текст сообщения. Используйте переменные из списка справа."
                    />
                  </div>

                  {showPreview && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Превью (пример)</label>
                      <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap text-sm">
                        {getPreviewText()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={templateForm.is_active}
                      onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="is_active" className="text-sm">Активен</label>
                  </div>
                </div>

                {/* Переменные */}
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium mb-2">Доступные переменные</label>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {variables.map((category, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">{category.category}</h4>
                        <div className="space-y-1">
                          {category.items.map((variable, vidx) => (
                            <button
                              key={vidx}
                              onClick={() => insertVariable(variable.name)}
                              className="w-full text-left px-2 py-1 text-xs bg-white hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                              title={variable.desc}
                            >
                              <div className="font-mono text-blue-600">{variable.name}</div>
                              <div className="text-gray-600 text-xs">{variable.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button onClick={handleCloseModal} className="btn btn-secondary">
                Отмена
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                {editingTemplate ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TelegramTemplates;
