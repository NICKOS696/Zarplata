"""
Скрипт для проверки наличия колонок name_1c в таблицах
"""
import sqlite3
import os

def check_columns():
    db_path = os.path.join(os.path.dirname(__file__), 'sales.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables = ['brands', 'kpi_types']
    
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'name_1c' in columns:
            print(f"✅ Таблица {table}: колонка name_1c существует")
        else:
            print(f"❌ Таблица {table}: колонка name_1c отсутствует")
    
    conn.close()

if __name__ == "__main__":
    check_columns()
