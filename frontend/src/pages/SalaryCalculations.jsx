import React, { useState, useEffect } from 'react';
import { salaryCalculationsAPI, employeesAPI } from '../services/api';
import { Calculator, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CURRENCY } from '../config';

function SalaryCalculations() {
  const [calculations, setCalculations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    loadData();
  }, [periodStart, periodEnd]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [calcsRes, empsRes] = await Promise.all([
        salaryCalculationsAPI.getAll({ period_start: periodStart, period_end: periodEnd }),
        employeesAPI.getAll({ is_active: true }),
      ]);
      setCalculations(calcsRes.data);
      setEmployees(empsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedEmployee) {
      alert('Выберите сотрудника');
      return;
    }

    try {
      setCalculating(true);
      await salaryCalculationsAPI.calculate(selectedEmployee, periodStart, periodEnd);
      alert('Зарплата рассчитана успешно!');
      loadData();
    } catch (error) {
      console.error('Ошибка расчета:', error);
      alert('Ошибка расчета зарплаты: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateTeam = async () => {
    if (!window.confirm('Рассчитать зарплату для всей команды?')) {
      return;
    }

    try {
      setCalculating(true);
      const response = await salaryCalculationsAPI.calculateTeam(periodStart, periodEnd);
      alert(`Рассчитано зарплат: ${response.data.count}`);
      loadData();
    } catch (error) {
      console.error('Ошибка расчета:', error);
      alert('Ошибка расчета зарплаты команды');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Расчет зарплаты</h1>
        <p className="text-gray-600 mt-1">Автоматический расчет зарплаты с учетом мотивации</p>
      </div>

      {/* Calculation Form */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator size={20} />
          <h3 className="font-semibold">Рассчитать зарплату</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Период с</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">по</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Сотрудник</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input"
            >
              <option value="">Выберите сотрудника</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={calculating || !selectedEmployee}
              className="btn btn-primary w-full"
            >
              {calculating ? 'Расчет...' : 'Рассчитать'}
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <button
            onClick={handleCalculateTeam}
            disabled={calculating}
            className="btn btn-success"
          >
            {calculating ? 'Расчет...' : 'Рассчитать всю команду'}
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign size={20} />
          <h3 className="font-semibold">Результаты расчетов</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : calculations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Нет расчетов за выбранный период
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Период</th>
                  <th>Фикс. часть</th>
                  <th>Мотивация</th>
                  <th>Бонус</th>
                  <th>Штраф</th>
                  <th>Итого</th>
                  <th>Выполнение</th>
                  <th>Посещаемость</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc) => {
                  const employee = employees.find(e => e.id === calc.employee_id);
                  return (
                    <tr key={calc.id}>
                      <td className="font-medium">{employee?.full_name || '-'}</td>
                      <td className="text-sm text-gray-600">
                        {new Date(calc.period_start).toLocaleDateString('ru-RU')} - {new Date(calc.period_end).toLocaleDateString('ru-RU')}
                      </td>
                      <td>{calc.fixed_part.toLocaleString('ru-RU')} {CURRENCY}</td>
                      <td className="text-green-600">{calc.motivation_part.toLocaleString('ru-RU')} {CURRENCY}</td>
                      <td className="text-blue-600">{calc.bonus_part.toLocaleString('ru-RU')} {CURRENCY}</td>
                      <td className="text-red-600">{calc.penalty_part.toLocaleString('ru-RU')} {CURRENCY}</td>
                      <td className="font-bold text-lg">{calc.total_salary.toLocaleString('ru-RU')} {CURRENCY}</td>
                      <td>
                        <span className={`font-semibold ${
                          calc.plan_completion_percent >= 100 
                            ? 'text-green-600' 
                            : calc.plan_completion_percent >= 80 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                        }`}>
                          {calc.plan_completion_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`font-semibold ${
                          calc.attendance_percent >= 90 
                            ? 'text-green-600' 
                            : calc.attendance_percent >= 80 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                        }`}>
                          {calc.attendance_percent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({calc.days_worked}/{calc.days_total})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalaryCalculations;
