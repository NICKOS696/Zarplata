"""
Скрипт для проверки состояния мультикомпании
"""
import sqlite3
import os

def check_database():
    db_path = os.path.join(os.path.dirname(__file__), 'sales.db')
    
    if not os.path.exists(db_path):
        print(f"❌ База данных не найдена: {db_path}")
        return
    
    print("=" * 70)
    print("  ПРОВЕРКА МУЛЬТИКОМПАНИИ")
    print("=" * 70)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Проверяем компании
    print("\n📊 КОМПАНИИ:")
    cursor.execute("SELECT id, name, is_active FROM companies")
    companies = cursor.fetchall()
    for comp in companies:
        status = "✓ Активна" if comp[2] else "✗ Неактивна"
        print(f"  {comp[0]}. {comp[1]} - {status}")
    
    # 2. Проверяем структуру таблиц
    print("\n🔧 СТРУКТУРА ТАБЛИЦ (наличие company_id):")
    tables_to_check = [
        'territories', 'employees', 'brands', 'kpi_types', 
        'salary_rules', 'sales_plans', 'sales_facts', 
        'attendance', 'absences', 'bonuses', 'users'
    ]
    
    for table in tables_to_check:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        has_company_id = 'company_id' in columns
        status = "✓" if has_company_id else "✗"
        print(f"  {status} {table}")
    
    # 3. Проверяем распределение данных по компаниям
    print("\n📈 РАСПРЕДЕЛЕНИЕ ДАННЫХ:")
    
    for table in tables_to_check:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'company_id' in columns:
            cursor.execute(f"SELECT company_id, COUNT(*) FROM {table} GROUP BY company_id")
            data = cursor.fetchall()
            
            if data:
                print(f"\n  {table}:")
                for row in data:
                    comp_id = row[0] if row[0] else "NULL"
                    count = row[1]
                    comp_name = next((c[1] for c in companies if c[0] == row[0]), "Не указана")
                    print(f"    Компания {comp_id} ({comp_name}): {count} записей")
    
    # 4. Проверяем пользователей
    print("\n👥 ПОЛЬЗОВАТЕЛИ:")
    cursor.execute("SELECT id, username, role, company_id FROM users")
    users = cursor.fetchall()
    for user in users:
        comp_id = user[3] if user[3] else "Все компании"
        if user[3]:
            comp_name = next((c[1] for c in companies if c[0] == user[3]), "?")
            comp_id = f"{user[3]} ({comp_name})"
        print(f"  {user[0]}. {user[1]} - Роль: {user[2]}, Компания: {comp_id}")
    
    # 5. Проверяем индексы
    print("\n🔍 ИНДЕКСЫ:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%company%'")
    indexes = cursor.fetchall()
    print(f"  Найдено индексов с company: {len(indexes)}")
    for idx in indexes[:5]:  # Показываем первые 5
        print(f"    - {idx[0]}")
    if len(indexes) > 5:
        print(f"    ... и еще {len(indexes) - 5}")
    
    conn.close()
    
    print("\n" + "=" * 70)
    print("  ПРОВЕРКА ЗАВЕРШЕНА")
    print("=" * 70)

if __name__ == "__main__":
    check_database()
