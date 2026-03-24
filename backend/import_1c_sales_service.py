"""
Сервис для импорта продаж из 1С
"""
from sqlalchemy.orm import Session
from typing import Dict
from datetime import date
import models
import crud


def check_sales_entities(db: Session, parsed_data: Dict) -> Dict:
    """
    Проверяет наличие сотрудников и брендов в базе данных
    
    Returns:
        {
            'existing_employees': Dict[str, Employee],  # Найденные сотрудники
            'existing_brands': Dict[str, Brand],        # Найденные бренды
            'missing_employees': List[Dict],            # Отсутствующие сотрудники
            'missing_brands': List[str]                 # Отсутствующие бренды
        }
    """
    result = {
        'existing_employees': {},
        'existing_brands': {},
        'missing_employees': [],
        'missing_brands': []
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
    
    # Проверяем бренды
    all_brands = crud.get_brands(db)
    brands_by_name = {brand.name: brand for brand in all_brands}
    brands_by_name_1c = {brand.name_1c: brand for brand in all_brands if brand.name_1c}
    
    for brand_name in parsed_data['missing_brands']:
        # Ищем бренд по имени или name_1c
        brand = brands_by_name.get(brand_name) or brands_by_name_1c.get(brand_name)
        
        if brand:
            result['existing_brands'][brand_name] = brand
        else:
            # Бренд не найден
            if brand_name not in result['missing_brands']:
                result['missing_brands'].append(brand_name)
    
    return result


def import_sales(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """
    Импорт продаж
    
    Args:
        db: Сессия базы данных
        parsed_data: Распарсенные данные из файла
        year: Год
        month: Месяц
        entities: Словарь с существующими сотрудниками и брендами
    
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
    
    # Удаляем ВСЕ старые продажи за этот период перед загрузкой
    deleted_count = db.query(models.SalesFact).filter(
        models.SalesFact.sale_date >= period_start,
        models.SalesFact.sale_date <= period_end
    ).delete()
    db.commit()
    
    print(f"Удалено старых продаж: {deleted_count}")
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Определяем бренд
            brand = entities['existing_brands'].get(record['brand_name'])
            
            if not brand:
                failed += 1
                errors.append(f"Бренд не найден: {record['brand_name']}")
                continue
            
            # Создаем новую запись продажи (старые уже удалены)
            # Используем последний день месяца как дату продажи
            new_sale = models.SalesFact(
                employee_id=employee.id,
                brand_id=brand.id,
                sale_date=period_end,  # Последний день месяца
                fact_value=record['value']
            )
            db.add(new_sale)
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
