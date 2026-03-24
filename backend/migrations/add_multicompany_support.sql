-- Миграция для добавления поддержки мультикомпании
-- Дата: 2026-02-05

-- 1. Создаем таблицу компаний
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 2. Добавляем 3 компании по умолчанию
INSERT INTO companies (name, is_active) VALUES 
    ('Компания 1', 1),
    ('Компания 2', 1),
    ('Компания 3', 1);

-- 3. Добавляем company_id в таблицу territories
ALTER TABLE territories ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим территориям первую компанию
UPDATE territories SET company_id = 1 WHERE company_id IS NULL;

-- 4. Добавляем company_id в таблицу employees
ALTER TABLE employees ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим сотрудникам первую компанию
UPDATE employees SET company_id = 1 WHERE company_id IS NULL;

-- 5. Добавляем company_id в таблицу brands
ALTER TABLE brands ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим брендам первую компанию
UPDATE brands SET company_id = 1 WHERE company_id IS NULL;
-- Удаляем старый уникальный индекс и создаем новый с учетом company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_brand_name ON brands(company_id, name);

-- 6. Добавляем company_id в таблицу kpi_types
ALTER TABLE kpi_types ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим KPI первую компанию
UPDATE kpi_types SET company_id = 1 WHERE company_id IS NULL;
-- Удаляем старый уникальный индекс и создаем новый с учетом company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_kpi_name ON kpi_types(company_id, name);

-- 7. Добавляем company_id в таблицу salary_rules
ALTER TABLE salary_rules ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим правилам первую компанию
UPDATE salary_rules SET company_id = 1 WHERE company_id IS NULL;

-- 8. Добавляем company_id в таблицу sales_plans
ALTER TABLE sales_plans ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим планам первую компанию
UPDATE sales_plans SET company_id = 1 WHERE company_id IS NULL;

-- 9. Добавляем company_id в таблицу sales_facts
ALTER TABLE sales_facts ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим фактам первую компанию
UPDATE sales_facts SET company_id = 1 WHERE company_id IS NULL;

-- 10. Добавляем company_id в таблицу attendance
ALTER TABLE attendance ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим записям первую компанию
UPDATE attendance SET company_id = 1 WHERE company_id IS NULL;

-- 11. Добавляем company_id в таблицу absences
ALTER TABLE absences ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим записям первую компанию
UPDATE absences SET company_id = 1 WHERE company_id IS NULL;

-- 12. Добавляем company_id в таблицу bonuses
ALTER TABLE bonuses ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Назначаем всем существующим записям первую компанию
UPDATE bonuses SET company_id = 1 WHERE company_id IS NULL;

-- 13. Обновляем таблицу users для новых ролей
ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id);
-- Для существующих пользователей:
-- admin остается с company_id = NULL (доступ ко всем компаниям)
-- остальные получают первую компанию
UPDATE users SET company_id = NULL WHERE role = 'admin';
UPDATE users SET company_id = 1 WHERE role != 'admin' AND company_id IS NULL;

-- 14. Создаем индексы для быстрого поиска по company_id
CREATE INDEX IF NOT EXISTS idx_territories_company ON territories(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_brands_company ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_kpi_types_company ON kpi_types(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_rules_company ON salary_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_plans_company ON sales_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_facts_company ON sales_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_absences_company ON absences(company_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_company ON bonuses(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
