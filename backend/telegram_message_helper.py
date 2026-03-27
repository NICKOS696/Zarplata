"""
Вспомогательные функции для формирования данных сотрудника для Telegram сообщений
"""
from sqlalchemy.orm import Session
from datetime import date
from calendar import monthrange
import models


def get_employee_telegram_data(db: Session, employee_id: int, year: int, month: int) -> dict:
    """
    Получает данные сотрудника для подстановки в шаблон Telegram сообщения
    
    Args:
        db: Сессия БД
        employee_id: ID сотрудника
        year: Год
        month: Месяц
        
    Returns:
        Словарь с данными для подстановки в шаблон
    """
    # Получаем сотрудника
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return {}
    
    # Формируем период
    period_start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    # Получаем территорию
    territory = db.query(models.Territory).filter(models.Territory.id == employee.territory_id).first()
    
    # Получаем правило зарплаты
    salary_rule = None
    if employee.salary_rule_id:
        salary_rule = db.query(models.SalaryRule).filter(models.SalaryRule.id == employee.salary_rule_id).first()
    
    # Получаем табель
    attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id,
        models.Attendance.year == year,
        models.Attendance.month == month
    ).first()
    
    days_worked = attendance.days_worked if attendance else 0
    
    # Получаем производственный календарь
    work_calendar = db.query(models.WorkCalendar).filter(
        models.WorkCalendar.year == year,
        models.WorkCalendar.month == month
    ).first()
    
    working_days = work_calendar.working_days if work_calendar else 22
    
    # Рассчитываем фиксу и дорожные пропорционально отработанным дням
    fixed_salary = 0
    travel_allowance = 0
    if salary_rule and working_days > 0:
        ratio = days_worked / working_days
        fixed_salary = int((salary_rule.fixed_salary or 0) * ratio)
        travel_allowance = int((salary_rule.travel_allowance or 0) * ratio)
    
    # Получаем бонусы
    bonuses = db.query(models.Bonus).filter(
        models.Bonus.employee_id == employee_id,
        models.Bonus.bonus_date >= period_start,
        models.Bonus.bonus_date <= period_end
    ).all()
    
    total_bonus = sum(b.amount for b in bonuses)
    
    # Получаем планы и факты
    plans = db.query(models.SalesPlan).filter(
        models.SalesPlan.employee_id == employee_id,
        models.SalesPlan.period_start >= period_start,
        models.SalesPlan.period_end <= period_end
    ).all()
    
    facts = db.query(models.SalesFact).filter(
        models.SalesFact.employee_id == employee_id,
        models.SalesFact.sale_date >= period_start,
        models.SalesFact.sale_date <= period_end
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
        
        if plan > 0:  # Показываем только бренды с планом
            brands_data.append({
                'name': brand.name,
                'plan': plan,
                'fact': fact,
                'percent': percent,
                'accrual': 0  # TODO: рассчитать начисление по мотивационной сетке
            })
    
    # Формируем данные по KPI
    kpis_data = []
    for kpi in kpi_types:
        kpi_plans = [p for p in plans if p.kpi_type_id == kpi.id]
        kpi_facts = [f for f in facts if f.kpi_type_id == kpi.id]
        
        plan = sum(p.plan_value for p in kpi_plans)
        fact = sum(f.fact_value for f in kpi_facts)
        percent = (fact / plan * 100) if plan > 0 else 0
        
        if plan > 0 or not kpi.no_plan:  # Показываем KPI с планом или без флага no_plan
            kpis_data.append({
                'name': kpi.name,
                'plan': plan,
                'fact': fact,
                'percent': percent,
                'accrual': 0  # TODO: рассчитать начисление по мотивационной сетке
            })
    
    # Получаем резервные заказы
    reserved_orders = db.query(models.ReservedOrders).filter(
        models.ReservedOrders.employee_id == employee_id,
        models.ReservedOrders.order_date >= period_start,
        models.ReservedOrders.order_date <= period_end
    ).all()
    
    total_reserved = sum(r.reserved_value for r in reserved_orders)
    
    # Общие итоги
    total_plan = sum(p.plan_value for p in plans)
    total_fact = sum(f.fact_value for f in facts)
    total_percent = (total_fact / total_plan * 100) if total_plan > 0 else 0
    total_accrual = sum(b['accrual'] for b in brands_data) + sum(k['accrual'] for k in kpis_data)
    
    # Итоговая зарплата
    total_salary = fixed_salary + travel_allowance + total_bonus + total_accrual
    
    # Прогноз
    forecast_result = 0
    forecast_percent = 0
    plan_per_day = 0
    days_remaining = max(0, working_days - days_worked)
    
    if days_worked > 0:
        daily_average = total_fact / days_worked
        forecast_result = daily_average * working_days
        forecast_percent = (forecast_result / total_plan * 100) if total_plan > 0 else 0
    
    if days_remaining > 0:
        remaining_plan = max(0, total_plan - total_fact)
        plan_per_day = remaining_plan / days_remaining
    
    # Количество заявок (если есть)
    order_count = 0  # TODO: добавить подсчет заявок если нужно
    
    return {
        'employee_name': employee.full_name,
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
        'total_accrual': total_accrual,
        'total_salary': total_salary,
        'order_count': order_count,
        'reserved_orders': total_reserved,
        'forecast_result': forecast_result,
        'forecast_percent': forecast_percent,
        'plan_per_day': plan_per_day,
        'days_remaining': days_remaining,
    }
