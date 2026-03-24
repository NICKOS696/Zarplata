"""
Миграция: добавление поля telegram_bot_token в таблицу companies
"""
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE companies ADD COLUMN telegram_bot_token VARCHAR'))
            conn.commit()
            print('Поле telegram_bot_token успешно добавлено в таблицу companies')
        except Exception as e:
            if 'duplicate column name' in str(e).lower():
                print('Поле telegram_bot_token уже существует')
            else:
                raise e

if __name__ == "__main__":
    migrate()
