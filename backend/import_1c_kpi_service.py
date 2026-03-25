"""
Сервис для импорта KPI данных из 1С
"""

from sqlalchemy.orm import Session
from typing import Dict, List
import models
from datetime import date
from calendar import monthrange


def check_kpi_entities(db: Session, parsed_data: Dict) -> Dict:
    """
    Проверяет наличие сотрудников и KPI типов в базе данных
    
    Args:
        db: сессия базы данных
        parsed_data: распарсенные данные из файла
    
    Returns:
        Dict с информацией о найденных и отсутствующих сущностях
    """
    
    # Получаем всех сотрудников из базы
    employees = db.query(models.Employee).all()
    employee_map = {emp.name_1c: emp for emp in employees if emp.name_1c}
    
    # Получаем все KPI типы из базы
    kpi_types = db.query(models.KPIType).all()
    kpi_map = {kpi.name: kpi for kpi in kpi_types}
    kpi_1c_map = {kpi.name_1c: kpi for kpi in kpi_types if kpi.name_1c}
    
    # Проверяем отсутствующих сотрудников
    missing_employees = []
    for emp_name in parsed_data['employees']:
        if emp_name not in employee_map:
            # Парсим территорию из имени
            territory = None
            if '(' in emp_name and ')' in emp_name:
                territory = emp_name[emp_name.rfind('(')+1:emp_name.rfind(')')]
                full_name = emp_name[:emp_name.rfind('(')].strip()
            else:
                full_name = emp_name
            
            missing_employees.append({
                'name_1c': emp_name,
                'full_name': full_name,
                'territory': territory
            })
    
    # Проверяем отсутствующие KPI типы
    missing_kpis = []
    for kpi_name in parsed_data['kpi_types']:
        # Ищем по обычному названию или по name_1c
        if kpi_name not in kpi_map and kpi_name not in kpi_1c_map:
            missing_kpis.append({
                'name': kpi_name,
                'name_1c': kpi_name
            })
    
    return {
        'employees': employee_map,
        'kpi_types': {**kpi_map, **kpi_1c_map},
        'missing_employees': missing_employees,
        'missing_kpis': missing_kpis
    }


def import_kpi_data(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """
    Импортирует KPI данные в базу данных (в факты)
    
    Args:
        db: сессия базы данных
        parsed_data: распарсенные данные
        year: год
        month: месяц
        entities: словарь с сотрудниками и KPI типами
    
    Returns:
        Dict с результатами импорта
    """
    
    # Вычисляем последний день месяца
    last_day = monthrange(year, month)[1]
    period_start = date(year, month, 1)
    period_end = date(year, month, last_day)
    
    imported = 0
    failed = 0
    errors = []
    
    employee_map = entities['employees']
    kpi_map = entities['kpi_types']
    
    # Определяем уникальные KPI типы в загружаемом файле
    kpi_types_in_file = set()
    for record in parsed_data['records']:
        kpi_type = kpi_map.get(record['kpi_name'])
        if kpi_type:
            kpi_types_in_file.add(kpi_type.id)
    
    # Удаляем старые данные ТОЛЬКО по тем KPI, которые есть в файле
    if kpi_types_in_file:
        deleted = db.query(models.SalesFact).filter(
            models.SalesFact.sale_date >= period_start,
            models.SalesFact.sale_date <= period_end,
            models.SalesFact.kpi_type_id.in_(kpi_types_in_file)
        ).delete(synchronize_session=False)
        db.commit()
        print(f"Удалено старых записей KPI: {deleted} (типы: {kpi_types_in_file})")
    else:
        print("Нет валидных KPI в файле для удаления старых данных")
    
    for record in parsed_data['records']:
        try:
            # Находим сотрудника
            employee = employee_map.get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Находим KPI тип (ищем по name или name_1c)
            kpi_type = kpi_map.get(record['kpi_name'])
            if not kpi_type:
                failed += 1
                errors.append(f"KPI тип не найден: {record['kpi_name']}")
                continue
            
            # Создаем новую запись факта KPI (используем последний день месяца)
            new_fact = models.SalesFact(
                company_id=employee.company_id,
                employee_id=employee.id,
                kpi_type_id=kpi_type.id,
                brand_id=None,  # Для KPI бренд не указывается
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
        'deleted': deleted,
        'errors': errors[:10]  # Показываем только первые 10 ошибок
    }
