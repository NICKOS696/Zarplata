"""
Расчет данных сводной таблицы для Telegram сообщений
Логика аналогична фронтенду - агрегирует данные агентов для менеджеров
"""
from sqlalchemy.orm import Session
from datetime import date
from calendar import monthrange
import models


def calculate_employee_summary(db: Session, employee_id: int, year: int, month: int) -> dict:
    """
    Рассчитывает данные сотрудника для сводной таблицы
    Для менеджеров агрегирует данные от агентов
    
    Args:
        db: Сессия БД
        employee_id: ID сотрудника
        year: Год
        month: Месяц
        
    Returns:
        Словарь с данными сотрудника
    """
    # Получаем сотрудника
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    
    if not employee:
        return {}
    
    # Формируем период
    period_start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    # Определяем, чьи данные брать (сотрудника или его агентов)
    if employee.position == 'manager':
        # Для менеджера берем данные его агентов
        agents = db.query(models.Employee).filter(
            models.Employee.manager_id == employee_id,
            models.Employee.is_active == True
        ).all()
        employee_ids_for_data = [agent.id for agent in agents]
    else:
        # Для остальных берем данные самого сотрудника
        employee_ids_for_data = [employee_id]
    
    # Получаем планы и факты
    plans = db.query(models.SalesPlan).filter(
        models.SalesPlan.employee_id.in_(employee_ids_for_data),
        models.SalesPlan.period_start >= period_start,
        models.SalesPlan.period_end <= period_end
    ).all()
    
    facts = db.query(models.SalesFact).filter(
        models.SalesFact.employee_id.in_(employee_ids_for_data),
        models.SalesFact.sale_date >= period_start,
        models.SalesFact.sale_date <= period_end
    ).all()
    
    # Получаем резервные заказы
    reserved_orders = db.query(models.ReservedOrders).filter(
        models.ReservedOrders.employee_id.in_(employee_ids_for_data),
        models.ReservedOrders.order_date >= period_start,
        models.ReservedOrders.order_date <= period_end
    ).all()
    
    # Получаем бренды и KPI
    brands = db.query(models.Brand).all()
    kpi_types = db.query(models.KPIType).all()
    
    # Формируем данные по брендам
    brands_data = []
    for brand in brands:
        brand_plans = [p for p in plans if p.brand_id == brand.id and p.kpi_type_id is None]
        brand_facts = [f for f in facts if f.brand_id == brand.id and f.kpi_type_id is None]
        
        plan = sum(p.plan_value for p in brand_plans)
        fact = sum(f.fact_value for f in brand_facts)
        percent = (fact / plan * 100) if plan > 0 else 0
        
        if plan > 0:
            brands_data.append({
                'name': brand.name,
                'plan': plan,
                'fact': fact,
                'percent': percent
            })
    
    # Формируем данные по KPI
    kpis_data = []
    for kpi in kpi_types:
        kpi_plans = [p for p in plans if p.kpi_type_id == kpi.id]
        kpi_facts = [f for f in facts if f.kpi_type_id == kpi.id]
        
        plan = sum(p.plan_value for p in kpi_plans)
        fact = sum(f.fact_value for f in kpi_facts)
        percent = (fact / plan * 100) if plan > 0 else 0
        
        if plan > 0 or not kpi.no_plan:
            kpis_data.append({
                'name': kpi.name,
                'plan': plan,
                'fact': fact,
                'percent': percent
            })
    
    # Общие итоги
    total_plan = sum(p.plan_value for p in plans)
    total_fact = sum(f.fact_value for f in facts)
    total_percent = (total_fact / total_plan * 100) if total_plan > 0 else 0
    total_reserved = sum(r.reserved_value for r in reserved_orders)
    
    # Получаем данные самого сотрудника (не агентов) для зарплаты
    territory = db.query(models.Territory).filter(
        models.Territory.id == employee.territory_id
    ).first()
    
    salary_rule = None
    if employee.salary_rule_id:
        salary_rule = db.query(models.SalaryRule).filter(
            models.SalaryRule.id == employee.salary_rule_id
        ).first()
    
    # Табель
    attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id,
        models.Attendance.year == year,
        models.Attendance.month == month
    ).first()
    
    days_worked = attendance.days_worked if attendance else 0
    
    # Производственный календарь
    work_calendar = db.query(models.WorkCalendar).filter(
        models.WorkCalendar.year == year,
        models.WorkCalendar.month == month
    ).first()
    
    working_days = work_calendar.working_days if work_calendar else 22
    
    # Фикса и дорожные
    fixed_salary = 0
    travel_allowance = 0
    if salary_rule and working_days > 0:
        ratio = days_worked / working_days
        fixed_salary = int((salary_rule.fixed_salary or 0) * ratio)
        travel_allowance = int((salary_rule.travel_allowance or 0) * ratio)
    
    # Бонусы
    bonuses = db.query(models.Bonus).filter(
        models.Bonus.employee_id == employee_id,
        models.Bonus.bonus_date >= period_start,
        models.Bonus.bonus_date <= period_end
    ).all()
    
    total_bonus = sum(b.amount for b in bonuses)
    
    # Прогноз
    forecast_result = 0
    forecast_percent = 0
    plan_per_day = 0
    days_remaining = max(0, working_days - days_worked)
    
    if days_worked > 0 and total_plan > 0:
        daily_average = total_fact / days_worked
        forecast_result = daily_average * working_days
        forecast_percent = (forecast_result / total_plan * 100)
    
    if days_remaining > 0 and total_plan > 0:
        remaining_plan = max(0, total_plan - total_fact)
        plan_per_day = remaining_plan / days_remaining
    
    return {
        'employee_name': employee.full_name,
        'position': employee.position,
        'territory': territory.name if territory else '',
        'fixed_salary': fixed_salary,
        'travel_allowance': travel_allowance,
        'bonus': total_bonus,
        'days_worked': days_worked,
        'working_days': working_days,
        'brands': brands_data,
        'kpis': kpis_data,
        'total_plan': total_plan,
        'total_fact': total_fact,
        'total_percent': total_percent,
        'total_accrual': 0,  # TODO: расчет по мотивационной сетке
        'total_salary': fixed_salary + travel_allowance + total_bonus,
        'order_count': 0,
        'reserved_orders': total_reserved,
        'forecast_result': forecast_result,
        'forecast_percent': forecast_percent,
        'plan_per_day': plan_per_day,
        'days_remaining': days_remaining,
    }
