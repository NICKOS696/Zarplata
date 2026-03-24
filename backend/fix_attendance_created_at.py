"""Исправление: заполнить created_at для записей attendance где NULL"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL
from datetime import datetime

def fix_null_created_at():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Обновляем все записи где created_at IS NULL
        result = conn.execute(text("""
            UPDATE attendance 
            SET created_at = :now 
            WHERE created_at IS NULL
        """), {"now": datetime.now()})
        
        conn.commit()
        
        print(f'✅ Обновлено записей: {result.rowcount}')

if __name__ == '__main__':
    fix_null_created_at()
