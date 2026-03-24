"""Исправление NULL значений created_at в таблице attendance"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def fix_null_created_at():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Обновляем все записи с NULL created_at
        result = conn.execute(text("""
            UPDATE attendance 
            SET created_at = CURRENT_TIMESTAMP 
            WHERE created_at IS NULL
        """))
        conn.commit()
        
        print(f'✅ Обновлено записей: {result.rowcount}')

if __name__ == '__main__':
    fix_null_created_at()
