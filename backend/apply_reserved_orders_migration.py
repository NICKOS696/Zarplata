import sqlite3
import os

# Путь к базе данных
db_path = os.path.join(os.path.dirname(__file__), 'sales.db')

# Читаем SQL из файла миграции
migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_reserved_orders.sql')
with open(migration_path, 'r', encoding='utf-8') as f:
    sql = f.read()

# Применяем миграцию
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.executescript(sql)
    conn.commit()
    print("✅ Миграция успешно применена!")
    print("✅ Таблица reserved_orders создана")
except Exception as e:
    print(f"❌ Ошибка при применении миграции: {e}")
    conn.rollback()
finally:
    conn.close()
