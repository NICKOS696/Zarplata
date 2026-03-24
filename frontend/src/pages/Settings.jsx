import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { brandsAPI, kpiTypesAPI, salaryRulesAPI, territoriesAPI, companiesAPI } from '../services/api';
import { Plus, Package, Target, DollarSign, Edit2, Trash2, MapPin, GripVertical, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY } from '../config';

function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, currentCompanyId } = useAuth();
  const [brands, setBrands] = useState([]);
  const [kpiTypes, setKpiTypes] = useState([]);
  const [salaryRules, setSalaryRules] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'brands');
  const [selectedTerritories, setSelectedTerritories] = useState([]);
  const [draggedTerritoryIndex, setDraggedTerritoryIndex] = useState(null);

  // Modals
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [showBulkCriteriaModal, setShowBulkCriteriaModal] = useState(false);
  const [bulkCriteriaForm, setBulkCriteriaForm] = useState({
    work_days_calculation: 'criteria',
    order_count_threshold_low: 0,
    order_count_threshold_mid: 0,
    order_count_threshold_high: 0,
    order_sum_threshold_low: 0,
    order_sum_threshold_mid: 0,
    order_sum_threshold_high: 0,
  });

  // Forms
  const [editingBrand, setEditingBrand] = useState(null);
  const [editingKpi, setEditingKpi] = useState(null);
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [brandForm, setBrandForm] = useState({ name: '', name_1c: '', company_id: '' });
  const [kpiForm, setKpiForm] = useState({ name: '', name_1c: '', description: '', company_id: '' });
  const [territoryForm, setTerritoryForm] = useState({ 
    name: '', 
    sort_order: 0, 
    company_id: '',
    work_days_calculation: 'standard',
    order_count_threshold_low: 0,
    order_count_threshold_mid: 0,
    order_count_threshold_high: 0,
    order_sum_threshold_low: 0,
    order_sum_threshold_mid: 0,
    order_sum_threshold_high: 0,
  });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    position: 'manager',
    rule_type: 'percentage',
    config: { base_percent: 3, bonus_percent: 2, threshold: 100 },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [brandsRes, kpisRes, rulesRes, territoriesRes, companiesRes] = await Promise.all([
        brandsAPI.getAll(),
        kpiTypesAPI.getAll(),
        salaryRulesAPI.getAll(),
        territoriesAPI.getAll(),
        companiesAPI.getAll(),
      ]);
      setBrands(brandsRes.data);
      setKpiTypes(kpisRes.data);
      setSalaryRules(rulesRes.data);
      setTerritories(territoriesRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : '';
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...brandForm,
        company_id: brandForm.company_id ? parseInt(brandForm.company_id) : (currentCompanyId || 1),
      };
      if (editingBrand) {
        await brandsAPI.update(editingBrand.id, data);
      } else {
        await brandsAPI.create(data);
      }
      setShowBrandModal(false);
      setBrandForm({ name: '', name_1c: '', company_id: currentCompanyId || '' });
      setEditingBrand(null);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения бренда');
    }
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, name_1c: brand.name_1c || '', company_id: brand.company_id || '' });
    setShowBrandModal(true);
  };

  const handleDeleteBrand = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот бренд?')) {
      try {
        await brandsAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления бренда');
      }
    }
  };

  const handleKpiSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...kpiForm,
        company_id: kpiForm.company_id ? parseInt(kpiForm.company_id) : (currentCompanyId || 1),
      };
      if (editingKpi) {
        await kpiTypesAPI.update(editingKpi.id, data);
      } else {
        await kpiTypesAPI.create(data);
      }
      setShowKpiModal(false);
      setKpiForm({ name: '', name_1c: '', description: '', company_id: currentCompanyId || '' });
      setEditingKpi(null);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения KPI');
    }
  };

  const handleEditKpi = (kpi) => {
    setEditingKpi(kpi);
    setKpiForm({ name: kpi.name, name_1c: kpi.name_1c || '', description: kpi.description || '', company_id: kpi.company_id || '' });
    setShowKpiModal(true);
  };

  const handleDeleteKpi = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот KPI?')) {
      try {
        await kpiTypesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления KPI');
      }
    }
  };

  const handleDeleteRule = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить это правило?')) {
      try {
        await salaryRulesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления правила');
      }
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      await salaryRulesAPI.create(ruleForm);
      setShowRuleModal(false);
      setRuleForm({
        name: '',
        position: 'manager',
        rule_type: 'percentage',
        config: { base_percent: 3, bonus_percent: 2, threshold: 100 },
      });
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка создания правила');
    }
  };

  const handleTerritorySubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...territoryForm,
        company_id: territoryForm.company_id ? parseInt(territoryForm.company_id) : (currentCompanyId || 1),
      };
      if (editingTerritory) {
        await territoriesAPI.update(editingTerritory.id, data);
      } else {
        // Устанавливаем sort_order как следующий после последнего
        const maxOrder = territories.length > 0 ? Math.max(...territories.map(t => t.sort_order)) : -1;
        await territoriesAPI.create({ ...data, sort_order: maxOrder + 1 });
      }
      setShowTerritoryModal(false);
      setEditingTerritory(null);
      setTerritoryForm({ 
        name: '', 
        sort_order: 0, 
        company_id: currentCompanyId || '',
        work_days_calculation: 'standard',
        order_count_threshold_low: 0,
        order_count_threshold_mid: 0,
        order_count_threshold_high: 0,
        order_sum_threshold_low: 0,
        order_sum_threshold_mid: 0,
        order_sum_threshold_high: 0,
      });
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения территории');
    }
  };

  const handleEditTerritory = (territory) => {
    setEditingTerritory(territory);
    setTerritoryForm({
      name: territory.name,
      sort_order: territory.sort_order,
      company_id: territory.company_id || '',
      work_days_calculation: territory.work_days_calculation || 'standard',
      order_count_threshold_low: territory.order_count_threshold_low || 0,
      order_count_threshold_mid: territory.order_count_threshold_mid || 0,
      order_count_threshold_high: territory.order_count_threshold_high || 0,
      order_sum_threshold_low: territory.order_sum_threshold_low || 0,
      order_sum_threshold_mid: territory.order_sum_threshold_mid || 0,
      order_sum_threshold_high: territory.order_sum_threshold_high || 0,
    });
    setShowTerritoryModal(true);
  };

  const handleDeleteTerritory = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту территорию?')) {
      try {
        await territoriesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления территории');
      }
    }
  };

  const handleMoveTerritoryUp = async (index) => {
    if (index === 0) return;
    const newTerritories = [...territories];
    [newTerritories[index - 1], newTerritories[index]] = [newTerritories[index], newTerritories[index - 1]];
    
    const updates = newTerritories.map((t, i) => ({ id: t.id, sort_order: i }));
    try {
      await territoriesAPI.reorder(updates);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка изменения порядка');
    }
  };

  const handleMoveTerritoryDown = async (index) => {
    if (index === territories.length - 1) return;
    const newTerritories = [...territories];
    [newTerritories[index], newTerritories[index + 1]] = [newTerritories[index + 1], newTerritories[index]];
    
    const updates = newTerritories.map((t, i) => ({ id: t.id, sort_order: i }));
    try {
      await territoriesAPI.reorder(updates);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка изменения порядка');
    }
  };

  const handleBulkDeleteTerritories = async () => {
    if (selectedTerritories.length === 0) {
      alert('Выберите территории для удаления');
      return;
    }
    
    if (window.confirm(`Вы уверены, что хотите удалить ${selectedTerritories.length} территорий? Это действие нельзя отменить!`)) {
      try {
        const response = await territoriesAPI.bulkDelete(selectedTerritories);
        alert(response.data.message);
        setSelectedTerritories([]);
        loadData();
      } catch (error) {
        console.error('Ошибка массового удаления:', error);
        alert('Ошибка удаления территорий: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleBulkUpdateCriteria = async (e) => {
    e.preventDefault();
    if (selectedTerritories.length === 0) {
      alert('Выберите территории для изменения');
      return;
    }
    
    try {
      const response = await territoriesAPI.bulkUpdateCriteria(selectedTerritories, bulkCriteriaForm);
      alert(response.data.message);
      setShowBulkCriteriaModal(false);
      setSelectedTerritories([]);
      loadData();
    } catch (error) {
      console.error('Ошибка группового обновления:', error);
      alert('Ошибка обновления критериев: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSelectAllTerritories = () => {
    if (selectedTerritories.length === territories.length) {
      setSelectedTerritories([]);
    } else {
      setSelectedTerritories(territories.map(t => t.id));
    }
  };

  const handleSelectTerritory = (id) => {
    if (selectedTerritories.includes(id)) {
      setSelectedTerritories(selectedTerritories.filter(tId => tId !== id));
    } else {
      setSelectedTerritories([...selectedTerritories, id]);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedTerritoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedTerritoryIndex === null || draggedTerritoryIndex === dropIndex) {
      setDraggedTerritoryIndex(null);
      return;
    }

    const newTerritories = [...territories];
    const draggedTerritory = newTerritories[draggedTerritoryIndex];
    
    // Удаляем элемент из старой позиции
    newTerritories.splice(draggedTerritoryIndex, 1);
    // Вставляем на новую позицию
    newTerritories.splice(dropIndex, 0, draggedTerritory);
    
    // Обновляем sort_order для всех территорий
    const updates = newTerritories.map((t, i) => ({ id: t.id, sort_order: i }));
    
    try {
      await territoriesAPI.reorder(updates);
      setDraggedTerritoryIndex(null);
      loadData();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка изменения порядка');
      setDraggedTerritoryIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTerritoryIndex(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-600 mt-1">Управление брендами, KPI и правилами расчета</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('brands')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'brands'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package size={18} className="inline mr-2" />
          Бренды
        </button>
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'kpi'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target size={18} className="inline mr-2" />
          KPI
        </button>
        <button
          onClick={() => setActiveTab('territories')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'territories'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin size={18} className="inline mr-2" />
          Структура компании
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'rules'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign size={18} className="inline mr-2" />
          Правила зарплаты
        </button>
      </div>

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Бренды</h3>
            <button
              onClick={() => setShowBrandModal(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Добавить бренд</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <div key={brand.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{brand.name}</h4>
                    {brand.name_1c && (
                      <p className="text-xs text-gray-500 mt-1">1С: {brand.name_1c}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {brand.is_active ? 'Активен' : 'Неактивен'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditBrand(brand)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(brand.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Tab */}
      {activeTab === 'kpi' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Типы KPI</h3>
            <button
              onClick={() => setShowKpiModal(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Добавить KPI</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {kpiTypes.map((kpi) => (
              <div key={kpi.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{kpi.name}</h4>
                    {kpi.name_1c && (
                      <p className="text-xs text-gray-500 mt-1">1С: {kpi.name_1c}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{kpi.description || 'Без описания'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditKpi(kpi)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteKpi(kpi.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Territories Tab */}
      {activeTab === 'territories' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Структура компании</h3>
            <div className="flex space-x-3">
              {selectedTerritories.length > 0 && (
                <>
                  <button
                    onClick={() => setShowBulkCriteriaModal(true)}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                  >
                    <Edit2 size={18} />
                    <span>Изменить критерии ({selectedTerritories.length})</span>
                  </button>
                  <button
                    onClick={handleBulkDeleteTerritories}
                    className="btn bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
                  >
                    <Trash2 size={18} />
                    <span>Удалить ({selectedTerritories.length})</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setShowTerritoryModal(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>Добавить территорию</span>
              </button>
            </div>
          </div>
          
          <div className="mb-3 flex items-center">
            <input
              type="checkbox"
              checked={selectedTerritories.length === territories.length && territories.length > 0}
              onChange={handleSelectAllTerritories}
              className="w-4 h-4 mr-2"
            />
            <span className="text-sm text-gray-600">Выбрать все</span>
          </div>
          
          <div className="space-y-2">
            {territories.map((territory, index) => (
              <div 
                key={territory.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-4 border rounded-lg transition-all flex items-center justify-between cursor-move ${
                  selectedTerritories.includes(territory.id) ? 'bg-blue-50 border-blue-300' : ''
                } ${
                  draggedTerritoryIndex === index ? 'opacity-50' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedTerritories.includes(territory.id)}
                    onChange={() => handleSelectTerritory(territory.id)}
                    className="w-4 h-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <GripVertical size={20} className="text-gray-400" title="Перетащите для изменения порядка" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{territory.name}</h4>
                      {territory.work_days_calculation === 'criteria' ? (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">По критериям</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Стандартный</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Порядок: {territory.sort_order + 1}</p>
                    {territory.work_days_calculation === 'criteria' && (
                      <p className="text-xs text-gray-400 mt-1">
                        Кол-во заказов: {territory.order_count_threshold_low || 0} / {territory.order_count_threshold_mid || 0} / {territory.order_count_threshold_high || 0} | 
                        Сумма: {territory.order_sum_threshold_low || 0} / {territory.order_sum_threshold_mid || 0} / {territory.order_sum_threshold_high || 0}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTerritory(territory);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Редактировать"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTerritory(territory.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary Rules Tab */}
      {activeTab === 'rules' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Правила расчета зарплаты</h3>
            <button
              onClick={() => navigate('/salary-rules/new')}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Создать правило</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {salaryRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{rule.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Должность: {
                        rule.position === 'agent' ? 'Торговый агент' :
                        rule.position === 'supervisor' ? 'Супервайзер' : 'Менеджер'
                      }
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Оклад:</span>{' '}
                        <span className="font-medium">{rule.fixed_salary?.toLocaleString('ru-RU') || 0} {CURRENCY}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Дорожные:</span>{' '}
                        <span className="font-medium">{rule.travel_allowance?.toLocaleString('ru-RU') || 0} {CURRENCY}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.is_active ? 'Активно' : 'Неактивно'}
                    </span>
                    <button
                      onClick={() => navigate(`/salary-rules/${rule.id}/edit`)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Редактировать"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingBrand ? 'Редактировать бренд' : 'Новый бренд'}</h2>
            <form onSubmit={handleBrandSubmit} className="space-y-4">
              <div>
                <label className="label">Название бренда</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Название в 1С</label>
                <input
                  type="text"
                  value={brandForm.name_1c}
                  onChange={(e) => setBrandForm({ ...brandForm, name_1c: e.target.value })}
                  className="input"
                  placeholder="Как называется в 1С"
                />
              </div>
              {(user?.role === 'admin' || user?.role === 'director') && companies.length > 0 && (
                <div>
                  <label className="label flex items-center">
                    <Building2 size={16} className="mr-1" />
                    Компания
                  </label>
                  <select
                    value={brandForm.company_id}
                    onChange={(e) => setBrandForm({ ...brandForm, company_id: e.target.value })}
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
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Modal */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingKpi ? 'Редактировать KPI' : 'Новый KPI'}</h2>
            <form onSubmit={handleKpiSubmit} className="space-y-4">
              <div>
                <label className="label">Название KPI</label>
                <input
                  type="text"
                  value={kpiForm.name}
                  onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Название в 1С</label>
                <input
                  type="text"
                  value={kpiForm.name_1c}
                  onChange={(e) => setKpiForm({ ...kpiForm, name_1c: e.target.value })}
                  className="input"
                  placeholder="Как называется в 1С"
                />
              </div>
              <div>
                <label className="label">Описание</label>
                <textarea
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  className="input"
                  rows="3"
                />
              </div>
              {(user?.role === 'admin' || user?.role === 'director') && companies.length > 0 && (
                <div>
                  <label className="label flex items-center">
                    <Building2 size={16} className="mr-1" />
                    Компания
                  </label>
                  <select
                    value={kpiForm.company_id}
                    onChange={(e) => setKpiForm({ ...kpiForm, company_id: e.target.value })}
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
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => setShowKpiModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Territory Modal */}
      {showTerritoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editingTerritory ? 'Редактировать территорию' : 'Новая территория'}</h2>
            <form onSubmit={handleTerritorySubmit} className="space-y-4">
              <div>
                <label className="label">Название территории</label>
                <input
                  type="text"
                  value={territoryForm.name}
                  onChange={(e) => setTerritoryForm({ ...territoryForm, name: e.target.value })}
                  className="input"
                  required
                  placeholder="Например: ТА Миробадский район"
                />
              </div>
              {(user?.role === 'admin' || user?.role === 'director') && companies.length > 0 && (
                <div>
                  <label className="label flex items-center">
                    <Building2 size={16} className="mr-1" />
                    Компания
                  </label>
                  <select
                    value={territoryForm.company_id}
                    onChange={(e) => setTerritoryForm({ ...territoryForm, company_id: e.target.value })}
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

              {/* Расчёт отработанных дней */}
              <div className="border-t pt-4 mt-4">
                <label className="label">Расчёт отработанных дней</label>
                <select
                  value={territoryForm.work_days_calculation}
                  onChange={(e) => setTerritoryForm({ ...territoryForm, work_days_calculation: e.target.value })}
                  className="input"
                >
                  <option value="standard">Стандартный (по факту дней)</option>
                  <option value="criteria">По критериям (количество и сумма заказов)</option>
                </select>
              </div>

              {/* Критерии дня - показываем только если выбран расчёт по критериям */}
              {territoryForm.work_days_calculation === 'criteria' && (
                <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-700">Критерии дня</h4>
                  
                  {/* Количество заказов */}
                  <div className="space-y-2">
                    <label className="label text-sm">Количество заказов</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">меньше = 0</label>
                        <input
                          type="number"
                          value={territoryForm.order_count_threshold_low}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_count_threshold_low: parseInt(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">от = 0.25</label>
                        <input
                          type="number"
                          value={territoryForm.order_count_threshold_mid}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_count_threshold_mid: parseInt(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">больше = 0.5</label>
                        <input
                          type="number"
                          value={territoryForm.order_count_threshold_high}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_count_threshold_high: parseInt(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Сумма заказов */}
                  <div className="space-y-2">
                    <label className="label text-sm">Сумма заказов</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">меньше = 0</label>
                        <input
                          type="number"
                          value={territoryForm.order_sum_threshold_low}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_sum_threshold_low: parseFloat(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">от = 0.25</label>
                        <input
                          type="number"
                          value={territoryForm.order_sum_threshold_mid}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_sum_threshold_mid: parseFloat(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">больше = 0.5</label>
                        <input
                          type="number"
                          value={territoryForm.order_sum_threshold_high}
                          onChange={(e) => setTerritoryForm({ ...territoryForm, order_sum_threshold_high: parseFloat(e.target.value) || 0 })}
                          className="input text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Итоговое значение дня = значение по количеству + значение по сумме (макс. 1.0)
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTerritoryModal(false);
                    setEditingTerritory(null);
                    setTerritoryForm({ 
                      name: '', 
                      sort_order: 0, 
                      company_id: currentCompanyId || '',
                      work_days_calculation: 'standard',
                      order_count_threshold_low: 0,
                      order_count_threshold_mid: 0,
                      order_count_threshold_high: 0,
                      order_sum_threshold_low: 0,
                      order_sum_threshold_mid: 0,
                      order_sum_threshold_high: 0,
                    });
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

      {/* Bulk Criteria Modal */}
      {showBulkCriteriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              Групповое изменение критериев ({selectedTerritories.length} территорий)
            </h2>
            <form onSubmit={handleBulkUpdateCriteria} className="space-y-4">
              <div>
                <label className="label">Тип расчёта отработанных дней</label>
                <select
                  value={bulkCriteriaForm.work_days_calculation}
                  onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, work_days_calculation: e.target.value })}
                  className="input"
                >
                  <option value="standard">Стандартный (по факту)</option>
                  <option value="criteria">По критериям</option>
                </select>
              </div>

              {bulkCriteriaForm.work_days_calculation === 'criteria' && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Критерии по количеству заказов</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Меньше (= 0)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_count_threshold_low}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_count_threshold_low: parseInt(e.target.value) || 0 })}
                          className="input"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">От (= 0.25)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_count_threshold_mid}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_count_threshold_mid: parseInt(e.target.value) || 0 })}
                          className="input"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Больше (= 0.5)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_count_threshold_high}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_count_threshold_high: parseInt(e.target.value) || 0 })}
                          className="input"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Критерии по сумме заказов</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Меньше (= 0)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_sum_threshold_low}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_sum_threshold_low: parseFloat(e.target.value) || 0 })}
                          className="input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">От (= 0.25)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_sum_threshold_mid}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_sum_threshold_mid: parseFloat(e.target.value) || 0 })}
                          className="input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Больше (= 0.5)</label>
                        <input
                          type="number"
                          value={bulkCriteriaForm.order_sum_threshold_high}
                          onChange={(e) => setBulkCriteriaForm({ ...bulkCriteriaForm, order_sum_threshold_high: parseFloat(e.target.value) || 0 })}
                          className="input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Применить ко всем выбранным
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkCriteriaModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Новое правило</h2>
            <form onSubmit={handleRuleSubmit} className="space-y-4">
              <div>
                <label className="label">Название</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Должность</label>
                <select
                  value={ruleForm.position}
                  onChange={(e) => setRuleForm({ ...ruleForm, position: e.target.value })}
                  className="input"
                >
                  <option value="manager">Менеджер</option>
                  <option value="supervisor">Супервайзер</option>
                </select>
              </div>
              <div>
                <label className="label">Тип правила</label>
                <select
                  value={ruleForm.rule_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                  className="input"
                >
                  <option value="percentage">Процент от продаж</option>
                  <option value="tiered">Ступенчатая система</option>
                  <option value="fixed">Фиксированная сумма</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Сохранить</button>
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
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

export default Settings;
