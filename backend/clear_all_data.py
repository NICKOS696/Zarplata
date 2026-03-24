"""
Скрипт для очистки всех данных в базе данных, кроме пользователя admin
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models

def clear_all_data():
    db = SessionLocal()
    try:
        print("Начинаем очистку базы данных...")
        
        # Удаляем данные в правильном порядке (с учетом внешних ключей)
        
        # 1. Удаляем статистику заказов
        count = db.query(models.DailyOrderStats).delete()
        print(f"Удалено DailyOrderStats: {count}")
        
        # 2. Удаляем логи импорта
        count = db.query(models.ImportLog).delete()
        print(f"Удалено ImportLog: {count}")
        
        # 3. Удаляем бонусы
        count = db.query(models.Bonus).delete()
        print(f"Удалено Bonus: {count}")
        
        # 4. Удаляем отсутствия
        count = db.query(models.Absence).delete()
        print(f"Удалено Absence: {count}")
        
        # 5. Удаляем посещаемость
        count = db.query(models.Attendance).delete()
        print(f"Удалено Attendance: {count}")
        
        # 6. Удаляем факты продаж
        count = db.query(models.SalesFact).delete()
        print(f"Удалено SalesFact: {count}")
        
        # 7. Удаляем планы продаж
        count = db.query(models.SalesPlan).delete()
        print(f"Удалено SalesPlan: {count}")
        
        # 8. Удаляем резервы
        count = db.query(models.ReservedOrders).delete()
        print(f"Удалено ReservedOrders: {count}")
        
        # 9. Удаляем расчеты зарплаты
        count = db.query(models.SalaryCalculation).delete()
        print(f"Удалено SalaryCalculation: {count}")
        
        # 11. Удаляем сотрудников
        count = db.query(models.Employee).delete()
        print(f"Удалено Employee: {count}")
        
        # 12. Удаляем правила зарплаты
        count = db.query(models.SalaryRule).delete()
        print(f"Удалено SalaryRule: {count}")
        
        # 13. Удаляем производственный календарь
        count = db.query(models.WorkCalendar).delete()
        print(f"Удалено WorkCalendar: {count}")
        
        # 14. Удаляем типы KPI
        count = db.query(models.KPIType).delete()
        print(f"Удалено KPIType: {count}")
        
        # 15. Удаляем бренды
        count = db.query(models.Brand).delete()
        print(f"Удалено Brand: {count}")
        
        # 16. Удаляем территории
        count = db.query(models.Territory).delete()
        print(f"Удалено Territory: {count}")
        
        # 17. Удаляем пользователей кроме admin
        count = db.query(models.User).filter(models.User.username != 'admin').delete()
        print(f"Удалено User (кроме admin): {count}")
        
        # 18. Удаляем компании
        count = db.query(models.Company).delete()
        print(f"Удалено Company: {count}")
        
        db.commit()
        print("\n✅ База данных успешно очищена!")
        print("Остался только пользователь admin")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    confirm = input("Вы уверены, что хотите удалить ВСЕ данные кроме admin? (yes/no): ")
    if confirm.lower() == 'yes':
        clear_all_data()
    else:
        print("Отменено")
