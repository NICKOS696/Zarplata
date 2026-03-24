# 📚 Примеры использования

## Сценарий 1: Настройка новой компании

### Шаг 1: Добавление супервайзера

```http
POST /api/employees
{
  "full_name": "Петров Петр Петрович",
  "position": "supervisor",
  "telegram_id": "123456789",
  "fixed_salary": 50000,
  "is_active": true
}
```

### Шаг 2: Добавление менеджеров

```http
POST /api/employees
{
  "full_name": "Иванов Иван Иванович",
  "position": "manager",
  "telegram_id": "987654321",
  "supervisor_id": 1,
  "fixed_salary": 30000,
  "is_active": true
}
```

### Шаг 3: Добавление брендов

```http
POST /api/brands
{"name": "Samsung"}

POST /api/brands
{"name": "Apple"}

POST /api/brands
{"name": "Xiaomi"}
```

### Шаг 4: Добавление KPI

```http
POST /api/kpi-types
{
  "name": "Объем продаж",
  "description": "Общий объем продаж в рублях"
}

POST /api/kpi-types
{
  "name": "Количество сделок",
  "description": "Количество закрытых сделок"
}
```

### Шаг 5: Настройка правил зарплаты

**Для менеджеров (процент от продаж):**
```http
POST /api/salary-rules
{
  "name": "Базовая мотивация менеджеров",
  "position": "manager",
  "rule_type": "percentage",
  "config": {
    "base_percent": 3,
    "bonus_percent": 2,
    "threshold": 100
  },
  "is_active": true
}
```

**Для супервайзеров (ступенчатая система):**
```http
POST /api/salary-rules
{
  "name": "Мотивация супервайзеров",
  "position": "supervisor",
  "rule_type": "tiered",
  "config": {
    "tiers": [
      {"from": 0, "to": 80, "percent": 1},
      {"from": 80, "to": 100, "percent": 2},
      {"from": 100, "to": 120, "percent": 3},
      {"from": 120, "to": 999, "percent": 4}
    ]
  },
  "is_active": true
}
```

## Сценарий 2: Установка планов на месяц

### Массовая установка планов

```http
POST /api/sales-plans/bulk
[
  {
    "employee_id": 2,
    "brand_id": 1,
    "kpi_type_id": 1,
    "period_start": "2024-12-01",
    "period_end": "2024-12-31",
    "plan_value": 100000
  },
  {
    "employee_id": 2,
    "brand_id": 2,
    "kpi_type_id": 1,
    "period_start": "2024-12-01",
    "period_end": "2024-12-31",
    "plan_value": 150000
  },
  {
    "employee_id": 2,
    "kpi_type_id": 2,
    "period_start": "2024-12-01",
    "period_end": "2024-12-31",
    "plan_value": 30
  }
]
```

## Сценарий 3: Ежедневный учет продаж

### Добавление продажи

```http
POST /api/sales-facts
{
  "employee_id": 2,
  "brand_id": 1,
  "kpi_type_id": 1,
  "sale_date": "2024-12-10",
  "fact_value": 5000
}
```

### Массовое добавление продаж за день

```http
POST /api/sales-facts/bulk
[
  {
    "employee_id": 2,
    "brand_id": 1,
    "kpi_type_id": 1,
    "sale_date": "2024-12-10",
    "fact_value": 5000
  },
  {
    "employee_id": 2,
    "brand_id": 2,
    "kpi_type_id": 1,
    "sale_date": "2024-12-10",
    "fact_value": 7500
  },
  {
    "employee_id": 3,
    "brand_id": 1,
    "kpi_type_id": 1,
    "sale_date": "2024-12-10",
    "fact_value": 4200
  }
]
```

## Сценарий 4: Учет посещаемости

### Отметка присутствия

```http
POST /api/attendance
{
  "employee_id": 2,
  "work_date": "2024-12-10",
  "is_present": true,
  "hours_worked": 8,
  "notes": ""
}
```

### Отметка отсутствия

```http
POST /api/attendance
{
  "employee_id": 3,
  "work_date": "2024-12-10",
  "is_present": false,
  "hours_worked": 0,
  "notes": "Больничный"
}
```

## Сценарий 5: Импорт из 1С

### Пример HTML файла для продаж

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Отчет по продажам</title>
</head>
<body>
    <table border="1">
        <thead>
            <tr>
                <th>Сотрудник</th>
                <th>Дата</th>
                <th>Бренд</th>
                <th>KPI</th>
                <th>Сумма</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Иванов Иван Иванович</td>
                <td>01.12.2024</td>
                <td>Samsung</td>
                <td>Объем продаж</td>
                <td>50 000</td>
            </tr>
            <tr>
                <td>Иванов Иван Иванович</td>
                <td>01.12.2024</td>
                <td>Apple</td>
                <td>Объем продаж</td>
                <td>75 000</td>
            </tr>
            <tr>
                <td>Сидорова Мария Ивановна</td>
                <td>01.12.2024</td>
                <td>Xiaomi</td>
                <td>Объем продаж</td>
                <td>42 000</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
```

### Импорт через API

```http
POST /api/import/sales-html
Content-Type: multipart/form-data

file: [HTML файл]
```

### Пример HTML файла для табеля

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Табель посещаемости</title>
</head>
<body>
    <table border="1">
        <thead>
            <tr>
                <th>Сотрудник</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Часы</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Иванов Иван Иванович</td>
                <td>01.12.2024</td>
                <td>Присутствовал</td>
                <td>8</td>
            </tr>
            <tr>
                <td>Сидорова Мария Ивановна</td>
                <td>01.12.2024</td>
                <td>Присутствовал</td>
                <td>8</td>
            </tr>
            <tr>
                <td>Козлов Алексей Сергеевич</td>
                <td>01.12.2024</td>
                <td>Отсутствовал</td>
                <td>0</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
```

## Сценарий 6: Расчет зарплаты

### Расчет для одного сотрудника

```http
POST /api/salary-calculations/calculate?employee_id=2&period_start=2024-12-01&period_end=2024-12-31
```

**Ответ:**
```json
{
  "id": 1,
  "employee_id": 2,
  "period_start": "2024-12-01",
  "period_end": "2024-12-31",
  "fixed_part": 30000.0,
  "motivation_part": 15000.0,
  "bonus_part": 5000.0,
  "penalty_part": 0.0,
  "total_salary": 50000.0,
  "plan_completion_percent": 110.5,
  "attendance_percent": 95.5,
  "days_worked": 21,
  "days_total": 22,
  "calculation_details": {
    "plan_data": {
      "total_plan": 250000,
      "total_fact": 276250,
      "completion_percent": 110.5,
      "details": [...]
    },
    "attendance_data": {
      "days_worked": 21,
      "working_days": 22,
      "attendance_percent": 95.5
    }
  },
  "is_sent": false,
  "created_at": "2024-12-10T10:00:00"
}
```

### Расчет для всей команды

```http
POST /api/salary-calculations/calculate-team?period_start=2024-12-01&period_end=2024-12-31
```

**Ответ:**
```json
{
  "message": "Team salaries calculated",
  "count": 5,
  "calculations": [...]
}
```

## Сценарий 7: Просмотр дашборда

### Получение статистики команды

```http
GET /api/dashboard/team?period_start=2024-12-01&period_end=2024-12-31
```

**Ответ:**
```json
{
  "period_start": "2024-12-01",
  "period_end": "2024-12-31",
  "total_employees": 5,
  "active_employees": 5,
  "total_plan": 1000000,
  "total_fact": 1150000,
  "avg_completion_percent": 115.0,
  "employees": [
    {
      "employee_id": 2,
      "employee_name": "Иванов Иван Иванович",
      "position": "manager",
      "total_plan": 250000,
      "total_fact": 276250,
      "completion_percent": 110.5,
      "attendance_percent": 95.5,
      "estimated_salary": 50000
    },
    ...
  ],
  "brands": [
    {
      "brand_id": 1,
      "brand_name": "Samsung",
      "total_plan": 400000,
      "total_fact": 450000,
      "completion_percent": 112.5
    },
    ...
  ]
}
```

## Сценарий 8: Фильтрация данных

### Получение продаж конкретного сотрудника за период

```http
GET /api/sales-facts?employee_id=2&date_from=2024-12-01&date_to=2024-12-10
```

### Получение продаж по бренду

```http
GET /api/sales-facts?brand_id=1&date_from=2024-12-01&date_to=2024-12-31
```

### Получение табеля сотрудника

```http
GET /api/attendance?employee_id=2&date_from=2024-12-01&date_to=2024-12-31
```

## Сценарий 9: Изменение структуры команды

### Перевод менеджера к другому супервайзеру

```http
PUT /api/employees/2
{
  "supervisor_id": 5
}
```

### Повышение менеджера до супервайзера

```http
PUT /api/employees/2
{
  "position": "supervisor",
  "supervisor_id": null,
  "fixed_salary": 50000
}
```

### Деактивация сотрудника

```http
DELETE /api/employees/2
```

## Сценарий 10: Настройка сложных правил

### Комбинированная мотивация (несколько правил)

**Правило 1: Базовый процент**
```json
{
  "name": "Базовая мотивация",
  "position": "manager",
  "rule_type": "percentage",
  "config": {
    "base_percent": 3,
    "bonus_percent": 0,
    "threshold": 0
  },
  "is_active": true
}
```

**Правило 2: Бонус за перевыполнение**
```json
{
  "name": "Бонус за 100%+",
  "position": "manager",
  "rule_type": "fixed",
  "config": {
    "threshold": 100,
    "amount": 10000
  },
  "is_active": true
}
```

**Правило 3: Супер-бонус за 120%+**
```json
{
  "name": "Супер-бонус",
  "position": "manager",
  "rule_type": "fixed",
  "config": {
    "threshold": 120,
    "amount": 20000
  },
  "is_active": true
}
```

### Результат для менеджера с выполнением 125%

- Факт продаж: 500,000 ₽
- Базовая мотивация: 500,000 × 3% = 15,000 ₽
- Бонус за 100%: 10,000 ₽
- Супер-бонус за 120%: 20,000 ₽
- **Итого мотивация: 45,000 ₽**

## Полезные запросы

### Получить всех активных менеджеров

```http
GET /api/employees?is_active=true&position=manager
```

### Получить все активные бренды

```http
GET /api/brands?is_active=true
```

### Получить правила для менеджеров

```http
GET /api/salary-rules?position=manager&is_active=true
```

### Получить последние 10 импортов

```http
GET /api/import-logs?limit=10
```

### Получить расчеты зарплаты за последний месяц

```http
GET /api/salary-calculations?period_start=2024-12-01&period_end=2024-12-31
```
