-- Убираем ограничение уникальности для telegram_id
-- SQLite не поддерживает ALTER COLUMN, поэтому пересоздаем таблицу

-- Создаем временную таблицу с новой структурой
CREATE TABLE employees_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR NOT NULL,
    name_1c VARCHAR,
    position VARCHAR NOT NULL,
    telegram_id VARCHAR,
    supervisor_id INTEGER,
    manager_id INTEGER,
    territory_id INTEGER,
    salary_rule_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    fixed_salary REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES employees (id),
    FOREIGN KEY (manager_id) REFERENCES employees (id),
    FOREIGN KEY (territory_id) REFERENCES territories (id),
    FOREIGN KEY (salary_rule_id) REFERENCES salary_rules (id)
);

-- Копируем данные
INSERT INTO employees_new SELECT * FROM employees;

-- Удаляем старую таблицу
DROP TABLE employees;

-- Переименовываем новую таблицу
ALTER TABLE employees_new RENAME TO employees;

-- Создаем индексы
CREATE INDEX ix_employees_id ON employees(id);
CREATE INDEX ix_employees_full_name ON employees(full_name);
CREATE INDEX ix_employees_name_1c ON employees(name_1c);
CREATE INDEX ix_employees_telegram_id ON employees(telegram_id);
