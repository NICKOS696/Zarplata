-- Создание таблицы users для системы аутентификации
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'hr', 'supervisor', 'manager')),
    employee_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- Создание администратора по умолчанию (пароль: admin)
-- Хеш для пароля "admin" с использованием bcrypt
INSERT INTO users (username, password_hash, role, is_active) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/qvQqK', 'admin', 1);
