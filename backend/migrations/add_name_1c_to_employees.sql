-- Добавление поля name_1c в таблицу employees
ALTER TABLE employees ADD COLUMN name_1c VARCHAR;

-- Создание индекса для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_employees_name_1c ON employees(name_1c);
