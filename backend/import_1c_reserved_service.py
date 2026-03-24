"""
Сервис для импорта резервных заказов из 1С
"""
from sqlalchemy.orm import Session
from typing import Dict
from datetime import date
import models
import crud


def check_reserved_entities(db: Session, parsed_data: Dict) -> Dict:
    """
    Проверяет наличие сотрудников в базе данных
    
    Returns:
        {
            'existing_employees': Dict[str, Employee],  # Найденные сотрудники
            'missing_employees': List[Dict]             # Отсутствующие сотрудники
        }
    """
    result = {
        'existing_employees': {},
        'missing_employees': []
    }
    
    # Проверяем сотрудников
    all_employees = crud.get_employees(db)
    employees_by_name_1c = {emp.name_1c: emp for emp in all_employees if emp.name_1c}
    
    for employee_name_1c in parsed_data['missing_employees']:
        if employee_name_1c in employees_by_name_1c:
            result['existing_employees'][employee_name_1c] = employees_by_name_1c[employee_name_1c]
        else:
            # Извлекаем информацию о сотруднике
            from import_1c_parser import extract_employee_info
            info = extract_employee_info(employee_name_1c)
            result['missing_employees'].append({
                'name_1c': employee_name_1c,
                'full_name': info['full_name'],
                'territory': info['territory'],
                'telegram_id': None
            })
    
    return result


def import_reserved_orders(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """
    Импорт резервных заказов
    
    Args:
        db: Сессия базы данных
        parsed_data: Распарсенные данные из файла
        year: Год
        month: Месяц
        entities: Словарь с существующими сотрудниками
    
    Returns:
        {
            'imported': int,
            'failed': int,
            'errors': List[str]
        }
    """
    imported = 0
    failed = 0
    errors = []
    
    # Определяем период
    period_start = date(year, month, 1)
    from calendar import monthrange
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    # Удаляем ВСЕ старые резервные заказы за этот период перед загрузкой
    deleted_count = db.query(models.ReservedOrders).filter(
        models.ReservedOrders.order_date >= period_start,
        models.ReservedOrders.order_date <= period_end
    ).delete()
    db.commit()
    
    print(f"Удалено старых резервных заказов: {deleted_count}")
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Создаем новую запись резервного заказа (старые уже удалены)
            # Используем последний день месяца как дату заказа
            new_reserved = models.ReservedOrders(
                employee_id=employee.id,
                order_date=period_end,  # Последний день месяца
                reserved_value=record['value']
            )
            db.add(new_reserved)
            imported += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"Ошибка импорта записи: {str(e)}")
    
    db.commit()
    
    return {
        'imported': imported,
        'failed': failed,
        'errors': errors
    }
