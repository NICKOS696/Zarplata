-- Миграция: Добавление функционала табеля (SQLite версия)
-- Дата: 2025-12-12
-- Описание: Добавление полей для учета дат приема/увольнения, стажировки, пропусков и бонусов

-- 1. Добавляем новые поля в таблицу employees (SQLite не поддерживает IF NOT EXISTS)
-- Если поле уже существует, SQLite выдаст ошибку, но это нормально
ALTER TABLE employees ADD COLUMN hire_date DATE;
ALTER TABLE employees ADD COLUMN termination_date DATE;
ALTER TABLE employees ADD COLUMN probation_days INTEGER DEFAULT 0;

-- 2. Создаем таблицу пропусков
CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (employee_id, absence_date)
);

-- Индексы для таблицы absences
CREATE INDEX IF NOT EXISTS idx_absences_employee_id ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_absence_date ON absences(absence_date);

-- 3. Создаем таблицу бонусов
CREATE TABLE IF NOT EXISTS bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    bonus_date DATE NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Индексы для таблицы bonuses
CREATE INDEX IF NOT EXISTS idx_bonuses_employee_id ON bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_bonus_date ON bonuses(bonus_date);
