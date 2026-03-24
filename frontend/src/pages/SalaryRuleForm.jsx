import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salaryRulesAPI, brandsAPI, kpiTypesAPI, companiesAPI } from '../services/api';
import { Save, X, Plus, Trash2, Download, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY } from '../config';
import * as XLSX from 'xlsx';

function SalaryRuleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, currentCompanyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [kpiTypes, setKpiTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    position: 'agent',
    fixed_salary: 0,
    travel_allowance: 0,
    company_id: '',
    motivation_config: {
      brands: {},
      kpis: {},
      brand_combinations: [],  // Комбинации брендов (например, [1,2])
      all_brands: null  // Начисление за все бренды вместе
    },
    is_active: true,
    // Грейдовая система
    fixed_salary_type: 'classic',  // 'classic' или 'graded'
    grade_trainee_salary: 0,
    grade_trainee_condition: 'orders',
    grade_trainee_threshold: 0,
    grade_professional_salary: 0,
    grade_professional_condition: 'orders',
    grade_professional_threshold: 0,
    grade_expert_salary: 0,
    grade_expert_condition: 'orders',
    grade_expert_threshold: 0,
  });

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('');

  useEffect(() => {
    loadData();
    if (id) {
      loadRule();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [brandsRes, kpisRes, companiesRes] = await Promise.all([
        brandsAPI.getAll(),
        kpiTypesAPI.getAll(),
        companiesAPI.getAll()
      ]);
      setBrands(brandsRes.data);
      setKpiTypes(kpisRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  };

  const loadRule = async () => {
    try {
      setLoading(true);
      const response = await salaryRulesAPI.getById(id);
      setFormData(response.data);
    } catch (error) {
      console.error('Ошибка загрузки правила:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = {
        ...formData,
        company_id: formData.company_id ? parseInt(formData.company_id) : (currentCompanyId || 1),
      };
      if (id) {
        await salaryRulesAPI.update(id, data);
      } else {
        await salaryRulesAPI.create(data);
      }
      navigate('/settings?tab=rules');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения правила');
    } finally {
      setLoading(false);
    }
  };

  const addBrandRule = () => {
    if (!selectedBrand) return;
    
    const newConfig = { ...formData.motivation_config };
    if (!newConfig.brands) newConfig.brands = {};
    
    // Если бренд уже есть, добавляем новое правило в массив
    // Если нет - создаем массив с одним правилом
    const newRule = {
      method: 'fixed_amount_table',
      threshold_from: 70,
      threshold_to: 110,
      amounts: {}
    };
    
    if (newConfig.brands[selectedBrand]) {
      // Преобразуем старый формат (объект) в новый (массив), если нужно
      const existingRules = Array.isArray(newConfig.brands[selectedBrand]) 
        ? newConfig.brands[selectedBrand] 
        : [newConfig.brands[selectedBrand]];
      newConfig.brands[selectedBrand] = [...existingRules, newRule];
    } else {
      newConfig.brands[selectedBrand] = [newRule];
    }
    
    setFormData({ ...formData, motivation_config: newConfig });
    setSelectedBrand('');
  };

  const addKpiRule = () => {
    if (!selectedKpi) return;
    
    const newConfig = { ...formData.motivation_config };
    if (!newConfig.kpis) newConfig.kpis = {};
    
    newConfig.kpis[selectedKpi] = {
      method: 'fixed_amount_table',
      threshold_from: 80,
      threshold_to: 110,
      amounts: {}
    };
    
    setFormData({ ...formData, motivation_config: newConfig });
    setSelectedKpi('');
  };

  const removeBrandRule = (brandId, ruleIndex = null) => {
    const newConfig = { ...formData.motivation_config };
    
    if (ruleIndex !== null) {
      // Удаляем конкретное правило из массива
      const rules = Array.isArray(newConfig.brands[brandId]) 
        ? newConfig.brands[brandId] 
        : [newConfig.brands[brandId]];
      
      rules.splice(ruleIndex, 1);
      
      if (rules.length === 0) {
        // Если правил не осталось, удаляем весь бренд
        delete newConfig.brands[brandId];
      } else {
        newConfig.brands[brandId] = rules;
      }
    } else {
      // Удаляем весь бренд со всеми правилами
      delete newConfig.brands[brandId];
    }
    
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const removeKpiRule = (kpiId) => {
    const newConfig = { ...formData.motivation_config };
    delete newConfig.kpis[kpiId];
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const updateBrandRule = (brandId, ruleIndex, field, value) => {
    const newConfig = { ...formData.motivation_config };
    const rules = Array.isArray(newConfig.brands[brandId]) 
      ? newConfig.brands[brandId] 
      : [newConfig.brands[brandId]];
    
    rules[ruleIndex][field] = value;
    newConfig.brands[brandId] = rules;
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const updateKpiRule = (kpiId, field, value) => {
    const newConfig = { ...formData.motivation_config };
    newConfig.kpis[kpiId][field] = value;
    setFormData({ ...formData, motivation_config: newConfig });
  };

  // Функции для комбинаций брендов
  const addBrandCombination = () => {
    const newConfig = { ...formData.motivation_config };
    if (!newConfig.brand_combinations) newConfig.brand_combinations = [];
    
    newConfig.brand_combinations.push({
      brand_ids: [],
      method: 'fixed_amount_table',
      threshold_from: 70,
      threshold_to: 110,
      amounts: {}
    });
    
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const removeBrandCombination = (index) => {
    const newConfig = { ...formData.motivation_config };
    newConfig.brand_combinations.splice(index, 1);
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const updateBrandCombination = (index, field, value) => {
    const newConfig = { ...formData.motivation_config };
    newConfig.brand_combinations[index][field] = value;
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const toggleBrandInCombination = (combIndex, brandId) => {
    const newConfig = { ...formData.motivation_config };
    const brandIds = newConfig.brand_combinations[combIndex].brand_ids;
    const index = brandIds.indexOf(parseInt(brandId));
    
    if (index > -1) {
      brandIds.splice(index, 1);
    } else {
      brandIds.push(parseInt(brandId));
    }
    
    setFormData({ ...formData, motivation_config: newConfig });
  };

  // Функция для начисления за все бренды
  const toggleAllBrandsRule = () => {
    const newConfig = { ...formData.motivation_config };
    
    if (newConfig.all_brands) {
      newConfig.all_brands = null;
    } else {
      newConfig.all_brands = {
        method: 'fixed_amount_table',
        threshold_from: 70,
        threshold_to: 110,
        amounts: {}
      };
    }
    
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const updateAllBrandsRule = (field, value) => {
    const newConfig = { ...formData.motivation_config };
    if (newConfig.all_brands) {
      newConfig.all_brands[field] = value;
      setFormData({ ...formData, motivation_config: newConfig });
    }
  };

  // Экспорт правила в Excel с форматированием
  const exportToExcel = () => {
    // Создаем данные для таблицы
    const data = [];
    
    // Определяем диапазон процентов (от 1% до 110%)
    const minPercent = 1;
    const maxPercent = 110;
    
    // Заголовки
    const headers = ['Выполнение плана %', 'Оклад', 'Соц.Пакет (Дорожные)'];
    
    // Добавляем бренды
    const brandConfigs = formData.motivation_config?.brands || {};
    Object.keys(brandConfigs).forEach(brandId => {
      const brand = brands.find(b => b.id === parseInt(brandId));
      if (brand) {
        const config = brandConfigs[brandId];
        headers.push(`План ${brand.name}\n(с ${config.threshold_from}%)`);
      }
    });
    
    // Добавляем KPI
    const kpiConfigs = formData.motivation_config?.kpis || {};
    Object.keys(kpiConfigs).forEach(kpiId => {
      const kpi = kpiTypes.find(k => k.id === parseInt(kpiId));
      if (kpi) {
        const config = kpiConfigs[kpiId];
        headers.push(`KPI ${kpi.name}\n(с ${config.threshold_from}%)`);
      }
    });
    
    // Добавляем комбинации брендов
    const brandCombinations = formData.motivation_config?.brand_combinations || [];
    brandCombinations.forEach((combo, idx) => {
      const brandNames = combo.brand_ids.map(bid => {
        const b = brands.find(br => br.id === bid);
        return b ? b.name : '';
      }).join('+');
      headers.push(`Комбинация\n${brandNames}\n(с ${combo.threshold_from}%)`);
    });
    
    // Добавляем "Все бренды"
    if (formData.motivation_config?.all_brands) {
      const config = formData.motivation_config.all_brands;
      headers.push(`Общий план\nвсех брендов\n(с ${config.threshold_from}%)`);
    }
    
    headers.push('ОБЩЕЕ\nНАЧИСЛЕНИЕ');
    
    data.push(headers);
    
    // Заполняем строки
    for (let percent = minPercent; percent <= maxPercent; percent++) {
      const row = [];
      row.push(`${percent}%`);
      row.push(formData.fixed_salary || 0);
      row.push(formData.travel_allowance || 0);
      
      let totalAccrual = (formData.fixed_salary || 0) + (formData.travel_allowance || 0);
      
      // Бренды
      Object.keys(brandConfigs).forEach(brandId => {
        const config = brandConfigs[brandId];
        const amount = (percent >= config.threshold_from && percent <= config.threshold_to) 
          ? (config.amounts?.[percent] || 0) 
          : 0;
        row.push(amount);
        totalAccrual += amount;
      });
      
      // KPI
      Object.keys(kpiConfigs).forEach(kpiId => {
        const config = kpiConfigs[kpiId];
        const amount = (percent >= config.threshold_from && percent <= config.threshold_to) 
          ? (config.amounts?.[percent] || 0) 
          : 0;
        row.push(amount);
        totalAccrual += amount;
      });
      
      // Комбинации брендов
      brandCombinations.forEach(combo => {
        const amount = (percent >= combo.threshold_from && percent <= combo.threshold_to) 
          ? (combo.amounts?.[percent] || 0) 
          : 0;
        row.push(amount);
        totalAccrual += amount;
      });
      
      // Все бренды
      if (formData.motivation_config?.all_brands) {
        const config = formData.motivation_config.all_brands;
        const amount = (percent >= config.threshold_from && percent <= config.threshold_to) 
          ? (config.amounts?.[percent] || 0) 
          : 0;
        row.push(amount);
        totalAccrual += amount;
      }
      
      row.push(totalAccrual);
      data.push(row);
    }
    
    // Создаем workbook и worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Устанавливаем ширину колонок
    const colWidths = headers.map((h, idx) => {
      if (idx === 0) return { wch: 12 }; // Процент
      if (idx === headers.length - 1) return { wch: 18 }; // Общее начисление
      return { wch: 16 };
    });
    ws['!cols'] = colWidths;
    
    // Устанавливаем высоту строк
    ws['!rows'] = [{ hpt: 40 }]; // Высота заголовка
    
    // Применяем стили к ячейкам
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // Базовые стили для всех ячеек
        ws[cellAddress].s = {
          alignment: { 
            horizontal: 'center', 
            vertical: 'center',
            wrapText: true 
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        // Стили для заголовка
        if (R === 0) {
          ws[cellAddress].s.fill = { fgColor: { rgb: '4472C4' } };
          ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
        }
        // Стили для колонки с процентами
        else if (C === 0) {
          ws[cellAddress].s.fill = { fgColor: { rgb: 'E7E6E6' } };
          ws[cellAddress].s.font = { bold: true };
        }
        // Стили для последней колонки (Общее начисление)
        else if (C === range.e.c) {
          ws[cellAddress].s.fill = { fgColor: { rgb: 'FFF2CC' } };
          ws[cellAddress].s.font = { bold: true, sz: 11 };
          ws[cellAddress].s.alignment.horizontal = 'right';
        }
        // Выделяем диапазон 70%+
        else if (R >= 70 && R <= 110) {
          if (!ws[cellAddress].s.fill) {
            ws[cellAddress].s.fill = { fgColor: { rgb: 'FCE4D6' } };
          }
        }
        
        // Форматируем числа
        if (typeof ws[cellAddress].v === 'number' && C > 0) {
          ws[cellAddress].z = '#,##0';
        }
      }
    }
    
    // Замораживаем первую строку
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    
    // Добавляем worksheet в workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Мотивация');
    
    // Сохраняем файл
    const fileName = `Мотивация_${formData.name || 'Правило'}_${formData.position}.xlsx`;
    XLSX.writeFile(wb, fileName, { cellStyles: true });
  };

  const updateBrandAmount = (brandId, ruleIndex, percent, amount) => {
    const newConfig = { ...formData.motivation_config };
    const rules = Array.isArray(newConfig.brands[brandId]) 
      ? newConfig.brands[brandId] 
      : [newConfig.brands[brandId]];
    
    if (!rules[ruleIndex].amounts) {
      rules[ruleIndex].amounts = {};
    }
    rules[ruleIndex].amounts[percent] = parseFloat(amount);
    newConfig.brands[brandId] = rules;
    setFormData({ ...formData, motivation_config: newConfig });
  };

  const updateKpiAmount = (kpiId, percent, amount) => {
    const newConfig = { ...formData.motivation_config };
    if (!newConfig.kpis[kpiId].amounts) {
      newConfig.kpis[kpiId].amounts = {};
    }
    newConfig.kpis[kpiId].amounts[percent] = parseFloat(amount);
    setFormData({ ...formData, motivation_config: newConfig });
  };

  // Обработка вставки данных из буфера обмена (Excel)
  const handlePaste = (e, type, itemId, config, ruleIndex = 0) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Разбиваем на строки
    const rows = pastedData.split('\n').filter(row => row.trim());
    
    const newConfig = { ...formData.motivation_config };
    let targetConfig;
    
    if (type === 'brand') {
      const rules = Array.isArray(newConfig.brands[itemId]) 
        ? newConfig.brands[itemId] 
        : [newConfig.brands[itemId]];
      targetConfig = rules[ruleIndex];
    } else if (type === 'kpi') {
      targetConfig = newConfig.kpis[itemId];
    } else if (type === 'combination') {
      targetConfig = newConfig.brand_combinations[itemId];
    } else if (type === 'all_brands') {
      targetConfig = newConfig.all_brands;
    }
    
    if (!targetConfig.amounts) {
      targetConfig.amounts = {};
    }
    
    let currentPercent = config.threshold_from;
    let successCount = 0;
    
    rows.forEach(row => {
      if (currentPercent > config.threshold_to) return;
      
      // Разбиваем строку по табуляции (Excel использует табуляцию между ячейками)
      const cells = row.split('\t');
      
      // Если есть несколько столбцов, берем последний (обычно это сумма)
      // Если один столбец, берем его
      let valueStr = cells.length > 1 ? cells[cells.length - 1] : cells[0];
      
      // Очищаем от пробелов, неразрывных пробелов и заменяем запятую на точку
      valueStr = valueStr.replace(/\s/g, '').replace(/\u00A0/g, '').replace(',', '.');
      
      // Пробуем преобразовать в число
      const numValue = parseFloat(valueStr);
      
      if (!isNaN(numValue) && numValue >= 0) {
        targetConfig.amounts[currentPercent] = numValue;
        currentPercent++;
        successCount++;
      }
    });
    
    setFormData({ ...formData, motivation_config: newConfig });
    
    // Показываем уведомление
    if (successCount > 0) {
      alert(`✅ Успешно вставлено ${successCount} значений`);
    } else {
      alert('⚠️ Не удалось распознать данные. Убедитесь, что вы копируете столбец с числами.');
    }
  };

  const renderMethodConfig = (type, itemId, config, ruleIndex = 0) => {
    const updateFunc = type === 'brand' 
      ? (id, field, value) => updateBrandRule(id, ruleIndex, field, value)
      : updateKpiRule;
    const updateAmountFunc = type === 'brand' 
      ? (id, percent, value) => updateBrandAmount(id, ruleIndex, percent, value)
      : updateKpiAmount;

    if (config.method === 'fixed_amount_table') {
      const percents = [];
      for (let i = config.threshold_from; i <= config.threshold_to; i++) {
        percents.push(i);
      }

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">С какого %</label>
              <input
                type="number"
                value={config.threshold_from}
                onChange={(e) => updateFunc(itemId, 'threshold_from', parseInt(e.target.value))}
                className="input"
                min="0"
                max="110"
              />
            </div>
            <div>
              <label className="label">До какого %</label>
              <input
                type="number"
                value={config.threshold_to}
                onChange={(e) => updateFunc(itemId, 'threshold_to', parseInt(e.target.value))}
                className="input"
                min="0"
                max="110"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-2">
            💡 <strong>Совет:</strong> Скопируйте данные из Excel (столбец с суммами) и вставьте в таблицу с помощью Ctrl+V
          </div>
          
          <div 
            className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded bg-white"
            onPaste={(e) => handlePaste(e, type, itemId, config, ruleIndex)}
            tabIndex={0}
          >
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold border-b">Процент выполнения</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold border-b">Сумма начисления ({CURRENCY})</th>
                </tr>
              </thead>
              <tbody>
                {percents.map(percent => (
                  <tr key={percent} className="hover:bg-gray-50 border-b">
                    <td className="px-3 py-2 text-sm font-medium">{percent}%</td>
                    <td className="px-3 py-1">
                      <input
                        type="number"
                        value={config.amounts?.[percent] || 0}
                        onChange={(e) => updateAmountFunc(itemId, percent, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                        step="1000"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (config.method === 'percent_of_sales') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">С какого %</label>
              <input
                type="number"
                value={config.threshold_from}
                onChange={(e) => updateFunc(itemId, 'threshold_from', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">До какого %</label>
              <input
                type="number"
                value={config.threshold_to}
                onChange={(e) => updateFunc(itemId, 'threshold_to', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">% от продаж</label>
              <input
                type="number"
                value={config.percent || 0}
                onChange={(e) => updateFunc(itemId, 'percent', parseFloat(e.target.value))}
                className="input"
                step="0.1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (config.method === 'bonus_plus_percent') {
      const thresholds = config.thresholds || [
        { threshold: 70, amount: 0 },
        { threshold: 80, amount: 0 },
        { threshold: 90, amount: 0 },
        { threshold: 100, amount: 0 }
      ];
      const percentOfExcess = config.percent_of_excess || 3;

      return (
        <div className="space-y-3">
          <div className="mb-3">
            <label className="label font-semibold">💡 Совет: Скопируйте данные из Excel (столбцы: Порог % и Сумма) и вставьте в таблицу с помощью Ctrl+V</label>
          </div>
          
          <table 
            className="w-full border-collapse"
            onPaste={(e) => {
              e.preventDefault();
              const pastedData = e.clipboardData.getData('text');
              const rows = pastedData.trim().split('\n');
              const newThresholds = rows.map(row => {
                const [threshold, amount] = row.split('\t');
                return {
                  threshold: parseInt(threshold) || 0,
                  amount: parseFloat(amount.replace(/\s/g, '').replace(',', '.')) || 0
                };
              });
              updateFunc(itemId, 'thresholds', newThresholds);
            }}
          >
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Порог выполнения %</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Фиксированная сумма ({CURRENCY})</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="number"
                      value={item.threshold}
                      onChange={(e) => {
                        const newThresholds = [...thresholds];
                        newThresholds[idx].threshold = parseInt(e.target.value);
                        updateFunc(itemId, 'thresholds', newThresholds);
                      }}
                      className="input w-full"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => {
                        const newThresholds = [...thresholds];
                        newThresholds[idx].amount = parseFloat(e.target.value);
                        updateFunc(itemId, 'thresholds', newThresholds);
                      }}
                      className="input w-full"
                      step="100000"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <label className="label font-semibold mb-2">Процент от перевыполнения (свыше 100%)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={percentOfExcess}
                onChange={(e) => updateFunc(itemId, 'percent_of_excess', parseFloat(e.target.value))}
                className="input w-32"
                step="0.1"
              />
              <span className="text-gray-600">% от суммы перевыполнения (Факт - План)</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Пример: При плане 10 000 000 и факте 12 000 000, перевыполнение = 2 000 000. 
              При {percentOfExcess}% начисление = 2 000 000 × {percentOfExcess}% = {(2000000 * percentOfExcess / 100).toLocaleString('ru-RU')} {CURRENCY}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading && id) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Редактировать правило' : 'Новое правило зарплаты'}
        </h1>
        <div className="flex space-x-3">
          {id && (
            <button
              type="button"
              onClick={exportToExcel}
              className="btn bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
            >
              <Download size={18} />
              <span>Скачать Excel</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/settings?tab=rules')}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <X size={18} />
            <span>Отмена</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Основная информация</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Название правила</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
                placeholder="Например: Правило для торговых агентов"
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
          </div>
        </div>

        {/* Фиксированные части */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Фиксированные части (зависят от отработанных дней)</h2>
          
          {/* Выбор типа фиксированной оплаты */}
          <div className="mb-4">
            <label className="label">Тип фиксированной оплаты</label>
            <select
              value={formData.fixed_salary_type || 'classic'}
              onChange={(e) => setFormData({ ...formData, fixed_salary_type: e.target.value })}
              className="input"
            >
              <option value="classic">Классический (фиксированная сумма)</option>
              <option value="graded">Грейдовый (3 категории)</option>
            </select>
          </div>

          {/* Классический оклад */}
          {(formData.fixed_salary_type === 'classic' || !formData.fixed_salary_type) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Фиксированный оклад (месячный, {CURRENCY})</label>
                <input
                  type="number"
                  value={formData.fixed_salary}
                  onChange={(e) => setFormData({ ...formData, fixed_salary: parseFloat(e.target.value) || 0 })}
                  className="input"
                  step="100000"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Дорожные (месячные, {CURRENCY})</label>
                <input
                  type="number"
                  value={formData.travel_allowance}
                  onChange={(e) => setFormData({ ...formData, travel_allowance: parseFloat(e.target.value) || 0 })}
                  className="input"
                  step="10000"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Грейдовая система */}
          {formData.fixed_salary_type === 'graded' && (
            <div className="space-y-4">
              {/* Дорожные */}
              <div>
                <label className="label">Дорожные (месячные, {CURRENCY})</label>
                <input
                  type="number"
                  value={formData.travel_allowance}
                  onChange={(e) => setFormData({ ...formData, travel_allowance: parseFloat(e.target.value) || 0 })}
                  className="input w-48"
                  step="10000"
                  min="0"
                />
              </div>

              {/* Грейд Стажер */}
              <div className="p-4 border rounded-lg bg-yellow-50">
                <h3 className="font-semibold text-yellow-800 mb-3">🌱 Стажер</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label text-sm">Оклад ({CURRENCY})</label>
                    <input
                      type="number"
                      value={formData.grade_trainee_salary || 0}
                      onChange={(e) => setFormData({ ...formData, grade_trainee_salary: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="100000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">Условие</label>
                    <select
                      value={formData.grade_trainee_condition || 'orders'}
                      onChange={(e) => setFormData({ ...formData, grade_trainee_condition: e.target.value })}
                      className="input"
                    >
                      <option value="orders">Кол-во заявок</option>
                      <option value="percent">% выполнения</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-sm">
                      {formData.grade_trainee_condition === 'percent' ? 'От % выполнения' : 'От кол-ва заявок'}
                    </label>
                    <input
                      type="number"
                      value={formData.grade_trainee_threshold || 0}
                      onChange={(e) => setFormData({ ...formData, grade_trainee_threshold: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Грейд Профессионал */}
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-800 mb-3">💼 Профессионал</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label text-sm">Оклад ({CURRENCY})</label>
                    <input
                      type="number"
                      value={formData.grade_professional_salary || 0}
                      onChange={(e) => setFormData({ ...formData, grade_professional_salary: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="100000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">Условие</label>
                    <select
                      value={formData.grade_professional_condition || 'orders'}
                      onChange={(e) => setFormData({ ...formData, grade_professional_condition: e.target.value })}
                      className="input"
                    >
                      <option value="orders">Кол-во заявок</option>
                      <option value="percent">% выполнения</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-sm">
                      {formData.grade_professional_condition === 'percent' ? 'От % выполнения' : 'От кол-ва заявок'}
                    </label>
                    <input
                      type="number"
                      value={formData.grade_professional_threshold || 0}
                      onChange={(e) => setFormData({ ...formData, grade_professional_threshold: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Грейд Эксперт */}
              <div className="p-4 border rounded-lg bg-green-50">
                <h3 className="font-semibold text-green-800 mb-3">🏆 Эксперт</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label text-sm">Оклад ({CURRENCY})</label>
                    <input
                      type="number"
                      value={formData.grade_expert_salary || 0}
                      onChange={(e) => setFormData({ ...formData, grade_expert_salary: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="100000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">Условие</label>
                    <select
                      value={formData.grade_expert_condition || 'orders'}
                      onChange={(e) => setFormData({ ...formData, grade_expert_condition: e.target.value })}
                      className="input"
                    >
                      <option value="orders">Кол-во заявок</option>
                      <option value="percent">% выполнения</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-sm">
                      {formData.grade_expert_condition === 'percent' ? 'От % выполнения' : 'От кол-ва заявок'}
                    </label>
                    <input
                      type="number"
                      value={formData.grade_expert_threshold || 0}
                      onChange={(e) => setFormData({ ...formData, grade_expert_threshold: parseFloat(e.target.value) || 0 })}
                      className="input"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                💡 Агент получает оклад соответствующего грейда, если выполняет условие. 
                Проверка идёт от высшего грейда к низшему (Эксперт → Профессионал → Стажер).
              </p>
            </div>
          )}
        </div>

        {/* Мотивация по брендам */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Мотивация по брендам</h2>
          
          <div className="flex space-x-3 mb-4">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="input flex-1"
            >
              <option value="">Выберите бренд</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addBrandRule}
              className="btn btn-primary flex items-center space-x-2"
              disabled={!selectedBrand}
            >
              <Plus size={18} />
              <span>Добавить</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.motivation_config?.brands && Object.entries(formData.motivation_config.brands).map(([brandId, brandRules]) => {
              const brand = brands.find(b => b.id === parseInt(brandId));
              // Поддержка старого формата (объект) и нового (массив)
              const rulesList = Array.isArray(brandRules) ? brandRules : [brandRules];
              
              return (
                <div key={brandId} className="border-2 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{brand?.name || `Бренд #${brandId}`}</h3>
                      <p className="text-sm text-gray-500">{rulesList.length} правил(а)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBrandRule(brandId)}
                      className="text-red-600 hover:text-red-800"
                      title="Удалить все правила для этого бренда"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {rulesList.map((config, ruleIndex) => (
                      <div key={ruleIndex} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700">Правило #{ruleIndex + 1}</span>
                          {rulesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBrandRule(brandId, ruleIndex)}
                              className="text-red-500 hover:text-red-700"
                              title="Удалить это правило"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <label className="label text-sm">Метод начисления</label>
                          <select
                            value={config.method}
                            onChange={(e) => updateBrandRule(brandId, ruleIndex, 'method', e.target.value)}
                            className="input"
                          >
                            <option value="fixed_amount_table">Таблица фиксированных сумм</option>
                            <option value="percent_of_sales">Процент от продаж</option>
                            <option value="bonus_plus_percent">Таблица фиксированных сумм + % от перевыполнения</option>
                          </select>
                        </div>

                        {renderMethodConfig('brand', brandId, config, ruleIndex)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Мотивация по KPI */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Мотивация по KPI</h2>
          
          <div className="flex space-x-3 mb-4">
            <select
              value={selectedKpi}
              onChange={(e) => setSelectedKpi(e.target.value)}
              className="input flex-1"
            >
              <option value="">Выберите KPI</option>
              {kpiTypes.filter(k => !formData.motivation_config?.kpis?.[k.id]).map(kpi => (
                <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addKpiRule}
              className="btn btn-primary flex items-center space-x-2"
              disabled={!selectedKpi}
            >
              <Plus size={18} />
              <span>Добавить</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.motivation_config?.kpis && Object.entries(formData.motivation_config.kpis).map(([kpiId, config]) => {
              const kpi = kpiTypes.find(k => k.id === parseInt(kpiId));
              return (
                <div key={kpiId} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{kpi?.name || `KPI #${kpiId}`}</h3>
                    <button
                      type="button"
                      onClick={() => removeKpiRule(kpiId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <label className="label">Метод начисления</label>
                    <select
                      value={config.method}
                      onChange={(e) => updateKpiRule(kpiId, 'method', e.target.value)}
                      className="input"
                    >
                      <option value="fixed_amount_table">Таблица фиксированных сумм</option>
                      <option value="percent_of_sales">Процент от продаж</option>
                      <option value="bonus_plus_percent">Таблица фиксированных сумм + % от перевыполнения</option>
                    </select>
                  </div>

                  {renderMethodConfig('kpi', kpiId, config)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Комбинированные начисления за несколько брендов */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Комбинированные начисления (несколько брендов)</h2>
            <button
              type="button"
              onClick={addBrandCombination}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Добавить комбинацию</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.motivation_config?.brand_combinations?.map((combo, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium">Комбинация #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeBrandCombination(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="mb-3">
                  <label className="label">Выберите бренды для комбинации</label>
                  <div className="grid grid-cols-2 gap-2">
                    {brands.map(brand => (
                      <label key={brand.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={combo.brand_ids.includes(brand.id)}
                          onChange={() => toggleBrandInCombination(index, brand.id)}
                        />
                        <span>{brand.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Выбрано: {combo.brand_ids.length} бренд(ов)
                  </p>
                </div>

                <div className="mb-3">
                  <label className="label">Метод начисления</label>
                  <select
                    value={combo.method}
                    onChange={(e) => updateBrandCombination(index, 'method', e.target.value)}
                    className="input"
                  >
                    <option value="fixed_amount_table">Таблица фиксированных сумм</option>
                    <option value="percent_of_sales">Процент от продаж</option>
                    <option value="bonus_plus_percent">Таблица фиксированных сумм + % от перевыполнения</option>
                  </select>
                </div>

                {combo.method === 'fixed_amount_table' && (
                  <div>
                    <label className="label">Диапазон выполнения (%)</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label text-xs">С какого %</label>
                        <input
                          type="number"
                          value={combo.threshold_from}
                          onChange={(e) => updateBrandCombination(index, 'threshold_from', parseInt(e.target.value))}
                          className="input"
                          min="0"
                          max="110"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">До какого %</label>
                        <input
                          type="number"
                          value={combo.threshold_to}
                          onChange={(e) => updateBrandCombination(index, 'threshold_to', parseInt(e.target.value))}
                          className="input"
                          min="0"
                          max="110"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-2">
                      💡 <strong>Совет:</strong> Скопируйте данные из Excel (столбец с суммами) и вставьте в таблицу с помощью Ctrl+V
                    </div>
                    
                    <div 
                      className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded bg-white"
                      onPaste={(e) => handlePaste(e, 'combination', index, combo)}
                      tabIndex={0}
                    >
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold border-b">Процент выполнения</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold border-b">Сумма начисления ({CURRENCY})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: combo.threshold_to - combo.threshold_from + 1 }, (_, i) => combo.threshold_from + i).map(percent => (
                            <tr key={percent} className="hover:bg-gray-50 border-b">
                              <td className="px-3 py-2 text-sm font-medium">{percent}%</td>
                              <td className="px-3 py-1">
                                <input
                                  type="number"
                                  value={combo.amounts?.[percent] || 0}
                                  onChange={(e) => {
                                    const newConfig = { ...formData.motivation_config };
                                    if (!newConfig.brand_combinations[index].amounts) {
                                      newConfig.brand_combinations[index].amounts = {};
                                    }
                                    newConfig.brand_combinations[index].amounts[percent] = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, motivation_config: newConfig });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                  step="1000"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {combo.method === 'bonus_plus_percent' && (
                  <div>
                    <label className="label">Диапазон выполнения (%)</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label text-xs">С какого %</label>
                        <input
                          type="number"
                          value={combo.threshold_from}
                          onChange={(e) => updateBrandCombination(index, 'threshold_from', parseInt(e.target.value))}
                          className="input"
                          min="0"
                          max="110"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">До какого %</label>
                        <input
                          type="number"
                          value={combo.threshold_to}
                          onChange={(e) => updateBrandCombination(index, 'threshold_to', parseInt(e.target.value))}
                          className="input"
                          min="0"
                          max="110"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-2">
                      💡 <strong>Совет:</strong> Скопируйте данные из Excel (столбец с суммами) и вставьте в таблицу с помощью Ctrl+V
                    </div>
                    
                    <div 
                      className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded bg-white"
                      onPaste={(e) => handlePaste(e, 'brand_combination', index, combo)}
                      tabIndex={0}
                    >
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold border-b">Процент выполнения</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold border-b">Сумма начисления ({CURRENCY})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(
                            { length: (combo.threshold_to - combo.threshold_from + 1) },
                            (_, i) => combo.threshold_from + i
                          ).map(percent => (
                            <tr key={percent} className="hover:bg-gray-50">
                              <td className="px-3 py-2 border-b text-sm font-medium">{percent}%</td>
                              <td className="px-3 py-2 border-b">
                                <input
                                  type="number"
                                  value={combo.amounts?.[percent] || 0}
                                  onChange={(e) => {
                                    const newConfig = { ...formData.motivation_config };
                                    if (!newConfig.brand_combinations[index].amounts) {
                                      newConfig.brand_combinations[index].amounts = {};
                                    }
                                    newConfig.brand_combinations[index].amounts[percent] = parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, motivation_config: newConfig });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                  step="1000"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <label className="label font-semibold mb-2">Процент от перевыполнения (свыше 100%)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={combo.percent_of_excess || 3}
                          onChange={(e) => updateBrandCombination(index, 'percent_of_excess', parseFloat(e.target.value))}
                          className="input w-32"
                          step="0.1"
                        />
                        <span className="text-gray-600">% от суммы перевыполнения (Факт - План)</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Пример: При плане 10 000 000 и факте 12 000 000, перевыполнение = 2 000 000. 
                        При {combo.percent_of_excess || 3}% начисление = 2 000 000 × {combo.percent_of_excess || 3}% = {(2000000 * (combo.percent_of_excess || 3) / 100).toLocaleString('ru-RU')} {CURRENCY}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Начисление за все бренды вместе */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Начисление за все бренды вместе</h2>
            <button
              type="button"
              onClick={toggleAllBrandsRule}
              className={`btn ${formData.motivation_config?.all_brands ? 'btn-secondary' : 'btn-primary'} flex items-center space-x-2`}
            >
              {formData.motivation_config?.all_brands ? (
                <>
                  <X size={18} />
                  <span>Отключить</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Включить</span>
                </>
              )}
            </button>
          </div>
          
          {formData.motivation_config?.all_brands && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="mb-3">
                <label className="label">Метод начисления</label>
                <select
                  value={formData.motivation_config.all_brands.method}
                  onChange={(e) => updateAllBrandsRule('method', e.target.value)}
                  className="input"
                >
                  <option value="fixed_amount_table">Таблица фиксированных сумм</option>
                  <option value="percent_of_sales">Процент от продаж</option>
                  <option value="bonus_plus_percent">Таблица фиксированных сумм + % от перевыполнения</option>
                </select>
              </div>

              {formData.motivation_config.all_brands.method === 'fixed_amount_table' && (
                <div>
                  <label className="label">Диапазон выполнения (%)</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label text-xs">С какого %</label>
                      <input
                        type="number"
                        value={formData.motivation_config.all_brands.threshold_from}
                        onChange={(e) => updateAllBrandsRule('threshold_from', parseInt(e.target.value))}
                        className="input"
                        min="0"
                        max="110"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">До какого %</label>
                      <input
                        type="number"
                        value={formData.motivation_config.all_brands.threshold_to}
                        onChange={(e) => updateAllBrandsRule('threshold_to', parseInt(e.target.value))}
                        className="input"
                        min="0"
                        max="110"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-2">
                    💡 <strong>Совет:</strong> Скопируйте данные из Excel (столбец с суммами) и вставьте в таблицу с помощью Ctrl+V
                  </div>
                  
                  <div 
                    className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded bg-white"
                    onPaste={(e) => handlePaste(e, 'all_brands', null, formData.motivation_config.all_brands)}
                    tabIndex={0}
                  >
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-semibold border-b">Процент выполнения</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold border-b">Сумма начисления ({CURRENCY})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ 
                          length: formData.motivation_config.all_brands.threshold_to - formData.motivation_config.all_brands.threshold_from + 1 
                        }, (_, i) => formData.motivation_config.all_brands.threshold_from + i).map(percent => (
                          <tr key={percent} className="hover:bg-gray-50 border-b">
                            <td className="px-3 py-2 text-sm font-medium">{percent}%</td>
                            <td className="px-3 py-1">
                              <input
                                type="number"
                                value={formData.motivation_config.all_brands.amounts?.[percent] || 0}
                                onChange={(e) => {
                                  const newConfig = { ...formData.motivation_config };
                                  if (!newConfig.all_brands.amounts) {
                                    newConfig.all_brands.amounts = {};
                                  }
                                  newConfig.all_brands.amounts[percent] = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, motivation_config: newConfig });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                step="1000"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {formData.motivation_config.all_brands.method === 'bonus_plus_percent' && (
                <div>
                  <label className="label">Диапазон выполнения (%)</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label text-xs">С какого %</label>
                      <input
                        type="number"
                        value={formData.motivation_config.all_brands.threshold_from}
                        onChange={(e) => updateAllBrandsRule('threshold_from', parseInt(e.target.value))}
                        className="input"
                        min="0"
                        max="110"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">До какого %</label>
                      <input
                        type="number"
                        value={formData.motivation_config.all_brands.threshold_to}
                        onChange={(e) => updateAllBrandsRule('threshold_to', parseInt(e.target.value))}
                        className="input"
                        min="0"
                        max="110"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-2">
                    💡 <strong>Совет:</strong> Скопируйте данные из Excel (столбец с суммами) и вставьте в таблицу с помощью Ctrl+V
                  </div>
                  
                  <div 
                    className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded bg-white"
                    onPaste={(e) => handlePaste(e, 'all_brands', null, formData.motivation_config.all_brands)}
                    tabIndex={0}
                  >
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-semibold border-b">Процент выполнения</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold border-b">Сумма начисления ({CURRENCY})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(
                          { length: (formData.motivation_config.all_brands.threshold_to - formData.motivation_config.all_brands.threshold_from + 1) },
                          (_, i) => formData.motivation_config.all_brands.threshold_from + i
                        ).map(percent => (
                          <tr key={percent} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b text-sm font-medium">{percent}%</td>
                            <td className="px-3 py-2 border-b">
                              <input
                                type="number"
                                value={formData.motivation_config.all_brands.amounts?.[percent] || 0}
                                onChange={(e) => {
                                  const newConfig = { ...formData.motivation_config };
                                  if (!newConfig.all_brands.amounts) {
                                    newConfig.all_brands.amounts = {};
                                  }
                                  newConfig.all_brands.amounts[percent] = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, motivation_config: newConfig });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                step="1000"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <label className="label font-semibold mb-2">Процент от перевыполнения (свыше 100%)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formData.motivation_config.all_brands.percent_of_excess || 3}
                        onChange={(e) => updateAllBrandsRule('percent_of_excess', parseFloat(e.target.value))}
                        className="input w-32"
                        step="0.1"
                      />
                      <span className="text-gray-600">% от суммы перевыполнения (Факт - План)</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Пример: При плане 10 000 000 и факте 12 000 000, перевыполнение = 2 000 000. 
                      При {formData.motivation_config.all_brands.percent_of_excess || 3}% начисление = 2 000 000 × {formData.motivation_config.all_brands.percent_of_excess || 3}% = {(2000000 * (formData.motivation_config.all_brands.percent_of_excess || 3) / 100).toLocaleString('ru-RU')} {CURRENCY}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/settings?tab=rules')}
            className="btn btn-secondary"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Save size={18} />
            <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default SalaryRuleForm;
