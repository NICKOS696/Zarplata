"""
Миграция: добавление полей критериев расчёта отработанных дней в таблицу territories
и создание таблицы daily_order_stats
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Добавляем поля в таблицу territories
        territory_columns = [
            ("work_days_calculation", "VARCHAR DEFAULT 'standard'"),
            ("order_count_threshold_low", "INTEGER DEFAULT 0"),
            ("order_count_threshold_mid", "INTEGER DEFAULT 0"),
            ("order_count_threshold_high", "INTEGER DEFAULT 0"),
            ("order_sum_threshold_low", "REAL DEFAULT 0"),
            ("order_sum_threshold_mid", "REAL DEFAULT 0"),
            ("order_sum_threshold_high", "REAL DEFAULT 0"),
        ]
        
        for col_name, col_type in territory_columns:
            try:
                conn.execute(text(f'ALTER TABLE territories ADD COLUMN {col_name} {col_type}'))
                print(f'Поле {col_name} добавлено в таблицу territories')
            except Exception as e:
                if 'duplicate column name' in str(e).lower():
                    print(f'Поле {col_name} уже существует в territories')
                else:
                    print(f'Ошибка при добавлении {col_name}: {e}')
        
        # Создаём таблицу daily_order_stats
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS daily_order_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    order_date DATE NOT NULL,
                    order_count INTEGER DEFAULT 0,
                    order_sum REAL DEFAULT 0,
                    calculated_day_value REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(id),
                    UNIQUE (employee_id, order_date)
                )
            '''))
            print('Таблица daily_order_stats создана')
        except Exception as e:
            print(f'Ошибка при создании таблицы daily_order_stats: {e}')
        
        # Создаём индексы
        try:
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_daily_order_stats_employee_id ON daily_order_stats(employee_id)'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_daily_order_stats_order_date ON daily_order_stats(order_date)'))
            print('Индексы созданы')
        except Exception as e:
            print(f'Ошибка при создании индексов: {e}')
        
        conn.commit()
        print('Миграция завершена успешно!')

if __name__ == "__main__":
    migrate()
