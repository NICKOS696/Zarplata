"""
Миграция для добавления грейдовой системы фиксированной оплаты
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Добавляем новые колонки для грейдовой системы
        columns_to_add = [
            ("fixed_salary_type", "VARCHAR DEFAULT 'classic'"),
            ("grade_trainee_salary", "FLOAT DEFAULT 0.0"),
            ("grade_trainee_condition", "VARCHAR DEFAULT 'orders'"),
            ("grade_trainee_threshold", "FLOAT DEFAULT 0.0"),
            ("grade_professional_salary", "FLOAT DEFAULT 0.0"),
            ("grade_professional_condition", "VARCHAR DEFAULT 'orders'"),
            ("grade_professional_threshold", "FLOAT DEFAULT 0.0"),
            ("grade_expert_salary", "FLOAT DEFAULT 0.0"),
            ("grade_expert_condition", "VARCHAR DEFAULT 'orders'"),
            ("grade_expert_threshold", "FLOAT DEFAULT 0.0"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE salary_rules ADD COLUMN {col_name} {col_type}"))
                print(f"Добавлена колонка: {col_name}")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"Колонка {col_name} уже существует")
                else:
                    print(f"Ошибка добавления {col_name}: {e}")
        
        conn.commit()
        print("\n✅ Миграция завершена!")

if __name__ == "__main__":
    migrate()
