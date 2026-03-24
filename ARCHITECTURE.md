# 🏗️ Архитектура системы

## Обзор

Система построена по современной архитектуре с разделением на frontend и backend:

```
┌─────────────────┐
│   React UI      │  ← Пользовательский интерфейс
└────────┬────────┘
         │ HTTP/REST
┌────────▼────────┐
│   FastAPI       │  ← REST API сервер
└────────┬────────┘
         │ SQLAlchemy ORM
┌────────▼────────┐
│   Database      │  ← SQLite/PostgreSQL
└─────────────────┘
```

## Структура базы данных

### Основные таблицы

#### employees (Сотрудники)
- `id` - уникальный идентификатор
- `full_name` - ФИО
- `position` - должность (manager/supervisor)
- `telegram_id` - ID в Telegram
- `supervisor_id` - ссылка на супервайзера
- `fixed_salary` - фиксированная часть зарплаты
- `is_active` - активен ли сотрудник

#### brands (Бренды)
- `id` - уникальный идентификатор
- `name` - название бренда
- `is_active` - активен ли бренд

#### kpi_types (Типы KPI)
- `id` - уникальный идентификатор
- `name` - название KPI
- `description` - описание
- `is_active` - активен ли KPI

#### sales_plans (Планы продаж)
- `id` - уникальный идентификатор
- `employee_id` - сотрудник
- `brand_id` - бренд (опционально)
- `kpi_type_id` - тип KPI (опционально)
- `period_start` - начало периода
- `period_end` - конец периода
- `plan_value` - значение плана

#### sales_facts (Факты продаж)
- `id` - уникальный идентификатор
- `employee_id` - сотрудник
- `brand_id` - бренд (опционально)
- `kpi_type_id` - тип KPI (опционально)
- `sale_date` - дата продажи
- `fact_value` - фактическое значение

#### attendance (Табель)
- `id` - уникальный идентификатор
- `employee_id` - сотрудник
- `work_date` - дата
- `is_present` - присутствовал ли
- `hours_worked` - количество часов
- `notes` - примечания

#### salary_rules (Правила расчета)
- `id` - уникальный идентификатор
- `name` - название правила
- `position` - должность
- `rule_type` - тип правила (percentage/tiered/fixed)
- `config` - JSON конфигурация
- `is_active` - активно ли правило

#### salary_calculations (Расчеты зарплаты)
- `id` - уникальный идентификатор
- `employee_id` - сотрудник
- `period_start` - начало периода
- `period_end` - конец периода
- `fixed_part` - фиксированная часть
- `motivation_part` - мотивационная часть
- `bonus_part` - бонусы
- `penalty_part` - штрафы
- `total_salary` - итоговая зарплата
- `plan_completion_percent` - процент выполнения плана
- `attendance_percent` - процент посещаемости
- `calculation_details` - JSON с деталями расчета

## Логика расчета зарплаты

### Алгоритм расчета

```python
def calculate_salary(employee, period_start, period_end):
    # 1. Расчет выполнения плана
    plan_data = calculate_plan_completion(employee, period)
    # plan_data = {
    #     "total_plan": 400000,
    #     "total_fact": 450000,
    #     "completion_percent": 112.5,
    #     "details": [...]
    # }
    
    # 2. Расчет посещаемости
    attendance_data = calculate_attendance(employee, period)
    # attendance_data = {
    #     "days_worked": 20,
    #     "working_days": 22,
    #     "attendance_percent": 90.9
    # }
    
    # 3. Получение правил для должности
    rules = get_salary_rules(employee.position)
    
    # 4. Расчет мотивационной части
    motivation = calculate_motivation(
        completion_percent=plan_data["completion_percent"],
        total_fact=plan_data["total_fact"],
        rules=rules
    )
    
    # 5. Расчет фиксированной части с учетом посещаемости
    fixed = calculate_fixed_part(
        base_salary=employee.fixed_salary,
        attendance_percent=attendance_data["attendance_percent"]
    )
    
    # 6. Итоговая зарплата
    total = fixed["fixed_part"] + motivation["motivation_part"] + 
            motivation["bonus_part"] - fixed["penalty_part"]
    
    return total
```

### Типы правил расчета

#### 1. Процент от продаж (percentage)

```json
{
  "base_percent": 3,
  "bonus_percent": 2,
  "threshold": 100
}
```

**Логика:**
- Если выполнение < 100%: зарплата = факт × 3%
- Если выполнение ≥ 100%: зарплата = факт × (3% + 2%)

**Пример:**
- Факт продаж: 500,000 ₽
- Выполнение: 110%
- Мотивация: 500,000 × 5% = 25,000 ₽

#### 2. Ступенчатая система (tiered)

```json
{
  "tiers": [
    {"from": 0, "to": 80, "percent": 1},
    {"from": 80, "to": 100, "percent": 3},
    {"from": 100, "to": 120, "percent": 5},
    {"from": 120, "to": 999, "percent": 7}
  ]
}
```

**Логика:**
- Выполнение 0-80%: 1% от факта
- Выполнение 80-100%: 3% от факта
- Выполнение 100-120%: 5% от факта
- Выполнение >120%: 7% от факта

**Пример:**
- Факт продаж: 500,000 ₽
- Выполнение: 110%
- Мотивация: 500,000 × 5% = 25,000 ₽

#### 3. Фиксированный бонус (fixed)

```json
{
  "threshold": 100,
  "amount": 10000
}
```

**Логика:**
- Если выполнение ≥ 100%: бонус = 10,000 ₽
- Иначе: бонус = 0 ₽

### Расчет фиксированной части

```python
def calculate_fixed_part(base_salary, attendance_percent, threshold=80):
    if attendance_percent >= threshold:
        # Полная фиксированная часть
        return {
            "fixed_part": base_salary,
            "penalty_part": 0
        }
    else:
        # Пропорционально посещаемости
        fixed = base_salary * (attendance_percent / 100)
        penalty = base_salary - fixed
        return {
            "fixed_part": fixed,
            "penalty_part": penalty
        }
```

**Пример:**
- Базовая зарплата: 30,000 ₽
- Посещаемость: 85%
- Результат: 30,000 ₽ (без штрафа, т.к. > 80%)

**Пример со штрафом:**
- Базовая зарплата: 30,000 ₽
- Посещаемость: 70%
- Результат: 21,000 ₽ (штраф 9,000 ₽)

## API Endpoints

### Сотрудники
- `GET /api/employees` - список сотрудников
- `GET /api/employees/{id}` - получить сотрудника
- `POST /api/employees` - создать сотрудника
- `PUT /api/employees/{id}` - обновить сотрудника
- `DELETE /api/employees/{id}` - деактивировать сотрудника

### Бренды
- `GET /api/brands` - список брендов
- `POST /api/brands` - создать бренд

### KPI
- `GET /api/kpi-types` - список типов KPI
- `POST /api/kpi-types` - создать тип KPI

### Планы продаж
- `GET /api/sales-plans` - список планов
- `POST /api/sales-plans` - создать план
- `POST /api/sales-plans/bulk` - массовое создание планов

### Факты продаж
- `GET /api/sales-facts` - список фактов
- `POST /api/sales-facts` - создать факт
- `POST /api/sales-facts/bulk` - массовое создание фактов

### Табель
- `GET /api/attendance` - список записей табеля
- `POST /api/attendance` - создать запись

### Правила зарплаты
- `GET /api/salary-rules` - список правил
- `POST /api/salary-rules` - создать правило

### Расчет зарплаты
- `GET /api/salary-calculations` - список расчетов
- `POST /api/salary-calculations/calculate` - рассчитать для сотрудника
- `POST /api/salary-calculations/calculate-team` - рассчитать для команды

### Импорт
- `POST /api/import/sales-html` - импорт продаж из HTML
- `POST /api/import/attendance-html` - импорт табеля из HTML

### Дашборд
- `GET /api/dashboard/team` - дашборд команды

## Frontend компоненты

### Страницы
- `Dashboard.jsx` - главный дашборд с аналитикой
- `Employees.jsx` - управление сотрудниками
- `SalesPlans.jsx` - планы продаж
- `SalesFacts.jsx` - факты продаж
- `Attendance.jsx` - табель посещаемости
- `SalaryCalculations.jsx` - расчет зарплаты
- `Import.jsx` - импорт данных из 1С
- `Settings.jsx` - настройки системы

### Сервисы
- `api.js` - централизованный API клиент с axios

### Роутинг
```javascript
/                    → Dashboard
/employees           → Employees
/sales-plans         → SalesPlans
/sales-facts         → SalesFacts
/attendance          → Attendance
/salary              → SalaryCalculations
/import              → Import
/settings            → Settings
```

## Расширяемость

### Добавление нового бренда
1. Через UI: Settings → Бренды → Добавить бренд
2. Через API: `POST /api/brands`
3. Бренд сразу доступен для использования в планах и фактах

### Добавление нового типа KPI
1. Через UI: Settings → KPI → Добавить KPI
2. Через API: `POST /api/kpi-types`
3. KPI сразу доступен для использования

### Добавление нового правила расчета
1. Через UI: Settings → Правила зарплаты → Добавить правило
2. Настройте JSON конфигурацию под ваши нужды
3. Правило применяется при следующем расчете

### Изменение команды
- Добавление сотрудника: автоматически включается в расчеты
- Удаление сотрудника: деактивация (данные сохраняются)
- Изменение структуры: просто измените supervisor_id

## Безопасность

### Текущая реализация
- CORS настроен для локального использования
- Валидация данных через Pydantic
- SQL injection защита через SQLAlchemy ORM

### Рекомендации для продакшена
- Добавить аутентификацию (JWT tokens)
- Настроить HTTPS
- Ограничить CORS для конкретных доменов
- Добавить rate limiting
- Логирование всех операций
- Регулярные бэкапы БД

## Производительность

### Оптимизации
- Индексы на часто используемых полях (employee_id, sale_date, work_date)
- Пагинация для больших списков
- Кэширование дашборда (можно добавить Redis)
- Batch операции для импорта

### Масштабирование
- SQLite → PostgreSQL для больших объемов
- Добавить кэш (Redis) для дашборда
- Разделить frontend и backend на разные серверы
- Использовать CDN для статики

## Будущие улучшения

1. **Telegram бот**
   - Автоматическая отправка отчетов
   - Команды для просмотра статистики
   - Уведомления о достижениях

2. **Экспорт отчетов**
   - Excel с детализацией
   - PDF для печати
   - Шаблоны отчетов

3. **Аналитика**
   - Прогнозирование продаж
   - Тренды по брендам
   - Сравнение периодов

4. **Интеграция с 1С**
   - Прямое API подключение
   - Автоматическая синхронизация
   - Двусторонний обмен данными
