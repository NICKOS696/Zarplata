-- Миграция SQLite: изменить тип attendance.days_worked на REAL (поддержка 0.5)
-- В SQLite нельзя ALTER COLUMN TYPE, поэтому пересоздаем таблицу.

PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

ALTER TABLE attendance RENAME TO attendance_old;

CREATE TABLE attendance (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    days_worked REAL DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (employee_id, year, month)
);

INSERT INTO attendance (id, employee_id, year, month, days_worked, notes, created_at, updated_at)
SELECT id, employee_id, year, month, CAST(days_worked AS REAL), notes, created_at, updated_at
FROM attendance_old;

DROP TABLE attendance_old;

COMMIT;

PRAGMA foreign_keys=on;
