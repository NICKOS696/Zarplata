import sqlite3
import os

# Путь к базе данных
db_path = os.path.join(os.path.dirname(__file__), 'sales.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Удаляем все записи из связанных таблиц
    cursor.execute("DELETE FROM sales_facts")
    cursor.execute("DELETE FROM sales_plans")
    cursor.execute("DELETE FROM attendance")
    cursor.execute("DELETE FROM salary_calculations")
    cursor.execute("DELETE FROM reserved_orders")
    
    # Удаляем всех сотрудников
    cursor.execute("DELETE FROM employees")
    
    conn.commit()
    
    # Проверяем количество оставшихся записей
    cursor.execute("SELECT COUNT(*) FROM employees")
    count = cursor.fetchone()[0]
    
    print(f"✅ Все сотрудники удалены!")
    print(f"✅ Осталось сотрудников: {count}")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
    conn.rollback()
finally:
    conn.close()
