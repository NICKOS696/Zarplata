from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date
import models
import schemas


# Company CRUD
def get_company(db: Session, company_id: int):
    return db.query(models.Company).filter(models.Company.id == company_id).first()


def get_companies(db: Session, is_active: Optional[bool] = None):
    query = db.query(models.Company)
    if is_active is not None:
        query = query.filter(models.Company.is_active == is_active)
    return query.all()


def create_company(db: Session, company: schemas.CompanyCreate):
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def update_company(db: Session, company_id: int, company: schemas.CompanyUpdate):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company:
        update_data = company.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_company, key, value)
        db.commit()
        db.refresh(db_company)
    return db_company


def delete_company(db: Session, company_id: int):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company:
        db.delete(db_company)
        db.commit()
    return db_company


# Territory CRUD
def get_territory(db: Session, territory_id: int):
    return db.query(models.Territory).filter(models.Territory.id == territory_id).first()


def get_territories(db: Session, is_active: Optional[bool] = None):
    query = db.query(models.Territory).order_by(models.Territory.sort_order)
    if is_active is not None:
        query = query.filter(models.Territory.is_active == is_active)
    return query.all()


def create_territory(db: Session, territory: schemas.TerritoryCreate):
    db_territory = models.Territory(**territory.model_dump())
    db.add(db_territory)
    db.commit()
    db.refresh(db_territory)
    return db_territory


def update_territory(db: Session, territory_id: int, territory: schemas.TerritoryUpdate):
    db_territory = db.query(models.Territory).filter(models.Territory.id == territory_id).first()
    if db_territory:
        update_data = territory.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_territory, key, value)
        db.commit()
        db.refresh(db_territory)
    return db_territory


def delete_territory(db: Session, territory_id: int):
    db_territory = db.query(models.Territory).filter(models.Territory.id == territory_id).first()
    if db_territory:
        db.delete(db_territory)
        db.commit()
    return db_territory


def reorder_territories(db: Session, territory_orders: List[dict]):
    """Обновить порядок территорий"""
    for item in territory_orders:
        territory = db.query(models.Territory).filter(models.Territory.id == item['id']).first()
        if territory:
            territory.sort_order = item['sort_order']
    db.commit()
    return True


# Employee CRUD
def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()


def get_employee_by_telegram(db: Session, telegram_id: str):
    return db.query(models.Employee).filter(models.Employee.telegram_id == telegram_id).first()


def get_employees(db: Session, skip: int = 0, limit: int = 10000, is_active: Optional[bool] = None):
    query = db.query(models.Employee)
    if is_active is not None:
        query = query.filter(models.Employee.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def update_employee(db: Session, employee_id: int, employee: schemas.EmployeeUpdate):
    db_employee = get_employee(db, employee_id)
    if db_employee:
        update_data = employee.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee


def delete_employee(db: Session, employee_id: int):
    db_employee = get_employee(db, employee_id)
    if db_employee:
        db_employee.is_active = False
        db.commit()
    return db_employee


# Brand CRUD
def get_brand(db: Session, brand_id: int):
    return db.query(models.Brand).filter(models.Brand.id == brand_id).first()


def get_brands(db: Session, skip: int = 0, limit: int = 10000, is_active: Optional[bool] = None):
    query = db.query(models.Brand)
    if is_active is not None:
        query = query.filter(models.Brand.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def create_brand(db: Session, brand: schemas.BrandCreate):
    db_brand = models.Brand(**brand.model_dump())
    db.add(db_brand)
    db.commit()
    db.refresh(db_brand)
    return db_brand


def update_brand(db: Session, brand_id: int, brand: schemas.BrandCreate):
    db_brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if db_brand:
        for key, value in brand.model_dump().items():
            setattr(db_brand, key, value)
        db.commit()
        db.refresh(db_brand)
    return db_brand


def delete_brand(db: Session, brand_id: int):
    db_brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if db_brand:
        db.delete(db_brand)
        db.commit()
    return db_brand


# KPI Type CRUD
def get_kpi_type(db: Session, kpi_type_id: int):
    return db.query(models.KPIType).filter(models.KPIType.id == kpi_type_id).first()


def get_kpi_types(db: Session, skip: int = 0, limit: int = 10000, is_active: Optional[bool] = None):
    query = db.query(models.KPIType)
    if is_active is not None:
        query = query.filter(models.KPIType.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def create_kpi_type(db: Session, kpi_type: schemas.KPITypeCreate):
    db_kpi_type = models.KPIType(**kpi_type.model_dump())
    db.add(db_kpi_type)
    db.commit()
    db.refresh(db_kpi_type)
    return db_kpi_type


def update_kpi_type(db: Session, kpi_type_id: int, kpi_type: schemas.KPITypeCreate):
    db_kpi_type = db.query(models.KPIType).filter(models.KPIType.id == kpi_type_id).first()
    if db_kpi_type:
        for key, value in kpi_type.model_dump().items():
            setattr(db_kpi_type, key, value)
        db.commit()
        db.refresh(db_kpi_type)
    return db_kpi_type


def delete_kpi_type(db: Session, kpi_type_id: int):
    db_kpi_type = db.query(models.KPIType).filter(models.KPIType.id == kpi_type_id).first()
    if db_kpi_type:
        db.delete(db_kpi_type)
        db.commit()
    return db_kpi_type


# Sales Plan CRUD
def get_sales_plan(db: Session, plan_id: int):
    return db.query(models.SalesPlan).filter(models.SalesPlan.id == plan_id).first()


def get_sales_plans(
    db: Session,
    employee_id: Optional[int] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000
):
    query = db.query(models.SalesPlan)
    if employee_id:
        query = query.filter(models.SalesPlan.employee_id == employee_id)
    if period_start:
        query = query.filter(models.SalesPlan.period_start >= period_start)
    if period_end:
        query = query.filter(models.SalesPlan.period_end <= period_end)
    return query.offset(skip).limit(limit).all()


def create_sales_plan(db: Session, plan: schemas.SalesPlanCreate):
    db_plan = models.SalesPlan(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


def create_sales_plans_bulk(db: Session, plans: List[schemas.SalesPlanCreate]):
    db_plans = [models.SalesPlan(**plan.model_dump()) for plan in plans]
    db.add_all(db_plans)
    db.commit()
    return db_plans


def update_sales_plan(db: Session, plan_id: int, plan: schemas.SalesPlanCreate):
    db_plan = db.query(models.SalesPlan).filter(models.SalesPlan.id == plan_id).first()
    if db_plan:
        for key, value in plan.model_dump().items():
            setattr(db_plan, key, value)
        db.commit()
        db.refresh(db_plan)
    return db_plan


def delete_sales_plan(db: Session, plan_id: int):
    db_plan = db.query(models.SalesPlan).filter(models.SalesPlan.id == plan_id).first()
    if db_plan:
        db.delete(db_plan)
        db.commit()
    return db_plan


# Sales Fact CRUD
def get_sales_fact(db: Session, fact_id: int):
    return db.query(models.SalesFact).filter(models.SalesFact.id == fact_id).first()


def get_sales_facts(
    db: Session,
    employee_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000
):
    query = db.query(models.SalesFact)
    if employee_id:
        query = query.filter(models.SalesFact.employee_id == employee_id)
    if brand_id:
        query = query.filter(models.SalesFact.brand_id == brand_id)
    if date_from:
        query = query.filter(models.SalesFact.sale_date >= date_from)
    if date_to:
        query = query.filter(models.SalesFact.sale_date <= date_to)
    return query.offset(skip).limit(limit).all()


def create_sales_fact(db: Session, fact: schemas.SalesFactCreate):
    db_fact = models.SalesFact(**fact.model_dump())
    db.add(db_fact)
    db.commit()
    db.refresh(db_fact)
    return db_fact


def create_sales_facts_bulk(db: Session, facts: List[schemas.SalesFactCreate]):
    db_facts = [models.SalesFact(**fact.model_dump()) for fact in facts]
    db.add_all(db_facts)
    db.commit()
    return db_facts


# Work Calendar CRUD
def get_work_calendar(db: Session, year: int, month: int):
    return db.query(models.WorkCalendar).filter(
        models.WorkCalendar.year == year,
        models.WorkCalendar.month == month
    ).first()


def get_work_calendars(db: Session, year: Optional[int] = None):
    query = db.query(models.WorkCalendar)
    if year:
        query = query.filter(models.WorkCalendar.year == year)
    return query.order_by(models.WorkCalendar.year, models.WorkCalendar.month).all()


def create_work_calendar(db: Session, calendar: schemas.WorkCalendarCreate):
    db_calendar = models.WorkCalendar(**calendar.model_dump())
    db.add(db_calendar)
    db.commit()
    db.refresh(db_calendar)
    return db_calendar


def update_work_calendar(db: Session, year: int, month: int, calendar: schemas.WorkCalendarUpdate):
    db_calendar = get_work_calendar(db, year, month)
    if db_calendar:
        update_data = calendar.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_calendar, key, value)
        db.commit()
        db.refresh(db_calendar)
    return db_calendar


# Attendance CRUD (обновленная версия - по месяцам)
def get_attendance(db: Session, attendance_id: int):
    return db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()


def get_attendance_by_employee_month(db: Session, employee_id: int, year: int, month: int):
    return db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id,
        models.Attendance.year == year,
        models.Attendance.month == month
    ).first()


def get_attendance_records(
    db: Session,
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000
):
    query = db.query(models.Attendance)
    if employee_id:
        query = query.filter(models.Attendance.employee_id == employee_id)
    if year:
        query = query.filter(models.Attendance.year == year)
    if month:
        query = query.filter(models.Attendance.month == month)
    return query.offset(skip).limit(limit).all()


def create_attendance(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(**attendance.model_dump())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


def update_attendance(db: Session, attendance_id: int, attendance: schemas.AttendanceUpdate):
    db_attendance = get_attendance(db, attendance_id)
    if db_attendance:
        update_data = attendance.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_attendance, key, value)
        db.commit()
        db.refresh(db_attendance)
    return db_attendance


# Salary Rule CRUD
def get_salary_rule(db: Session, rule_id: int):
    return db.query(models.SalaryRule).filter(models.SalaryRule.id == rule_id).first()


def get_salary_rules(db: Session, position: Optional[str] = None, is_active: Optional[bool] = True):
    query = db.query(models.SalaryRule)
    if position:
        query = query.filter(models.SalaryRule.position == position)
    if is_active is not None:
        query = query.filter(models.SalaryRule.is_active == is_active)
    return query.all()


def create_salary_rule(db: Session, rule: schemas.SalaryRuleCreate):
    db_rule = models.SalaryRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


def update_salary_rule(db: Session, rule_id: int, rule: schemas.SalaryRuleUpdate):
    db_rule = db.query(models.SalaryRule).filter(models.SalaryRule.id == rule_id).first()
    if db_rule:
        update_data = rule.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_rule, key, value)
        db.commit()
        db.refresh(db_rule)
    return db_rule


def delete_salary_rule(db: Session, rule_id: int):
    db_rule = db.query(models.SalaryRule).filter(models.SalaryRule.id == rule_id).first()
    if db_rule:
        db.delete(db_rule)
        db.commit()
    return db_rule


# Salary Calculation CRUD
def get_salary_calculation(db: Session, calculation_id: int):
    return db.query(models.SalaryCalculation).filter(models.SalaryCalculation.id == calculation_id).first()


def get_salary_calculations(
    db: Session,
    employee_id: Optional[int] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000
):
    query = db.query(models.SalaryCalculation)
    if employee_id:
        query = query.filter(models.SalaryCalculation.employee_id == employee_id)
    if period_start:
        query = query.filter(models.SalaryCalculation.period_start >= period_start)
    if period_end:
        query = query.filter(models.SalaryCalculation.period_end <= period_end)
    return query.offset(skip).limit(limit).all()


def create_salary_calculation(db: Session, calculation: schemas.SalaryCalculationBase):
    db_calculation = models.SalaryCalculation(**calculation.model_dump())
    db.add(db_calculation)
    db.commit()
    db.refresh(db_calculation)
    return db_calculation


def mark_salary_sent(db: Session, calculation_id: int):
    db_calculation = get_salary_calculation(db, calculation_id)
    if db_calculation:
        db_calculation.is_sent = True
        db.commit()
        db.refresh(db_calculation)
    return db_calculation


# Import Log CRUD
def create_import_log(db: Session, log: schemas.ImportLogCreate):
    db_log = models.ImportLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_import_logs(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.ImportLog).order_by(models.ImportLog.created_at.desc()).offset(skip).limit(limit).all()


# Absence CRUD
def get_absence(db: Session, absence_id: int):
    return db.query(models.Absence).filter(models.Absence.id == absence_id).first()


def get_absences(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 1000
):
    query = db.query(models.Absence)
    if employee_id:
        query = query.filter(models.Absence.employee_id == employee_id)
    if date_from:
        query = query.filter(models.Absence.absence_date >= date_from)
    if date_to:
        query = query.filter(models.Absence.absence_date <= date_to)
    return query.order_by(models.Absence.absence_date.desc()).offset(skip).limit(limit).all()


def create_absence(db: Session, absence: schemas.AbsenceCreate):
    db_absence = models.Absence(**absence.model_dump())
    db.add(db_absence)
    db.commit()
    db.refresh(db_absence)
    return db_absence


def update_absence(db: Session, absence_id: int, absence: schemas.AbsenceUpdate):
    db_absence = db.query(models.Absence).filter(models.Absence.id == absence_id).first()
    if db_absence:
        update_data = absence.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_absence, key, value)
        db.commit()
        db.refresh(db_absence)
    return db_absence


def delete_absence(db: Session, absence_id: int):
    db_absence = db.query(models.Absence).filter(models.Absence.id == absence_id).first()
    if db_absence:
        db.delete(db_absence)
        db.commit()
    return db_absence


# Bonus CRUD
def get_bonus(db: Session, bonus_id: int):
    return db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()


def get_bonuses(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 1000
):
    query = db.query(models.Bonus)
    if employee_id:
        query = query.filter(models.Bonus.employee_id == employee_id)
    if date_from:
        query = query.filter(models.Bonus.bonus_date >= date_from)
    if date_to:
        query = query.filter(models.Bonus.bonus_date <= date_to)
    return query.order_by(models.Bonus.bonus_date.desc()).offset(skip).limit(limit).all()


def create_bonus(db: Session, bonus: schemas.BonusCreate):
    db_bonus = models.Bonus(**bonus.model_dump())
    db.add(db_bonus)
    db.commit()
    db.refresh(db_bonus)
    return db_bonus


def update_bonus(db: Session, bonus_id: int, bonus: schemas.BonusUpdate):
    db_bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if db_bonus:
        update_data = bonus.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_bonus, key, value)
        db.commit()
        db.refresh(db_bonus)
    return db_bonus


def delete_bonus(db: Session, bonus_id: int):
    db_bonus = db.query(models.Bonus).filter(models.Bonus.id == bonus_id).first()
    if db_bonus:
        db.delete(db_bonus)
        db.commit()
    return db_bonus


# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    from auth import get_password_hash
    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=user.role,
        company_id=user.company_id,
        employee_id=user.employee_id,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    from auth import get_password_hash
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        update_data = user.model_dump(exclude_unset=True)
        # Если обновляется пароль, хешируем его
        if 'password' in update_data:
            update_data['password_hash'] = get_password_hash(update_data.pop('password'))
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user


# DailyOrderStats CRUD
def get_daily_order_stats(db: Session, employee_id: int, order_date: date):
    return db.query(models.DailyOrderStats).filter(
        and_(
            models.DailyOrderStats.employee_id == employee_id,
            models.DailyOrderStats.order_date == order_date
        )
    ).first()


def get_daily_order_stats_by_period(db: Session, employee_id: int, date_from: date, date_to: date):
    return db.query(models.DailyOrderStats).filter(
        and_(
            models.DailyOrderStats.employee_id == employee_id,
            models.DailyOrderStats.order_date >= date_from,
            models.DailyOrderStats.order_date <= date_to
        )
    ).all()


def get_all_daily_order_stats_by_period(db: Session, date_from: date, date_to: date):
    return db.query(models.DailyOrderStats).filter(
        and_(
            models.DailyOrderStats.order_date >= date_from,
            models.DailyOrderStats.order_date <= date_to
        )
    ).all()


def create_or_update_daily_order_stats(db: Session, stats: schemas.DailyOrderStatsCreate):
    existing = get_daily_order_stats(db, stats.employee_id, stats.order_date)
    if existing:
        existing.order_count = stats.order_count
        existing.order_sum = stats.order_sum
        existing.calculated_day_value = stats.calculated_day_value
        db.commit()
        db.refresh(existing)
        return existing
    else:
        db_stats = models.DailyOrderStats(**stats.model_dump())
        db.add(db_stats)
        db.commit()
        db.refresh(db_stats)
        return db_stats


def delete_daily_order_stats_by_period(db: Session, employee_id: int, date_from: date, date_to: date):
    db.query(models.DailyOrderStats).filter(
        and_(
            models.DailyOrderStats.employee_id == employee_id,
            models.DailyOrderStats.order_date >= date_from,
            models.DailyOrderStats.order_date <= date_to
        )
    ).delete()
    db.commit()
