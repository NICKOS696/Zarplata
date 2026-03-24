"""
Скрипт для применения миграции табеля
Использует SQLAlchemy для создания таблиц из моделей
"""
from sqlalchemy import create_engine, inspect, text
from database import DATABASE_URL, Base
import models  # Импортируем модели

def apply_migration():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    try:
        with engine.connect() as conn:
            # 1. Добавляем новые колонки в employees
            existing_columns = [col['name'] for col in inspector.get_columns('employees')]
            
            columns_to_add = [
                ('hire_date', 'DATE'),
                ('termination_date', 'DATE'),
                ('probation_days', 'INTEGER DEFAULT 0')
            ]
            
            added_columns = []
            for col_name, col_type in columns_to_add:
                if col_name not in existing_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE employees ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        added_columns.append(col_name)
                        print(f"   ✓ Добавлена колонка {col_name}")
                    except Exception as e:
                        print(f"   ⚠️  Ошибка при добавлении {col_name}: {e}")
                else:
                    print(f"   ⚠️  Колонка {col_name} уже существует")
        
        # 2. Создаем новые таблицы через SQLAlchemy
        existing_tables = inspector.get_table_names()
        created_tables = []
        
        if 'absences' not in existing_tables:
            models.Absence.__table__.create(engine)
            created_tables.append('absences')
            print("   ✓ Создана таблица absences")
        else:
            print("   ⚠️  Таблица absences уже существует")
            
        if 'bonuses' not in existing_tables:
            models.Bonus.__table__.create(engine)
            created_tables.append('bonuses')
            print("   ✓ Создана таблица bonuses")
        else:
            print("   ⚠️  Таблица bonuses уже существует")
        
        print("\n✅ Миграция успешно применена!")
        if added_columns:
            print(f"   - Добавлены поля в employees: {', '.join(added_columns)}")
        if created_tables:
            print(f"   - Созданы таблицы: {', '.join(created_tables)}")
        
    except Exception as e:
        print(f"\n❌ Ошибка при применении миграции: {e}")
        raise

if __name__ == "__main__":
    apply_migration()
