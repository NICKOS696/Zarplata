"""
Сервис для импорта данных из 1С
"""
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Dict
import crud
from models import Employee, Brand, KPIType, SalesPlan, SalesFact, ReservedOrders
from import_1c_parser import parse_1c_html, group_by_employee
from import_kpi_facts_temp import import_kpi_facts


def check_missing_entities(db: Session, parsed_data: Dict) -> Dict:
    """
    Проверяет наличие сотрудников, брендов и KPI в базе данных
    
    Returns:
        {
            'missing_employees': List[Dict],  # [{name_1c, full_name, territory}, ...]
            'missing_brands': List[str],
            'missing_kpis': List[str],
            'existing_employees': Dict[str, Employee],
            'existing_brands': Dict[str, Brand],
            'existing_kpis': Dict[str, KPIType]
        }
    """
    result = {
        'missing_employees': [],
        'missing_brands': [],
        'missing_kpis': [],
        'existing_employees': {},
        'existing_brands': {},
        'existing_kpis': {}
    }
    
    # Проверяем сотрудников
    all_employees = crud.get_employees(db)
    employees_by_name_1c = {emp.name_1c: emp for emp in all_employees if emp.name_1c}
    
    print(f"=== ОТЛАДКА СОПОСТАВЛЕНИЯ СОТРУДНИКОВ ===")
    print(f"Всего сотрудников в базе: {len(all_employees)}")
    print(f"Сотрудников с name_1c: {len(employees_by_name_1c)}")
    print(f"Уникальных сотрудников в файле: {len(parsed_data['missing_employees'])}")
    
    # Выводим первые 5 name_1c из базы для проверки
    print(f"Примеры name_1c в базе:")
    for i, (name, emp) in enumerate(list(employees_by_name_1c.items())[:5]):
        print(f"  {i+1}. '{name}' (ID: {emp.id})")
    
    # Выводим первые 5 name_1c из файла для проверки
    print(f"Примеры name_1c в файле:")
    for i, name in enumerate(list(parsed_data['missing_employees'])[:5]):
        print(f"  {i+1}. '{name}'")
    
    # Специальная проверка для Юнусовой
    test_name = 'Юнусова Гавхар Ахмоджоновна [УЧ ТЕПА]'
    print(f"\n🔍 Проверка конкретного сотрудника: '{test_name}'")
    print(f"   Есть в базе: {test_name in employees_by_name_1c}")
    print(f"   Есть в файле: {test_name in parsed_data['missing_employees']}")
    if test_name in employees_by_name_1c:
        emp = employees_by_name_1c[test_name]
        print(f"   ID в базе: {emp.id}, ФИО: {emp.full_name}")
    
    # Создаем словарь для быстрого поиска telegram_id
    employee_telegram_ids = {}
    for record in parsed_data['data']:
        if record['telegram_id']:
            employee_telegram_ids[record['employee_name_1c']] = record['telegram_id']
    
    for employee_name_1c in parsed_data['missing_employees']:
        if employee_name_1c in employees_by_name_1c:
            result['existing_employees'][employee_name_1c] = employees_by_name_1c[employee_name_1c]
        else:
            # Извлекаем ФИО и территорию из первой записи этого сотрудника
            employee_record = next((r for r in parsed_data['data'] if r['employee_name_1c'] == employee_name_1c), None)
            if employee_record:
                result['missing_employees'].append({
                    'name_1c': employee_name_1c,
                    'full_name': employee_record['employee_name'],
                    'territory': employee_record['territory'],
                    'telegram_id': employee_record['telegram_id'],
                    'supervisor': employee_record.get('supervisor'),
                    'manager': employee_record.get('manager')
                })
            else:
                # Fallback на старый метод
                from import_1c_parser import extract_employee_info
                info = extract_employee_info(employee_name_1c)
                result['missing_employees'].append({
                    'name_1c': employee_name_1c,
                    'full_name': info['full_name'],
                    'territory': info['territory'],
                    'telegram_id': None,
                    'supervisor': None,
                    'manager': None
                })
    
    # Проверяем бренды и KPI
    all_brands = crud.get_brands(db)
    brands_by_name = {brand.name: brand for brand in all_brands}
    brands_by_name_1c = {brand.name_1c: brand for brand in all_brands if brand.name_1c}
    
    all_kpis = crud.get_kpi_types(db)
    kpis_by_name = {kpi.name: kpi for kpi in all_kpis}
    kpis_by_name_1c = {kpi.name_1c: kpi for kpi in all_kpis if kpi.name_1c}
    
    # Проверяем каждый товар - он может быть либо брендом, либо KPI
    for item_name in parsed_data['missing_brands']:
        # Ищем сначала в брендах
        brand = brands_by_name.get(item_name) or brands_by_name_1c.get(item_name)
        # Потом в KPI
        kpi = kpis_by_name.get(item_name) or kpis_by_name_1c.get(item_name)
        
        if brand:
            result['existing_brands'][item_name] = brand
        elif kpi:
            result['existing_kpis'][item_name] = kpi
        else:
            # Не найден ни как бренд, ни как KPI
            if item_name not in result['missing_brands']:
                result['missing_brands'].append(item_name)
            if item_name not in result['missing_kpis']:
                result['missing_kpis'].append(item_name)
    
    return result


def import_plans(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """Импорт планов продаж"""
    imported = 0
    failed = 0
    errors = []
    
    # Определяем период
    period_start = date(year, month, 1)
    from calendar import monthrange
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    # Удаляем ВСЕ старые планы за этот период перед загрузкой
    deleted_count = db.query(SalesPlan).filter(
        SalesPlan.period_start == period_start,
        SalesPlan.period_end == period_end
    ).delete()
    db.commit()
    
    print(f"Удалено старых планов: {deleted_count}")
    print(f"Всего записей для импорта: {len(parsed_data['data'])}")
    print(f"Найдено сотрудников: {len(entities['existing_employees'])}")
    print(f"Найдено брендов: {len(entities['existing_brands'])}")
    print(f"Найдено KPI: {len(entities['existing_kpis'])}")
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Определяем бренд или KPI
            brand = entities['existing_brands'].get(record['item_name'])
            kpi = entities['existing_kpis'].get(record['item_name'])
            
            if not brand and not kpi:
                failed += 1
                errors.append(f"Бренд/KPI не найден: {record['item_name']}")
                continue
            
            # Создаем новый план (старые уже удалены)
            new_plan = SalesPlan(
                company_id=employee.company_id,
                employee_id=employee.id,
                brand_id=brand.id if brand else None,
                kpi_type_id=kpi.id if kpi else None,
                period_start=period_start,
                period_end=period_end,
                plan_value=record['value']
            )
            db.add(new_plan)
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


def import_sales(db: Session, parsed_data: Dict, sale_date: date, entities: Dict) -> Dict:
    """Импорт фактических продаж"""
    imported = 0
    failed = 0
    errors = []
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            brand = entities['existing_brands'].get(record['item_name'])
            kpi = entities['existing_kpis'].get(record['item_name'])
            
            if not brand and not kpi:
                failed += 1
                errors.append(f"Бренд/KPI не найден: {record['item_name']}")
                continue
            
            # Создаем или обновляем факт
            existing_fact = db.query(SalesFact).filter(
                SalesFact.employee_id == employee.id,
                SalesFact.brand_id == (brand.id if brand else None),
                SalesFact.kpi_type_id == (kpi.id if kpi else None),
                SalesFact.sale_date == sale_date
            ).first()
            
            if existing_fact:
                existing_fact.fact_value = record['value']
            else:
                new_fact = SalesFact(
                    company_id=employee.company_id,
                    employee_id=employee.id,
                    brand_id=brand.id if brand else None,
                    kpi_type_id=kpi.id if kpi else None,
                    sale_date=sale_date,
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


def import_reserved_orders(db: Session, parsed_data: Dict, year: int, month: int, entities: Dict) -> Dict:
    """Импорт резервных заказов из 7-столбцового формата"""
    from calendar import monthrange
    
    imported = 0
    failed = 0
    errors = []
    
    # Определяем период (используем последний день месяца)
    period_start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    order_date = date(year, month, last_day)
    
    # Удаляем старые резервные заказы за этот месяц
    deleted = db.query(ReservedOrders).filter(
        ReservedOrders.order_date >= period_start,
        ReservedOrders.order_date <= order_date
    ).delete(synchronize_session=False)
    db.commit()
    print(f"Удалено старых резервных заказов: {deleted}")
    
    for record in parsed_data['data']:
        try:
            employee = entities['existing_employees'].get(record['employee_name_1c'])
            if not employee:
                failed += 1
                errors.append(f"Сотрудник не найден: {record['employee_name_1c']}")
                continue
            
            # Для резервных заказов нужен только сотрудник и сумма (без брендов/KPI)
            # Создаем новую запись резервного заказа (старые уже удалены)
            new_reserved = ReservedOrders(
                company_id=employee.company_id,
                employee_id=employee.id,
                order_date=order_date,
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
