"""
Скрипт для применения миграции мультикомпании
"""
import sqlite3
import os

def apply_migration():
    # Путь к базе данных
    db_path = os.path.join(os.path.dirname(__file__), 'sales.db')
    migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_multicompany_support.sql')
    
    if not os.path.exists(db_path):
        print(f"❌ База данных не найдена: {db_path}")
        return False
    
    if not os.path.exists(migration_path):
        print(f"❌ Файл миграции не найден: {migration_path}")
        return False
    
    print(f"📂 База данных: {db_path}")
    print(f"📄 Миграция: {migration_path}")
    
    try:
        # Читаем SQL миграцию
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Выполняем миграцию по частям (SQLite не поддерживает множественные команды в одном execute)
        # Удаляем комментарии и разбиваем на команды
        lines = migration_sql.split('\n')
        clean_lines = []
        for line in lines:
            # Удаляем комментарии
            if '--' in line:
                line = line[:line.index('--')]
            line = line.strip()
            if line:
                clean_lines.append(line)
        
        clean_sql = ' '.join(clean_lines)
        statements = [s.strip() for s in clean_sql.split(';') if s.strip()]
        
        print(f"\n🔄 Применение миграции ({len(statements)} команд)...")
        
        for i, statement in enumerate(statements, 1):
            try:
                cursor.execute(statement)
                # Показываем первые 50 символов команды
                preview = statement[:50].replace('\n', ' ')
                print(f"  ✓ Команда {i}/{len(statements)}: {preview}...")
            except sqlite3.Error as e:
                # Игнорируем ошибки типа "column already exists"
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    preview = statement[:50].replace('\n', ' ')
                    print(f"  ⚠ Команда {i}/{len(statements)} - уже применена: {preview}...")
                else:
                    print(f"  ❌ Ошибка в команде {i}: {e}")
                    print(f"     SQL: {statement[:100]}...")
                    raise
        
        # Сохраняем изменения
        conn.commit()
        
        # Проверяем результат
        cursor.execute("SELECT COUNT(*) FROM companies")
        companies_count = cursor.fetchone()[0]
        
        cursor.execute("PRAGMA table_info(employees)")
        columns = [col[1] for col in cursor.fetchall()]
        has_company_id = 'company_id' in columns
        
        conn.close()
        
        print(f"\n✅ Миграция успешно применена!")
        print(f"   Компаний в базе: {companies_count}")
        print(f"   Поле company_id в employees: {'✓' if has_company_id else '✗'}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Ошибка при применении миграции: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  ПРИМЕНЕНИЕ МИГРАЦИИ МУЛЬТИКОМПАНИИ")
    print("=" * 60)
    
    success = apply_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("  МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("  МИГРАЦИЯ ЗАВЕРШЕНА С ОШИБКАМИ")
        print("=" * 60)
