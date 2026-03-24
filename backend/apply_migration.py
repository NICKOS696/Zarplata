"""
Скрипт для применения миграции добавления поля name_1c
"""
import sqlite3
import os

def apply_migration():
    # Путь к базе данных
    db_path = os.path.join(os.path.dirname(__file__), 'sales.db')
    
    # Подключаемся к базе данных
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли уже колонка
        cursor.execute("PRAGMA table_info(employees)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'name_1c' not in columns:
            print("Добавляем колонку name_1c в таблицу employees...")
            cursor.execute("ALTER TABLE employees ADD COLUMN name_1c VARCHAR")
            
            # Создаем индекс
            print("Создаем индекс для name_1c...")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_employees_name_1c ON employees(name_1c)")
            
            conn.commit()
            print("✅ Миграция успешно применена!")
        else:
            print("ℹ️ Колонка name_1c уже существует, миграция не требуется.")
            
    except Exception as e:
        print(f"❌ Ошибка при применении миграции: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    apply_migration()
