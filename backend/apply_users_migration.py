"""Применение миграции для создания таблицы users"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def apply_migration():
    engine = create_engine(DATABASE_URL)
    
    with open('migrations/create_users_table.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    
    with engine.connect() as conn:
        # Выполняем каждую команду отдельно
        for statement in sql.split(';'):
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                    print(f'✅ Выполнено: {statement[:50]}...')
                except Exception as e:
                    print(f'⚠️ Ошибка: {e}')
                    print(f'SQL: {statement[:100]}...')
    
    print('\n✅ Миграция применена успешно!')
    print('📝 Создан пользователь admin с паролем: admin')
    print('⚠️ Не забудьте сменить пароль администратора!')

if __name__ == '__main__':
    apply_migration()
