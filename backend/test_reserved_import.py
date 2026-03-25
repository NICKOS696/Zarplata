"""
Тестовый скрипт для проверки импорта резервных заказов
"""
from database import SessionLocal
from models import ReservedOrders, Employee
from datetime import date
from calendar import monthrange

db = SessionLocal()

try:
    # Проверяем сотрудника
    employee = db.query(Employee).filter(Employee.id == 3).first()
    print(f"Сотрудник найден: ID={employee.id}, name={employee.full_name}, company_id={employee.company_id}")
    
    # Создаем тестовую запись
    year, month = 2026, 3
    last_day = monthrange(year, month)[1]
    order_date = date(year, month, last_day)
    
    test_reserved = ReservedOrders(
        company_id=employee.company_id,
        employee_id=employee.id,
        order_date=order_date,
        reserved_value=2287200.0
    )
    
    db.add(test_reserved)
    print(f"Запись добавлена в сессию")
    
    db.commit()
    print(f"Commit выполнен")
    
    # Проверяем, что запись сохранилась
    saved = db.query(ReservedOrders).filter(
        ReservedOrders.employee_id == 3,
        ReservedOrders.order_date == order_date
    ).all()
    
    print(f"Найдено записей после commit: {len(saved)}")
    for r in saved:
        print(f"  ID={r.id}, Value={r.reserved_value}")
    
except Exception as e:
    print(f"ОШИБКА: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
