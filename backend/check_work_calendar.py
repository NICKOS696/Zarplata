from database import SessionLocal
from models import WorkCalendar

db = SessionLocal()
cal = db.query(WorkCalendar).filter(WorkCalendar.year == 2025, WorkCalendar.month == 10).first()
if cal:
    print(f'Октябрь 2025: {cal.working_days} рабочих дней')
else:
    print('Октябрь 2025: НЕ НАЙДЕН в базе')

# Покажем все записи календаря
all_cals = db.query(WorkCalendar).order_by(WorkCalendar.year, WorkCalendar.month).all()
print(f'\nВсего записей в календаре: {len(all_cals)}')
for c in all_cals:
    print(f'{c.year}-{c.month:02d}: {c.working_days} дней')
