"""Применение миграции: attendance.days_worked -> REAL (SQLite)

Запускать из папки backend:
python apply_attendance_days_worked_float_migration.py
"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL


def apply_migration():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        with open('migrations/attendance_days_worked_float_sqlite.sql', 'r', encoding='utf-8') as f:
            sql = f.read()

        # Выполняем пачкой, SQLite нормально воспринимает несколько statements через executescript,
        # но в SQLAlchemy используем raw_connection.
        raw = conn.connection
        raw.executescript(sql)

    print('✅ Миграция attendance.days_worked -> REAL применена')


if __name__ == '__main__':
    apply_migration()
