"""
Скрипт для исправления CHECK constraint в таблице users.
Добавляет роли director и analyst.
"""
from database import engine
from sqlalchemy import text

def fix_user_roles():
    with engine.connect() as conn:
        # В SQLite нельзя напрямую изменить CHECK constraint
        # Нужно пересоздать таблицу
        
        # 1. Создаем временную таблицу без constraint
        conn.execute(text("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY,
                username VARCHAR NOT NULL UNIQUE,
                password_hash VARCHAR NOT NULL,
                role VARCHAR NOT NULL,
                company_id INTEGER REFERENCES companies(id),
                employee_id INTEGER REFERENCES employees(id),
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        """))
        
        # 2. Копируем данные
        conn.execute(text("""
            INSERT INTO users_new (id, username, password_hash, role, company_id, employee_id, is_active, created_at, updated_at)
            SELECT id, username, password_hash, role, company_id, employee_id, is_active, created_at, updated_at
            FROM users
        """))
        
        # 3. Удаляем старую таблицу
        conn.execute(text("DROP TABLE users"))
        
        # 4. Переименовываем новую таблицу
        conn.execute(text("ALTER TABLE users_new RENAME TO users"))
        
        # 5. Создаем индексы
        conn.execute(text("CREATE INDEX ix_users_id ON users (id)"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_username ON users (username)"))
        conn.execute(text("CREATE INDEX ix_users_company_id ON users (company_id)"))
        
        conn.commit()
        print("CHECK constraint успешно удален. Теперь все роли разрешены.")

if __name__ == "__main__":
    fix_user_roles()
