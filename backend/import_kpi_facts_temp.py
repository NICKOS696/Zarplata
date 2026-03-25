"""
Функция для импорта KPI из 7-столбцового формата
"""
from sqlalchemy.orm import Session
from datetime import date
from typing import Dict
from models import SalesFact


def import_kpi_facts(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """Импорт фактов KPI из 7-столбцового формата"""
    from calendar import monthrange
    
    imported = 0
    failed = 0
    errors = []
    
    # Определяем период
    period_start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    # Определяем уникальные KPI типы в загружаемом файле
    kpi_types_in_file = set()
    for record in parsed_data['data']:
        kpi = entities['existing_kpis'].get(record['item_name'])
        if kpi:
            kpi_types_in_file.add(kpi.id)
    
    # Удаляем старые данные ТОЛЬКО по тем KPI, которые есть в файле
    if kpi_types_in_file:
        deleted = db.query(SalesFact).filter(
            SalesFact.sale_date >= period_start,
            SalesFact.sale_date <= period_end,
            SalesFact.kpi_type_id.in_(kpi_types_in_file)
        ).delete(synchronize_session=False)
        db.commit()
        print(f"Удалено старых записей KPI: {deleted} (типы: {kpi_types_in_file})")
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Ищем только KPI (не бренды)
            kpi = entities['existing_kpis'].get(record['item_name'])
            
            if not kpi:
                failed += 1
                errors.append(f"KPI не найден: {record['item_name']}")
                continue
            
            # Создаем новую запись факта KPI
            new_fact = SalesFact(
                company_id=employee.company_id,
                employee_id=employee.id,
                kpi_type_id=kpi.id,
                brand_id=None,
                sale_date=period_end,  # Последний день месяца
                fact_value=record['value']
            )
            db.add(new_fact)
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
