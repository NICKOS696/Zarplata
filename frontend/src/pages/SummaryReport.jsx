import React, { useState, useEffect } from 'react';
import { employeesAPI, brandsAPI, kpiTypesAPI, salesPlansAPI, salesFactsAPI, reservedOrdersAPI, territoriesAPI, salaryRulesAPI, workCalendarAPI, attendanceAPI, telegramAPI, timesheetAPI, bonusesAPI } from '../services/api';
import { FileText, Calendar, Send, UserCheck, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CURRENCY } from '../config';
import { useAuth } from '../contexts/AuthContext';
import XLSX from 'xlsx-js-style';

function SummaryReport() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [kpiTypes, setKpiTypes] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [salaryRules, setSalaryRules] = useState([]);
  const [workCalendar, setWorkCalendar] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [facts, setFacts] = useState([]);
  const [reservedOrders, setReservedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filling, setFilling] = useState(false);
  
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  
  // Фильтры
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  
  const periodStart = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
  const periodEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empsRes, brandsRes, kpisRes, territoriesRes, rulesRes, plansRes, factsRes, attRes, reservedRes, bonusesRes] = await Promise.all([
        employeesAPI.getAll(),
        brandsAPI.getAll(),
        kpiTypesAPI.getAll(),
        territoriesAPI.getAll(),
        salaryRulesAPI.getAll(),
        salesPlansAPI.getAll({ period_start: periodStart, period_end: periodEnd }),
        salesFactsAPI.getAll({ date_from: periodStart, date_to: periodEnd }),
        attendanceAPI.getAll({ year: selectedYear, month: selectedMonth }),
        reservedOrdersAPI.getAll({ date_from: periodStart, date_to: periodEnd }),
        bonusesAPI.getAll({ date_from: periodStart, date_to: periodEnd }),
      ]);
      setEmployees(empsRes.data);
      setBrands(brandsRes.data);
      setKpiTypes(kpisRes.data);
      setTerritories(territoriesRes.data);
      setSalaryRules(rulesRes.data);
      setPlans(plansRes.data);
      setFacts(factsRes.data);
      setAttendance(attRes.data);
      setReservedOrders(reservedRes.data);
      setBonuses(bonusesRes.data);
      
      // Собираем активные бренды и KPI из мотивационных сеток
      const motivatedBrandIds = new Set();
      const motivatedKpiIds = new Set();
      
      rulesRes.data.forEach(rule => {
        if (rule.motivation_config) {
          if (rule.motivation_config.brands) {
            Object.keys(rule.motivation_config.brands).forEach(brandId => {
              motivatedBrandIds.add(parseInt(brandId));
            });
          }
          if (rule.motivation_config.kpis) {
            Object.keys(rule.motivation_config.kpis).forEach(kpiId => {
              motivatedKpiIds.add(parseInt(kpiId));
            });
          }
        }
      });
      
      console.log('Мотивированные бренды:', Array.from(motivatedBrandIds));
      console.log('Мотивированные KPI:', Array.from(motivatedKpiIds));
      
      // Загружаем производственный календарь
      try {
        const calRes = await workCalendarAPI.getByYearMonth(selectedYear, selectedMonth);
        setWorkCalendar(calRes.data);
      } catch (error) {
        console.warn('Производственный календарь не найден');
        setWorkCalendar(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEmployeeData = (employee, allCombinations = [], activeBrands = [], activeKpiTypes = []) => {
    // Определяем, является ли сотрудник руководителем (супервайзер или менеджер)
    const isLeader = employee.position === 'supervisor' || employee.position === 'manager';
    
    // Получаем команду сотрудника
    let teamEmployeeIds = [employee.id];
    if (isLeader) {
      if (employee.position === 'supervisor') {
        // Для супервайзера - все агенты, у которых он супервайзер
        const teamAgents = employees.filter(e => e.supervisor_id === employee.id);
        teamEmployeeIds = teamAgents.map(e => e.id);
      } else if (employee.position === 'manager') {
        // Для менеджера - все супервайзеры и их агенты
        const teamSupervisors = employees.filter(e => e.manager_id === employee.id);
        const supervisorIds = teamSupervisors.map(e => e.id);
        const teamAgents = employees.filter(e => supervisorIds.includes(e.supervisor_id));
        teamEmployeeIds = [...supervisorIds, ...teamAgents.map(e => e.id)];
      }
    }
    
    // Планы и факты сотрудника (или его команды для руководителей)
    const employeePlans = plans.filter(p => teamEmployeeIds.includes(p.employee_id));
    const employeeFacts = facts.filter(f => teamEmployeeIds.includes(f.employee_id));

    // Данные по брендам (суммируем для команды) - только активные бренды
    const brandData = activeBrands.map(brand => {
      const plan = employeePlans
        .filter(p => p.brand_id === brand.id)
        .reduce((sum, p) => sum + p.plan_value, 0);
      const fact = employeeFacts
        .filter(f => f.brand_id === brand.id)
        .reduce((sum, f) => sum + f.fact_value, 0);
      const percent = plan > 0 ? (fact / plan) * 100 : 0;
      
      return { brand, plan, fact, percent };
    });
    
    // Данные по KPI (суммируем для команды) - только активные KPI
    const kpiData = activeKpiTypes.map(kpi => {
      const plan = employeePlans
        .filter(p => p.kpi_type_id === kpi.id)
        .reduce((sum, p) => sum + p.plan_value, 0);
      const fact = employeeFacts
        .filter(f => f.kpi_type_id === kpi.id)
        .reduce((sum, f) => sum + f.fact_value, 0);
      const percent = plan > 0 ? (fact / plan) * 100 : 0;
      
      return { kpi, plan, fact, percent };
    });
    
    console.log(`${employee.full_name}: brands=${brandData.length}, kpi=${kpiData.length}`);

    // Получаем правило зарплаты сотрудника
    const salaryRule = salaryRules.find(r => r.id === employee.salary_rule_id);
    
    // Отладка: выводим motivation_config один раз для первого сотрудника
    if (employee.id === employees[0]?.id && salaryRule?.motivation_config) {
      console.log('=== Полная структура motivation_config ===');
      console.log('brand_combinations:', salaryRule.motivation_config.brand_combinations);
      if (salaryRule.motivation_config.brand_combinations?.[0]) {
        console.log('Первая комбинация:', salaryRule.motivation_config.brand_combinations[0]);
        console.log('brand_ids в комбинации:', salaryRule.motivation_config.brand_combinations[0].brand_ids);
        console.log('amounts в комбинации:', salaryRule.motivation_config.brand_combinations[0].amounts);
      }
      console.log('all_brands:', salaryRule.motivation_config.all_brands);
    }

    // Общие итоги (только по брендам, без KPI)
    const totalPlan = employeePlans
      .filter(p => p.brand_id !== null)
      .reduce((sum, p) => sum + p.plan_value, 0);
    const totalFact = employeeFacts
      .filter(f => f.brand_id !== null)
      .reduce((sum, f) => sum + f.fact_value, 0);
    const totalPercent = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;
    
    // Резервные заказы сотрудника (или его команды для руководителей)
    const totalReserved = reservedOrders
      .filter(r => teamEmployeeIds.includes(r.employee_id))
      .reduce((sum, r) => sum + r.reserved_value, 0);

    // Расчет начисления для одного правила
    const calculateSingleRuleAccrual = (rule, percent, itemId) => {
      const method = rule.method || 'fixed_amount_table';
      
      // Метод: Таблица фиксированных сумм
      if (method === 'fixed_amount_table') {
        if (rule.amounts && typeof rule.amounts === 'object') {
          const roundedPercent = Math.floor(percent);
          const from = rule.threshold_from || 0;
          const to = rule.threshold_to || Infinity;
          
          if (roundedPercent < from) return 0;
          if (roundedPercent > to) return rule.amounts[to] || 0;
          
          return rule.amounts[roundedPercent] || 0;
        }
      }
      
      // Метод: Процент от продаж
      if (method === 'percent_of_sales') {
        const from = rule.threshold_from || 0;
        const to = rule.threshold_to || 999;
        const salesPercent = rule.percent || 0;
        
        // Проверяем, попадает ли процент выполнения в диапазон
        if (percent >= from && percent <= to) {
          // Находим факт продаж для этого бренда
          const brandIndex = brandData.findIndex(b => b.brand.id === itemId);
          if (brandIndex >= 0) {
            const fact = brandData[brandIndex].fact;
            return fact * (salesPercent / 100);
          }
        }
        return 0;
      }
      
      // Метод: Таблица + процент от перевыполнения
      if (method === 'bonus_plus_percent') {
        let amount = 0;
        
        // Фиксированная сумма из таблицы
        if (rule.amounts && typeof rule.amounts === 'object') {
          const roundedPercent = Math.floor(percent);
          const from = rule.threshold_from || 70;
          const to = rule.threshold_to || 100;
          
          if (roundedPercent >= from) {
            if (roundedPercent > to) {
              amount = rule.amounts[to] || 0;
            } else {
              amount = rule.amounts[roundedPercent] || 0;
            }
          }
        }
        
        // Процент от перевыполнения (свыше 100%)
        if (percent > 100) {
          const brandIndex = brandData.findIndex(b => b.brand.id === itemId);
          if (brandIndex >= 0) {
            const plan = brandData[brandIndex].plan;
            const fact = brandData[brandIndex].fact;
            const excess = fact - plan;
            const percentOfExcess = rule.percent_of_excess || 0;
            amount += excess * (percentOfExcess / 100);
          }
        }
        
        return amount;
      }
      
      return 0;
    };
    
    // Расчет начислений на основе мотивационной сетки из правила зарплаты
    const calculateAccrualFromRule = (percent, brandId, kpiId) => {
      if (!salaryRule?.motivation_config) {
        console.log('Нет motivation_config для сотрудника', employee.full_name);
        return null; // null означает "нет мотивационной сетки"
      }
      
      const config = salaryRule.motivation_config;
      
      // Определяем, какие правила использовать
      if (brandId && config.brands) {
        const brandRules = config.brands[brandId];
        if (!brandRules) return null;
        
        // Поддержка массива правил (новый формат) и одного объекта (старый формат)
        const rulesList = Array.isArray(brandRules) ? brandRules : [brandRules];
        
        let totalAccrual = 0;
        
        // Проходим по всем правилам для этого бренда
        for (const rule of rulesList) {
          const accrual = calculateSingleRuleAccrual(rule, percent, brandId);
          if (accrual !== null) {
            totalAccrual += accrual;
          }
        }
        
        return totalAccrual > 0 ? totalAccrual : null;
      } else if (kpiId && config.kpis) {
        const kpiRule = config.kpis[kpiId];
        if (!kpiRule) return null;
        
        // Для KPI используем ту же логику, что и для брендов
        const accrual = calculateSingleRuleAccrual(kpiRule, percent, kpiId);
        return accrual > 0 ? accrual : null;
      }
      
      return null;
    };

    const brandAccruals = brandData.map(b => {
      const accrual = calculateAccrualFromRule(b.percent, b.brand.id, null);
      console.log(`Начисление для бренда ${b.brand.name}: ${accrual}`);
      return accrual;
    });
    const kpiAccruals = kpiData.map(k => {
      const accrual = calculateAccrualFromRule(k.percent, null, k.kpi.id);
      console.log(`Начисление для KPI ${k.kpi.name}: ${accrual}`);
      return accrual;
    });
    
    // Проверяем комбинированные начисления и собираем данные
    let combinationAccrual = 0;
    const combinationData = [];
    console.log('Проверка комбинаций для', employee.full_name);
    console.log('Все комбинации:', allCombinations);
    console.log('Комбинации сотрудника:', salaryRule?.motivation_config?.brand_combinations);
    
    // Обрабатываем ВСЕ комбинации, но проверяем, есть ли она у сотрудника
    for (const globalCombo of allCombinations) {
      // Проверяем, есть ли эта комбинация у сотрудника
      const comboKey = globalCombo.brand_ids.slice().sort().join(',');
      const employeeCombo = salaryRule?.motivation_config?.brand_combinations?.find(c => {
        const empComboKey = c.brand_ids.slice().sort().join(',');
        return empComboKey === comboKey;
      });
      
      if (employeeCombo) {
        // У сотрудника есть эта комбинация - рассчитываем
        const combo = employeeCombo;
        console.log('Проверяем комбинацию:', combo);
        console.log('Бренды в комбинации:', combo.brand_ids);
        
        // Проверяем, выполнены ли все бренды из комбинации (с планом > 0)
        const brandChecks = combo.brand_ids.map(brandId => {
          const brandIndex = brandData.findIndex(b => b.brand.id === brandId);
          const brand = brandData[brandIndex];
          const hasPlan = brand && brand.plan > 0;
          const isCompleted = brandIndex >= 0 && (!hasPlan || brand.percent >= (combo.threshold_from || 0));
          console.log(`  Бренд ID ${brandId}: найден=${brandIndex >= 0}, план=${brand?.plan || 0}, процент=${brand?.percent || 0}, порог=${combo.threshold_from}, выполнен=${isCompleted}`);
          return isCompleted;
        });
        
        const allBrandsCompleted = brandChecks.every(check => check);
        console.log('Все бренды комбинации выполнены:', allBrandsCompleted);
        
        // Рассчитываем план, факт и % для комбинации
        const comboPlan = combo.brand_ids.reduce((sum, brandId) => {
          const brandIndex = brandData.findIndex(b => b.brand.id === brandId);
          return sum + (brandData[brandIndex]?.plan || 0);
        }, 0);
        
        const comboFact = combo.brand_ids.reduce((sum, brandId) => {
          const brandIndex = brandData.findIndex(b => b.brand.id === brandId);
          return sum + (brandData[brandIndex]?.fact || 0);
        }, 0);
        
        const comboPercent = comboPlan > 0 ? (comboFact / comboPlan) * 100 : 0;
        
        let comboAccrual = 0;
        
        if (allBrandsCompleted && combo.amounts) {
          // Берем минимальный процент из брендов комбинации, у которых есть план
          const brandsWithPlan = combo.brand_ids
            .map(brandId => {
              const brandIndex = brandData.findIndex(b => b.brand.id === brandId);
              return brandData[brandIndex];
            })
            .filter(brand => brand && brand.plan > 0);
          
          if (brandsWithPlan.length > 0) {
            const minPercent = Math.min(...brandsWithPlan.map(b => b.percent));
            
            const roundedPercent = Math.floor(minPercent);
            const to = combo.threshold_to || Infinity;
            const accrual = roundedPercent > to ? combo.amounts[to] : combo.amounts[roundedPercent];
            
            console.log(`Минимальный процент: ${minPercent}, округленный: ${roundedPercent}, начисление: ${accrual}`);
            
            if (accrual) {
              comboAccrual = accrual;
              combinationAccrual += accrual;
              console.log(`✓ Комбинация брендов выполнена! Минимальный %: ${roundedPercent}%, начисление: ${accrual}`);
            }
          } else {
            console.log('Нет брендов с планом в комбинации');
          }
        }
        
        // Сохраняем данные комбинации
        combinationData.push({
          plan: comboPlan,
          fact: comboFact,
          percent: comboPercent,
          accrual: comboAccrual
        });
      } else {
        // У сотрудника нет этой комбинации - показываем null
        combinationData.push({
          plan: null,
          fact: null,
          percent: null,
          accrual: null
        });
      }
    }
    
    // Проверяем общее начисление за все бренды
    let allBrandsAccrual = 0;
    console.log('Проверка all_brands для', employee.full_name);
    console.log('all_brands config:', salaryRule?.motivation_config?.all_brands);
    
    if (salaryRule?.motivation_config?.all_brands?.amounts) {
      const allBrandsRule = salaryRule.motivation_config.all_brands;
      
      // Фильтруем бренды с планом > 0
      const brandsWithPlan = brandData.filter(b => b.plan > 0);
      console.log('Бренды с планом:', brandsWithPlan.map(b => ({ name: b.brand.name, plan: b.plan, percent: b.percent })));
      
      if (brandsWithPlan.length > 0) {
        // Проверяем, выполнены ли все бренды с планом
        const allBrandsCompleted = brandsWithPlan.every(b => b.percent >= (allBrandsRule.threshold_from || 0));
        
        console.log(`Проверка all_brands: брендов с планом=${brandsWithPlan.length}, порог=${allBrandsRule.threshold_from}, все выполнены=${allBrandsCompleted}`);
        
        if (allBrandsCompleted) {
          // Берем минимальный процент из брендов с планом
          const minPercent = Math.min(...brandsWithPlan.map(b => b.percent));
          const roundedPercent = Math.floor(minPercent);
          const to = allBrandsRule.threshold_to || Infinity;
          
          console.log(`Минимальный процент: ${minPercent}, округленный: ${roundedPercent}, amounts:`, allBrandsRule.amounts);
          
          let accrual = 0;
          
          // Если процент выше максимума - берем максимальное значение
          if (roundedPercent > to) {
            accrual = allBrandsRule.amounts[to];
          } else if (allBrandsRule.amounts[roundedPercent]) {
            // Если есть точное значение - берем его
            accrual = allBrandsRule.amounts[roundedPercent];
          } else {
            // Если нет точного значения - ищем ближайшее меньшее
            const availablePercents = Object.keys(allBrandsRule.amounts)
              .map(Number)
              .filter(p => p <= roundedPercent)
              .sort((a, b) => b - a);
            
            if (availablePercents.length > 0) {
              const closestPercent = availablePercents[0];
              accrual = allBrandsRule.amounts[closestPercent];
              console.log(`Нет значения для ${roundedPercent}%, используем ближайшее меньшее: ${closestPercent}% = ${accrual}`);
            }
          }
          
          console.log(`Начисление для ${roundedPercent}%:`, accrual);
          
          if (accrual) {
            allBrandsAccrual = accrual;
            console.log(`✓ Все бренды выполнены! Минимальный %: ${roundedPercent}%, начисление: ${accrual}`);
          } else {
            console.log('❌ Начисление не найдено для процента', roundedPercent);
          }
        }
      } else {
        console.log('Нет брендов с планом > 0');
      }
    } else {
      console.log('Нет all_brands.amounts в конфигурации');
    }
    
    const totalAccrual = [...brandAccruals, ...kpiAccruals]
      .filter(a => a !== null) // Игнорируем null (бренды/KPI не в мотивационной сетке)
      .reduce((sum, a) => sum + a, 0) + combinationAccrual + allBrandsAccrual;
    console.log(`Общее начисление для ${employee.full_name}:`, totalAccrual, 'brandAccruals:', brandAccruals, 'kpiAccruals:', kpiAccruals, 'combination:', combinationAccrual, 'allBrands:', allBrandsAccrual);

    // Фиксированные части (из правила зарплаты сотрудника)
    const baseTravelAllowance = salaryRule?.travel_allowance || 0;
    
    // Получаем данные табеля для пересчета пропорционально отработанным дням
    const employeeAttendance = attendance.find(a => a.employee_id === employee.id);
    const daysWorked = employeeAttendance?.days_worked || 0;
    const workingDays = workCalendar?.working_days || 22; // По умолчанию 22 дня
    const orderCount = employeeAttendance?.order_count || 0; // Количество заявок из табеля
    
    // Определяем базовый оклад в зависимости от типа (классический или грейдовый)
    let baseSalary = salaryRule?.fixed_salary || 0;
    let currentGrade = null; // Текущий грейд сотрудника
    
    if (salaryRule?.fixed_salary_type === 'graded') {
      // Грейдовая система - определяем грейд по условиям
      // Проверяем от высшего к низшему: Эксперт → Профессионал → Стажер
      
      const checkCondition = (condition, threshold, orderCount, totalPercent) => {
        if (condition === 'percent') {
          return totalPercent >= threshold;
        } else {
          // orders
          return orderCount >= threshold;
        }
      };
      
      // Эксперт
      if (checkCondition(
        salaryRule.grade_expert_condition,
        salaryRule.grade_expert_threshold,
        orderCount,
        totalPercent
      )) {
        baseSalary = salaryRule.grade_expert_salary || 0;
        currentGrade = 'expert';
      }
      // Профессионал
      else if (checkCondition(
        salaryRule.grade_professional_condition,
        salaryRule.grade_professional_threshold,
        orderCount,
        totalPercent
      )) {
        baseSalary = salaryRule.grade_professional_salary || 0;
        currentGrade = 'professional';
      }
      // Стажер
      else if (checkCondition(
        salaryRule.grade_trainee_condition,
        salaryRule.grade_trainee_threshold,
        orderCount,
        totalPercent
      )) {
        baseSalary = salaryRule.grade_trainee_salary || 0;
        currentGrade = 'trainee';
      }
      // Не выполнил ни одно условие - 0
      else {
        baseSalary = 0;
        currentGrade = 'none';
      }
    }
    
    // Пересчитываем фиксу и дорожные пропорционально отработанным дням
    const attendanceRatio = workingDays > 0 ? daysWorked / workingDays : 1;
    const fixedSalary = Math.round(baseSalary * attendanceRatio);
    const travelAllowance = Math.round(baseTravelAllowance * attendanceRatio);
    
    // Считаем бонусы из табеля для этого сотрудника
    const employeeBonuses = bonuses
      .filter(b => b.employee_id === employee.id)
      .reduce((sum, b) => sum + b.amount, 0);
    const bonus = employeeBonuses;

    return {
      employee,
      territory: territories.find(t => t.id === employee.territory_id),
      fixedSalary,
      travelAllowance,
      bonus,
      daysWorked,
      workingDays,
      orderCount,
      brandData,
      kpiData,
      brandAccruals,
      kpiAccruals,
      combinationData,
      combinationAccrual,
      allBrandsAccrual,
      totalPlan,
      totalFact,
      totalPercent,
      totalReserved,
      totalAccrual,
    };
  };

  // Функция для получения названия менеджера с территорией
  const getManagerDisplayName = (manager) => {
    const territory = territories.find(t => t.id === manager.territory_id);
    const territoryName = territory ? territory.name : 'Без территории';
    return `${manager.full_name}  ·  ${territoryName}`;
  };
  
  // Функция для получения названия супервайзера с территорией
  const getSupervisorDisplayName = (supervisor) => {
    const territory = territories.find(t => t.id === supervisor.territory_id);
    const territoryName = territory ? territory.name : 'Без территории';
    return `${supervisor.full_name}  ·  ${territoryName}`;
  };
  
  // Функция для получения доступных менеджеров
  const getAvailableManagers = () => {
    return employees.filter(e => e.position === 'manager');
  };
  
  // Функция для получения доступных супервайзеров с учетом выбранного менеджера
  const getAvailableSupervisors = () => {
    let supervisors = employees.filter(e => e.position === 'supervisor');
    
    // Если выбран менеджер, показываем только супервайзеров этого менеджера
    if (selectedManager) {
      const managerId = parseInt(selectedManager);
      supervisors = supervisors.filter(s => s.manager_id === managerId);
    }
    
    return supervisors;
  };
  
  // Функция фильтрации сотрудников по иерархии
  const filterEmployeesByHierarchy = (emps) => {
    // Сначала фильтруем по дате увольнения
    // Показываем сотрудника если:
    // 1. Он активен (is_active = true), ИЛИ
    // 2. Он уволен, но дата увольнения >= первый день выбранного месяца (работал в этом месяце)
    const periodFirstDay = new Date(selectedYear, selectedMonth - 1, 1);
    
    let filtered = emps.filter(emp => {
      // Активные сотрудники всегда показываются
      if (emp.is_active) return true;
      
      // Уволенные сотрудники показываются только если работали в выбранном месяце
      if (emp.termination_date) {
        const terminationDate = new Date(emp.termination_date);
        // Показываем если дата увольнения >= первый день месяца
        return terminationDate >= periodFirstDay;
      }
      
      // Неактивные без даты увольнения - не показываем
      return false;
    });
    
    // Фильтр по менеджеру
    if (selectedManager) {
      const managerId = parseInt(selectedManager);
      // Показываем: менеджера + всех его супервайзеров + всех агентов супервайзеров
      const supervisors = emps.filter(e => e.manager_id === managerId);
      const supervisorIds = supervisors.map(s => s.id);
      const agents = emps.filter(e => supervisorIds.includes(e.supervisor_id));
      
      filtered = filtered.filter(emp => 
        emp.id === managerId || 
        supervisorIds.includes(emp.id) || 
        agents.some(a => a.id === emp.id)
      );
    }
    
    // Фильтр по супервайзеру
    if (selectedSupervisor) {
      const supervisorId = parseInt(selectedSupervisor);
      // Показываем: супервайзера + всех его агентов
      const agents = emps.filter(e => e.supervisor_id === supervisorId);
      
      filtered = filtered.filter(emp => 
        emp.id === supervisorId || 
        agents.some(a => a.id === emp.id)
      );
    }
    
    return filtered;
  };
  
  // Сортируем сотрудников: сначала по порядку территории, потом по должности (agent -> supervisor -> manager)
  const positionOrder = { agent: 1, supervisor: 2, manager: 3 };
  const filteredEmployees = filterEmployeesByHierarchy(employees);
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const territoryA = territories.find(t => t.id === a.territory_id);
    const territoryB = territories.find(t => t.id === b.territory_id);
    
    // Сортируем по порядку территории (sort_order)
    const orderA = territoryA?.sort_order ?? 999;
    const orderB = territoryB?.sort_order ?? 999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Если территории одинаковые (или порядок одинаковый), сортируем по должности
    return (positionOrder[a.position] || 999) - (positionOrder[b.position] || 999);
  });

  // Собираем уникальные бренды, KPI и комбинации из всех мотивационных сеток
  const motivatedBrandIds = new Set();
  const motivatedKpiIds = new Set();
  const allCombinations = [];
  let hasAnyAllBrandsRule = false;
  
  salaryRules.forEach(rule => {
    if (rule.motivation_config) {
      // Добавляем бренды из brands
      if (rule.motivation_config.brands) {
        Object.keys(rule.motivation_config.brands).forEach(brandId => {
          motivatedBrandIds.add(parseInt(brandId));
        });
      }
      // Добавляем KPI из kpis
      if (rule.motivation_config.kpis) {
        Object.keys(rule.motivation_config.kpis).forEach(kpiId => {
          motivatedKpiIds.add(parseInt(kpiId));
        });
      }
      // Собираем все комбинации
      if (rule.motivation_config.brand_combinations) {
        rule.motivation_config.brand_combinations.forEach(combo => {
          // Проверяем, есть ли уже такая комбинация (по набору brand_ids)
          const comboKey = combo.brand_ids.slice().sort().join(',');
          if (!allCombinations.find(c => c.key === comboKey)) {
            allCombinations.push({
              key: comboKey,
              brand_ids: combo.brand_ids,
              ...combo
            });
          }
        });
      }
      // Проверяем наличие all_brands
      if (rule.motivation_config.all_brands) {
        hasAnyAllBrandsRule = true;
      }
    }
  });
  
  // Фильтруем бренды и KPI - показываем только те, что есть в мотивационных сетках
  const activeBrands = brands.filter(b => motivatedBrandIds.has(b.id));
  const activeKpiTypes = kpiTypes.filter(k => motivatedKpiIds.has(k.id));
  
  console.log('Активные бренды:', activeBrands.map(b => b.name));
  console.log('Активные KPI:', activeKpiTypes.map(k => k.name));
  console.log('Все комбинации:', allCombinations);
  
  const brandCombinations = allCombinations;
  const hasAllBrandsRule = hasAnyAllBrandsRule;

  const reportData = sortedEmployees.map(emp => calculateEmployeeData(emp, brandCombinations, activeBrands, activeKpiTypes));

  // Функция для получения названия месяца
  const getMonthName = (month) => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month - 1];
  };

  // Функция для определения цвета строки по должности (строгий деловой стиль)
  const getRowBackgroundClass = (position) => {
    switch (position) {
      case 'manager':
        return 'bg-slate-100 hover:bg-slate-200';
      case 'supervisor':
        return 'bg-gray-50 hover:bg-gray-100';
      case 'agent':
        return 'bg-white hover:bg-gray-50';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

  const handleFillFromTimesheet = async () => {
    if (!window.confirm(`Заполнить посещаемость по табелю за ${selectedMonth}.${selectedYear}?\n\nБудут рассчитаны рабочие дни с учетом:\n- Даты приема\n- Пропусков\n- Стажировки\n- Текущей даты`)) {
      return;
    }

    try {
      setFilling(true);
      const response = await timesheetAPI.calculateAttendance(selectedYear, selectedMonth);
      console.log('Результат расчета:', response.data);
      
      // Обновляем attendance данные для каждого сотрудника
      const calculatedData = response.data.employees;
      
      // Создаем или обновляем записи посещаемости через API
      let updatedCount = 0;
      let errors = [];
      
      for (const empData of calculatedData) {
        try {
          // Проверяем, есть ли уже запись посещаемости для этого сотрудника за этот месяц
          const existingAttendance = attendance.find(
            a => a.employee_id === empData.employee_id && 
                 a.year === selectedYear && 
                 a.month === selectedMonth
          );
          
          const attendanceData = {
            employee_id: empData.employee_id,
            year: selectedYear,
            month: selectedMonth,
            days_worked: empData.calculated_days
          };
          
          if (existingAttendance) {
            await attendanceAPI.update(existingAttendance.id, { days_worked: empData.calculated_days });
          } else {
            await attendanceAPI.create(attendanceData);
          }
          
          updatedCount++;
        } catch (error) {
          console.error(`Ошибка для ${empData.employee_name}:`, error);
          errors.push(`${empData.employee_name}: ${error.message}`);
        }
      }
      
      // Перезагружаем данные
      await loadData();
      
      let message = `Заполнение завершено!\n\nОбновлено сотрудников: ${updatedCount}\nВсего обработано: ${calculatedData.length}`;
      
      if (errors.length > 0) {
        message += `\n\nОшибки:\n${errors.join('\n')}`;
      }
      
      alert(message);
    } catch (error) {
      console.error('Ошибка заполнения по табелю:', error);
      alert('Ошибка при заполнении: ' + (error.response?.data?.detail || error.message));
    } finally {
      setFilling(false);
    }
  };

  const handleSendTelegramReports = async () => {
    if (!window.confirm('Отправить отчеты всем сотрудникам с Telegram ID?')) {
      return;
    }

    try {
      setSending(true);
      console.log('Отправка отчетов за:', selectedYear, selectedMonth);
      const response = await telegramAPI.sendReports(selectedYear, selectedMonth);
      console.log('Ответ сервера:', response.data);
      
      // Показываем детали ошибок, если есть
      const failedResults = response.data.results.filter(r => !r.success);
      let message = `Отправка завершена!\n\nУспешно: ${response.data.success}\nОшибок: ${response.data.failed}\nВсего: ${response.data.total}`;
      
      if (failedResults.length > 0) {
        message += '\n\nОшибки:\n';
        failedResults.forEach(r => {
          message += `\n${r.employee_name}: ${r.error || 'Неизвестная ошибка'}`;
        });
      }
      
      alert(message);
    } catch (error) {
      console.error('Ошибка отправки отчетов:', error);
      console.error('URL запроса:', error.config?.url);
      console.error('Полный URL:', error.config?.baseURL + error.config?.url);
      alert('Ошибка при отправке отчетов: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSending(false);
    }
  };

  // Экспорт в Excel с форматированием
  const handleExportToExcel = () => {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    // Стили для заголовков
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const subHeaderStyle = {
      font: { bold: true, sz: 9 },
      fill: { fgColor: { rgb: "E5E7EB" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    const cellStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    };
    
    const getPercentStyle = (percent) => {
      const p = percent || 0;
      let color = "000000";
      let bgColor = null;
      
      if (p >= 100) {
        color = "006400"; // dark green text
        bgColor = "90EE90"; // light green background
      } else if (p >= 80) {
        color = "B8860B"; // dark goldenrod text
        bgColor = "FFFFE0"; // light yellow background
      } else if (p > 0) {
        color = "8B0000"; // dark red text
        bgColor = "FFB6C1"; // light pink background
      }
      
      const style = {
        ...cellStyle,
        font: { bold: true, color: { rgb: color } }
      };
      
      if (bgColor) {
        style.fill = { fgColor: { rgb: bgColor } };
      }
      
      return style;
    };
    
    // Безопасное округление (защита от NaN)
    const safeRound = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.round(num);
    };
    
    // Собираем данные для Excel
    const wsData = [];
    
    // Заголовок отчета
    wsData.push([{ v: `Сводная таблица за ${monthNames[selectedMonth - 1]} ${selectedYear}`, s: { font: { bold: true, sz: 14 } } }]);
    wsData.push([]);
    
    // Цвета для разных групп колонок (как на скриншоте)
    const brandColors = [
      { header: "FFF3E0", sub: "FFE0B2" }, // оранжевый
      { header: "E8F5E9", sub: "C8E6C9" }, // зелёный
      { header: "E3F2FD", sub: "BBDEFB" }, // синий
      { header: "FCE4EC", sub: "F8BBD9" }, // розовый
      { header: "F3E5F5", sub: "E1BEE7" }, // фиолетовый
      { header: "E0F7FA", sub: "B2EBF2" }, // голубой
      { header: "FFF8E1", sub: "FFECB3" }, // жёлтый
      { header: "EFEBE9", sub: "D7CCC8" }, // коричневый
    ];
    
    const totalColor = { header: "E8EAF6", sub: "C5CAE9" }; // индиго для итогов
    const reserveColor = { header: "FBE9E7", sub: "FFCCBC" }; // красноватый для резерва
    const finalColor = { header: "C8E6C9", sub: "A5D6A7" }; // зелёный для итого начисление
    
    // Формируем заголовки колонок с цветами
    const headers1Row = [];
    const headers2Row = [];
    
    // Базовые колонки
    const baseHeaderStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    
    ['Сотрудник', 'Территория', 'Фикса', 'Дорожные', 'Бонус', 'Отработано'].forEach(h => {
      headers1Row.push({ v: h, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: "F5F5F5" } } } });
    });
    ['', '', 'сум', 'сум', 'сум', 'дн'].forEach(h => {
      headers2Row.push({ v: h, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: "EEEEEE" } }, font: { sz: 9 } } });
    });
    
    // Добавляем заголовки брендов с разными цветами (4 столбца: План, Факт, %, Начисл.)
    activeBrands.forEach((brand, idx) => {
      const color = brandColors[idx % brandColors.length];
      headers1Row.push({ v: brand.name, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      ['План', 'Факт', '%', 'Начисл.'].forEach(h => {
        headers2Row.push({ v: h, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.sub } }, font: { sz: 9 } } });
      });
    });
    
    // Добавляем заголовки KPI с разными цветами (4 столбца: План, Факт, %, Начисл.)
    activeKpiTypes.forEach((kpi, idx) => {
      const color = brandColors[(activeBrands.length + idx) % brandColors.length];
      headers1Row.push({ v: kpi.name, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.header } } } });
      ['План', 'Факт', '%', 'Начисл.'].forEach(h => {
        headers2Row.push({ v: h, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: color.sub } }, font: { sz: 9 } } });
      });
    });
    
    // Добавляем итоговые колонки (4 столбца: План, Факт, %, Начисл.)
    headers1Row.push({ v: 'Общий итог', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: totalColor.header } } } });
    headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: totalColor.header } } } });
    headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: totalColor.header } } } });
    headers1Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: totalColor.header } } } });
    ['План', 'Факт', '%', 'Начисл.'].forEach(h => {
      headers2Row.push({ v: h, s: { ...baseHeaderStyle, fill: { fgColor: { rgb: totalColor.sub } }, font: { sz: 9 } } });
    });
    
    // Резерв
    headers1Row.push({ v: 'Резерв', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: reserveColor.header } } } });
    headers2Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: reserveColor.sub } }, font: { sz: 9 } } });
    
    // Итого начисление
    headers1Row.push({ v: 'Итого начисление', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: finalColor.header } } } });
    headers2Row.push({ v: '', s: { ...baseHeaderStyle, fill: { fgColor: { rgb: finalColor.sub } }, font: { sz: 9 } } });
    
    // Добавляем заголовки
    wsData.push(headers1Row);
    wsData.push(headers2Row);
    
    // Функция для создания стиля ячейки с фоновым цветом
    const getCellStyleWithBg = (bgColor) => ({
      ...cellStyle,
      fill: { fgColor: { rgb: bgColor } }
    });
    
    // Добавляем данные сотрудников
    sortedEmployees.forEach(employee => {
      const data = calculateEmployeeData(employee, allCombinations, activeBrands, activeKpiTypes);
      const territory = territories.find(t => t.id === employee.territory_id);
      
      // Рассчитываем итоговое начисление
      const totalSalaryCalc = (data.fixedSalary || 0) + (data.travelAllowance || 0) + 
                              (data.bonus || 0) + (data.totalAccrual || 0);
      
      const row = [
        { v: employee.full_name, s: { ...cellStyle, alignment: { horizontal: "left" } } },
        { v: territory?.name || '-', s: cellStyle },
        { v: safeRound(data.fixedSalary), s: cellStyle },
        { v: safeRound(data.travelAllowance), s: cellStyle },
        { v: safeRound(data.bonus), s: cellStyle },
        { v: safeRound(data.daysWorked), s: cellStyle }
      ];
      
      // Данные по брендам с цветовой маркировкой (4 столбца: План, Факт, %, Начисл.)
      data.brandData.forEach((bd, idx) => {
        const color = brandColors[idx % brandColors.length];
        const brandAccrual = data.brandAccruals?.[idx] || 0;
        row.push({ v: safeRound(bd.plan), s: getCellStyleWithBg(color.sub) });
        row.push({ v: safeRound(bd.fact), s: getCellStyleWithBg(color.sub) });
        row.push({ v: `${safeRound(bd.percent)}%`, s: { ...getPercentStyle(bd.percent), fill: { fgColor: { rgb: color.sub } } } });
        row.push({ v: safeRound(brandAccrual), s: getCellStyleWithBg(color.sub) });
      });
      
      // Данные по KPI с цветовой маркировкой (4 столбца: План, Факт, %, Начисл.)
      data.kpiData.forEach((kd, idx) => {
        const color = brandColors[(activeBrands.length + idx) % brandColors.length];
        const kpiAccrual = data.kpiAccruals?.[idx] || 0;
        row.push({ v: safeRound(kd.plan), s: getCellStyleWithBg(color.sub) });
        row.push({ v: safeRound(kd.fact), s: getCellStyleWithBg(color.sub) });
        row.push({ v: `${safeRound(kd.percent)}%`, s: { ...getPercentStyle(kd.percent), fill: { fgColor: { rgb: color.sub } } } });
        row.push({ v: safeRound(kpiAccrual), s: getCellStyleWithBg(color.sub) });
      });
      
      // Итоги с цветовой маркировкой (4 столбца: План, Факт, %, Начисл.)
      row.push({ v: safeRound(data.totalPlan), s: getCellStyleWithBg(totalColor.sub) });
      row.push({ v: safeRound(data.totalFact), s: getCellStyleWithBg(totalColor.sub) });
      row.push({ v: `${safeRound(data.totalPercent)}%`, s: { ...getPercentStyle(data.totalPercent), fill: { fgColor: { rgb: totalColor.sub } } } });
      row.push({ v: safeRound(data.totalAccrual), s: getCellStyleWithBg(totalColor.sub) });
      row.push({ v: safeRound(data.totalReserved), s: getCellStyleWithBg(reserveColor.sub) });
      row.push({ v: `${safeRound(totalSalaryCalc).toLocaleString('ru-RU')} сум`, s: { ...getCellStyleWithBg(finalColor.sub), font: { bold: true } } });
      
      wsData.push(row);
    });
    
    // Создаем worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Устанавливаем ширину колонок (4 столбца для каждого бренда/KPI)
    const colWidths = [{ wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    activeBrands.forEach(() => {
      colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 });
    });
    activeKpiTypes.forEach(() => {
      colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 });
    });
    colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 18 });
    ws['!cols'] = colWidths;
    
    // Объединяем ячейки заголовков (4 столбца для каждого бренда/KPI)
    const merges = [];
    let colIndex = 6; // После первых 6 колонок
    activeBrands.forEach(() => {
      merges.push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 3 } });
      colIndex += 4;
    });
    activeKpiTypes.forEach(() => {
      merges.push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 3 } });
      colIndex += 4;
    });
    merges.push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 3 } }); // Общий итог
    ws['!merges'] = merges;
    
    // Создаем workbook и сохраняем
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Сводная таблица');
    
    const fileName = `Сводная_таблица_${monthNames[selectedMonth - 1]}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-3" size={32} />
            Сводная таблица
          </h1>
          <p className="text-gray-600 mt-1">План-факт и начисления по сотрудникам</p>
        </div>
        <div className="flex space-x-3">
          {/* Кнопки доступны только для admin */}
          {user?.role === 'admin' && (
            <>
              <button
                onClick={handleFillFromTimesheet}
                disabled={filling || loading}
                className="btn btn-success flex items-center space-x-2"
                title="Автоматически заполнить посещаемость на основе табеля"
              >
                <UserCheck size={20} />
                <span>{filling ? 'Заполнение...' : 'Заполнить по табелю'}</span>
              </button>
              <button
                onClick={handleSendTelegramReports}
                disabled={sending || loading}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Send size={20} />
                <span>{sending ? 'Отправка...' : 'Отправить в Telegram'}</span>
              </button>
            </>
          )}
          <button
            onClick={handleExportToExcel}
            disabled={loading}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
          >
            <Download size={20} />
            <span>Сохранить в Excel</span>
          </button>
        </div>
      </div>

      {/* Period and Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar size={20} className="text-gray-400" />
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
          
          {/* Фильтр по менеджеру */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Менеджер:</label>
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value);
                // Сбрасываем супервайзера при смене менеджера
                setSelectedSupervisor('');
              }}
              className="input text-sm w-96"
              style={{ color: '#374151' }}
            >
              <option value="">Все</option>
              {getAvailableManagers().map(manager => (
                <option key={manager.id} value={manager.id}>{getManagerDisplayName(manager)}</option>
              ))}
            </select>
          </div>
          
          {/* Фильтр по супервайзеру */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Супервайзер:</label>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="input text-sm w-96"
              style={{ color: '#374151' }}
            >
              <option value="">Все</option>
              {getAvailableSupervisors().map(supervisor => (
                <option key={supervisor.id} value={supervisor.id}>{getSupervisorDisplayName(supervisor)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left border">Сотрудник</th>
                <th className="px-3 py-2 text-left border">Территория</th>
                <th className="px-3 py-2 text-right border">Фикса</th>
                <th className="px-3 py-2 text-right border">Дорожные</th>
                <th className="px-3 py-2 text-right border">Бонус</th>
                <th className="px-2 py-2 text-center border">Отраб.дней</th>
                
                {/* Бренды */}
                {activeBrands.map(brand => (
                  <React.Fragment key={`brand-${brand.id}`}>
                    <th className="px-2 py-2 text-center border bg-blue-50" colSpan="4">
                      {brand.name}
                    </th>
                  </React.Fragment>
                ))}
                
                {/* KPI */}
                {activeKpiTypes.map(kpi => (
                  <React.Fragment key={`kpi-${kpi.id}`}>
                    <th className="px-2 py-2 text-center border bg-green-50" colSpan={kpi.no_plan ? "2" : "4"}>
                      {kpi.name}
                    </th>
                  </React.Fragment>
                ))}
                
                {/* Комбинации брендов */}
                {brandCombinations.map((combo, idx) => {
                  const comboNames = combo.brand_ids
                    .map(id => brands.find(b => b.id === id)?.name)
                    .filter(Boolean)
                    .join(' + ');
                  return (
                    <th key={`combo-${idx}`} className="px-2 py-2 text-center border bg-orange-50" colSpan="4">
                      {comboNames}
                    </th>
                  );
                })}
                
                {/* Общие итоги */}
                <th className="px-2 py-2 text-center border bg-yellow-50" colSpan={hasAllBrandsRule ? "4" : "3"}>
                  Общий итог
                </th>
                <th className="px-3 py-2 text-right border bg-purple-50">Заявки</th>
                <th className="px-3 py-2 text-right border bg-cyan-50">Резерв</th>
                <th className="px-3 py-2 text-right border bg-purple-50">Итого начисление</th>
              </tr>
              <tr>
                <th className="px-3 py-1 border bg-gray-50"></th>
                <th className="px-3 py-1 border bg-gray-50"></th>
                <th className="px-3 py-1 border bg-gray-50">{CURRENCY}</th>
                <th className="px-3 py-1 border bg-gray-50">{CURRENCY}</th>
                <th className="px-3 py-1 border bg-gray-50">{CURRENCY}</th>
                <th className="px-3 py-1 border bg-gray-50">дн</th>
                
                {/* Подзаголовки для брендов */}
                {activeBrands.map(brand => (
                  <React.Fragment key={`brand-sub-${brand.id}`}>
                    <th className="px-2 py-1 border bg-blue-50">План</th>
                    <th className="px-2 py-1 border bg-blue-50">Факт</th>
                    <th className="px-2 py-1 border bg-blue-50">%</th>
                    <th className="px-2 py-1 border bg-blue-50">Начисл.</th>
                  </React.Fragment>
                ))}
                
                {/* Подзаголовки для KPI */}
                {activeKpiTypes.map(kpi => (
                  <React.Fragment key={`kpi-sub-${kpi.id}`}>
                    {!kpi.no_plan && <th className="px-2 py-1 border bg-green-50">План</th>}
                    <th className="px-2 py-1 border bg-green-50">Факт</th>
                    {!kpi.no_plan && <th className="px-2 py-1 border bg-green-50">%</th>}
                    <th className="px-2 py-1 border bg-green-50">Начисл.</th>
                  </React.Fragment>
                ))}
                
                {/* Подзаголовки для комбинаций */}
                {brandCombinations.map((combo, idx) => (
                  <React.Fragment key={`combo-sub-${idx}`}>
                    <th className="px-2 py-1 border bg-orange-50">План</th>
                    <th className="px-2 py-1 border bg-orange-50">Факт</th>
                    <th className="px-2 py-1 border bg-orange-50">%</th>
                    <th className="px-2 py-1 border bg-orange-50">Начисл.</th>
                  </React.Fragment>
                ))}
                
                {/* Подзаголовки для общего */}
                <th className="px-2 py-1 border bg-yellow-50">План</th>
                <th className="px-2 py-1 border bg-yellow-50">Факт</th>
                <th className="px-2 py-1 border bg-yellow-50">%</th>
                {hasAllBrandsRule && (
                  <th className="px-2 py-1 border bg-yellow-50">Начисл.</th>
                )}
                <th className="border bg-purple-50"></th>
                <th className="border bg-cyan-50"></th>
                <th className="border bg-purple-50"></th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((data, index) => (
                <tr key={data.employee.id} className={`${getRowBackgroundClass(data.employee.position)} transition-colors`}>
                  <td className="px-3 py-2 border font-medium">
                    {data.employee.full_name}
                  </td>
                  <td className="px-3 py-2 border text-gray-600">
                    {data.territory?.name || '-'}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {data.fixedSalary.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {data.travelAllowance.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 border text-right">
                    {data.bonus.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    <span className="font-semibold">{data.daysWorked}</span>
                    <span className="text-gray-500"> / {data.workingDays}</span>
                  </td>
                  
                  {/* Данные по брендам */}
                  {data.brandData.map((b, i) => (
                    <React.Fragment key={`brand-data-${i}`}>
                      <td className="px-2 py-2 border text-right">
                        {b.plan.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-2 py-2 border text-right">
                        {b.fact.toLocaleString('ru-RU')}
                      </td>
                      <td className={`px-2 py-2 border text-right font-medium ${
                        b.percent >= 100 ? 'text-green-600' : 
                        b.percent >= 80 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {b.percent.toFixed(0)}%
                      </td>
                      <td className={`px-2 py-2 border font-medium ${data.brandAccruals[i] === null ? 'text-center text-gray-300' : 'text-right'}`}>
                        {data.brandAccruals[i] === null ? '–' : data.brandAccruals[i].toLocaleString('ru-RU')}
                      </td>
                    </React.Fragment>
                  ))}
                  
                  {/* Данные по KPI */}
                  {data.kpiData.map((k, i) => {
                    const kpiType = activeKpiTypes[i];
                    return (
                      <React.Fragment key={`kpi-data-${i}`}>
                        {!kpiType?.no_plan && (
                          <td className="px-2 py-2 border text-right">
                            {k.plan.toLocaleString('ru-RU')}
                          </td>
                        )}
                        <td className="px-2 py-2 border text-right">
                          {k.fact.toLocaleString('ru-RU')}
                        </td>
                        {!kpiType?.no_plan && (
                          <td className={`px-2 py-2 border text-right font-medium ${
                            k.percent >= 100 ? 'text-green-600' : 
                            k.percent >= 80 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {k.percent.toFixed(0)}%
                          </td>
                        )}
                        <td className={`px-2 py-2 border font-medium ${data.kpiAccruals[i] === null ? 'text-center text-gray-300' : 'text-right'}`}>
                          {data.kpiAccruals[i] === null ? '–' : data.kpiAccruals[i].toLocaleString('ru-RU')}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Комбинации */}
                  {data.combinationData.map((combo, idx) => (
                    <React.Fragment key={`combo-data-${idx}`}>
                      <td className={`px-2 py-2 border bg-orange-50 ${combo.plan === null ? 'text-center text-gray-300' : 'text-right'}`}>
                        {combo.plan === null ? '–' : combo.plan.toLocaleString('ru-RU')}
                      </td>
                      <td className={`px-2 py-2 border bg-orange-50 ${combo.fact === null ? 'text-center text-gray-300' : 'text-right'}`}>
                        {combo.fact === null ? '–' : combo.fact.toLocaleString('ru-RU')}
                      </td>
                      <td className={`px-2 py-2 border font-medium bg-orange-50 ${
                        combo.percent === null ? 'text-center text-gray-300' :
                        combo.percent >= 100 ? 'text-right text-green-600' : 
                        combo.percent >= 80 ? 'text-right text-yellow-600' : 
                        'text-right text-red-600'
                      }`}>
                        {combo.percent === null ? '–' : `${combo.percent.toFixed(0)}%`}
                      </td>
                      <td className={`px-2 py-2 border font-medium bg-orange-50 ${combo.accrual === null ? 'text-center text-gray-300' : 'text-right'}`}>
                        {combo.accrual === null ? '–' : combo.accrual.toLocaleString('ru-RU')}
                      </td>
                    </React.Fragment>
                  ))}
                  
                  {/* Общие итоги */}
                  <td className="px-2 py-2 border text-right font-medium bg-yellow-50">
                    {data.totalPlan.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-2 py-2 border text-right font-medium bg-yellow-50">
                    {data.totalFact.toLocaleString('ru-RU')}
                  </td>
                  <td className={`px-2 py-2 border text-right font-bold bg-yellow-50 ${
                    data.totalPercent >= 100 ? 'text-green-600' : 
                    data.totalPercent >= 80 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {data.totalPercent.toFixed(0)}%
                  </td>
                  {hasAllBrandsRule && (
                    <td className="px-2 py-2 border text-right font-medium bg-yellow-50">
                      {data.allBrandsAccrual.toLocaleString('ru-RU')}
                    </td>
                  )}
                  
                  {/* Заявки */}
                  <td className="px-3 py-2 border text-right font-medium bg-purple-50">
                    {data.orderCount || 0}
                  </td>
                  
                  {/* Резерв */}
                  <td className="px-3 py-2 border text-right font-medium bg-cyan-50">
                    {data.totalReserved.toLocaleString('ru-RU')}
                  </td>
                  
                  {/* Итого начисление */}
                  <td className="px-3 py-2 border text-right font-bold bg-purple-50">
                    {(data.fixedSalary + data.travelAllowance + data.bonus + data.totalAccrual).toLocaleString('ru-RU')} {CURRENCY}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SummaryReport;
