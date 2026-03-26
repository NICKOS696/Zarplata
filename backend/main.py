from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import os
from dotenv import load_dotenv

import models
import schemas
import crud
from database import engine, get_db
from salary_calculator import SalaryCalculator
from html_parser import HTMLParser1C
from auth import get_current_user

# Загружаем переменные окружения
load_dotenv()

# Создаем таблицы в БД
models.Base.metadata.create_all(bind=engine)

# Создаем приложение FastAPI
app = FastAPI(
    title="Sales & Salary Management System",
    description="Система учета продаж и расчета зарплаты",
    version="1.0.0"
)

# Настройка CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все origins для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== EMPLOYEES ====================

@app.get("/api/employees", response_model=List[schemas.Employee])
def read_employees(
    request: Request,
    skip: int = 0,
    limit: int = 10000,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список сотрудников с учетом прав доступа"""
    from auth import get_accessible_employee_ids
    
    # Получаем список доступных ID сотрудников для текущего пользователя
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    # Получаем всех сотрудников
    all_employees = crud.get_employees(db, skip=skip, limit=limit, is_active=is_active)
    
    # Фильтруем по доступным ID
    filtered_employees = [emp for emp in all_employees if emp.id in accessible_ids]
    
    return filtered_employees


@app.get("/api/employees/{employee_id}", response_model=schemas.Employee)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    """Получить сотрудника по ID"""
    employee = crud.get_employee(db, employee_id=employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@app.post("/api/employees", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    """Создать нового сотрудника"""
    return crud.create_employee(db=db, employee=employee)


@app.put("/api/employees/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    employee: schemas.EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Обновить данные сотрудника"""
    db_employee = crud.update_employee(db, employee_id=employee_id, employee=employee)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db_employee


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Деактивировать сотрудника"""
    db_employee = crud.delete_employee(db, employee_id=employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deactivated successfully"}


@app.post("/api/employees/bulk-delete")
def bulk_delete_employees(employee_ids: List[int], db: Session = Depends(get_db)):
    """Массовое удаление сотрудников"""
    deleted_count = 0
    errors = []
    
    for employee_id in employee_ids:
        try:
            employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
            if employee:
                # Удаляем все связанные данные перед удалением сотрудника
                db.query(models.SalesPlan).filter(models.SalesPlan.employee_id == employee_id).delete()
                db.query(models.SalesFact).filter(models.SalesFact.employee_id == employee_id).delete()
                db.query(models.ReservedOrders).filter(models.ReservedOrders.employee_id == employee_id).delete()
                db.query(models.Attendance).filter(models.Attendance.employee_id == employee_id).delete()
                db.query(models.SalaryCalculation).filter(models.SalaryCalculation.employee_id == employee_id).delete()
                
                # Теперь удаляем самого сотрудника
                db.delete(employee)
                deleted_count += 1
            else:
                errors.append(f"Сотрудник с ID {employee_id} не найден")
        except Exception as e:
            db.rollback()
            errors.append(f"Ошибка удаления сотрудника {employee_id}: {str(e)}")
    
    db.commit()
    
    return {
        "deleted": deleted_count,
        "errors": errors,
        "message": f"Удалено сотрудников: {deleted_count}"
    }


@app.post("/api/employees/bulk-assign-salary-rule")
def bulk_assign_salary_rule(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """Массовое назначение правила зарплаты для выбранных сотрудников"""
    employee_ids = request_data.get('employee_ids', [])
    salary_rule_id = request_data.get('salary_rule_id')
    updated_count = 0
    errors = []
    
    # Проверяем существование правила зарплаты
    salary_rule = db.query(models.SalaryRule).filter(models.SalaryRule.id == salary_rule_id).first()
    if not salary_rule:
        raise HTTPException(status_code=404, detail="Правило зарплаты не найдено")
    
    for employee_id in employee_ids:
        try:
            employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
            if employee:
                employee.salary_rule_id = salary_rule_id
                updated_count += 1
            else:
                errors.append(f"Сотрудник с ID {employee_id} не найден")
        except Exception as e:
            db.rollback()
            errors.append(f"Ошибка обновления сотрудника {employee_id}: {str(e)}")
    
    db.commit()
    
    return {
        "updated": updated_count,
        "errors": errors,
        "message": f"Обновлено сотрудников: {updated_count}"
    }


# ==================== ABSENCES ====================

@app.get("/api/absences", response_model=List[schemas.Absence])
def read_absences(
    request: Request,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 1000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список пропусков с учетом прав доступа"""
    from auth import get_accessible_employee_ids
    
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    absences = crud.get_absences(db, employee_id=employee_id, date_from=date_from, date_to=date_to, skip=skip, limit=limit)
    
    # Фильтруем по доступным сотрудникам
    filtered_absences = [abs for abs in absences if abs.employee_id in accessible_ids]
    
    return filtered_absences


@app.get("/api/absences/{absence_id}", response_model=schemas.Absence)
def read_absence(absence_id: int, db: Session = Depends(get_db)):
    """Получить пропуск по ID"""
    absence = crud.get_absence(db, absence_id=absence_id)
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    return absence


@app.post("/api/absences", response_model=schemas.Absence)
def create_absence(absence: schemas.AbsenceCreate, db: Session = Depends(get_db)):
    """Создать новый пропуск"""
    return crud.create_absence(db=db, absence=absence)


@app.put("/api/absences/{absence_id}", response_model=schemas.Absence)
def update_absence(
    absence_id: int,
    absence: schemas.AbsenceUpdate,
    db: Session = Depends(get_db)
):
    """Обновить пропуск"""
    db_absence = crud.update_absence(db, absence_id=absence_id, absence=absence)
    if not db_absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    return db_absence


@app.delete("/api/absences/{absence_id}")
def delete_absence(absence_id: int, db: Session = Depends(get_db)):
    """Удалить пропуск"""
    db_absence = crud.delete_absence(db, absence_id=absence_id)
    if not db_absence:
        raise HTTPException(status_code=404, detail="Absence not found")
    return {"message": "Absence deleted successfully"}


# ==================== BONUSES ====================

@app.get("/api/bonuses", response_model=List[schemas.Bonus])
def read_bonuses(
    request: Request,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 1000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список бонусов с учетом прав доступа"""
    from auth import get_accessible_employee_ids
    
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    bonuses = crud.get_bonuses(db, employee_id=employee_id, date_from=date_from, date_to=date_to, skip=skip, limit=limit)
    
    # Фильтруем по доступным сотрудникам
    filtered_bonuses = [bonus for bonus in bonuses if bonus.employee_id in accessible_ids]
    
    return filtered_bonuses


@app.get("/api/bonuses/{bonus_id}", response_model=schemas.Bonus)
def read_bonus(bonus_id: int, db: Session = Depends(get_db)):
    """Получить бонус по ID"""
    bonus = crud.get_bonus(db, bonus_id=bonus_id)
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")
    return bonus


@app.post("/api/bonuses", response_model=schemas.Bonus)
def create_bonus(bonus: schemas.BonusCreate, db: Session = Depends(get_db)):
    """Создать новый бонус"""
    return crud.create_bonus(db=db, bonus=bonus)


@app.put("/api/bonuses/{bonus_id}", response_model=schemas.Bonus)
def update_bonus(
    bonus_id: int,
    bonus: schemas.BonusUpdate,
    db: Session = Depends(get_db)
):
    """Обновить бонус"""
    db_bonus = crud.update_bonus(db, bonus_id=bonus_id, bonus=bonus)
    if not db_bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")
    return db_bonus


@app.delete("/api/bonuses/{bonus_id}")
def delete_bonus(bonus_id: int, db: Session = Depends(get_db)):
    """Удалить бонус"""
    db_bonus = crud.delete_bonus(db, bonus_id=bonus_id)
    if not db_bonus:
        raise HTTPException(status_code=404, detail="Bonus not found")
    return {"message": "Bonus deleted successfully"}


# ==================== TIMESHEET CALCULATIONS ====================

@app.post("/api/timesheet/calculate-attendance")
def calculate_attendance_from_timesheet(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    """
    Автоматический расчет посещаемости по табелю
    Учитывает: дату приема, пропуски, стажировку, текущую дату
    """
    from datetime import datetime, date as date_type
    from calendar import monthrange
    
    # Получаем производственный календарь
    work_calendar = crud.get_work_calendar(db, year, month)
    if not work_calendar:
        raise HTTPException(status_code=404, detail="Производственный календарь не найден")
    
    total_work_days = work_calendar.working_days
    
    # Даты периода
    first_day = date_type(year, month, 1)
    last_day = date_type(year, month, monthrange(year, month)[1])
    today = datetime.now().date()
    
    # Если текущая дата в этом месяце, используем её как конец периода
    period_end = min(today, last_day)
    
    # Получаем всех активных сотрудников
    employees = crud.get_employees(db, is_active=True)
    
    # Получаем все пропуски за этот месяц
    absences = crud.get_absences(db, date_from=first_day, date_to=last_day)
    absences_by_employee = {}
    for absence in absences:
        if absence.employee_id not in absences_by_employee:
            absences_by_employee[absence.employee_id] = []
        absences_by_employee[absence.employee_id].append(absence.absence_date)
    
    results = []
    
    for employee in employees:
        # Определяем дату начала работы в этом месяце
        if employee.hire_date:
            hire_date = employee.hire_date if isinstance(employee.hire_date, date_type) else datetime.strptime(employee.hire_date, '%Y-%m-%d').date()
            start_date = max(hire_date, first_day)
        else:
            start_date = first_day
        
        # Если сотрудник еще не начал работать в этом месяце, пропускаем
        if start_date > period_end:
            continue
        
        # Если сотрудник уволен до начала месяца, пропускаем
        if employee.termination_date:
            term_date = employee.termination_date if isinstance(employee.termination_date, date_type) else datetime.strptime(employee.termination_date, '%Y-%m-%d').date()
            if term_date < first_day:
                continue
            # Если уволен в середине месяца, учитываем это
            period_end_for_employee = min(term_date, period_end)
        else:
            period_end_for_employee = period_end
        
        # Считаем рабочие дни с начала работы до текущей даты (или до конца месяца)
        # Точный расчет: считаем будние дни (пн-пт) в диапазоне
        from datetime import timedelta
        current_date = start_date
        work_days_for_employee = 0
        
        while current_date <= period_end_for_employee:
            # Считаем только будние дни (0=Monday, 6=Sunday)
            if current_date.weekday() < 5:  # Пн-Пт
                work_days_for_employee += 1
            current_date += timedelta(days=1)
        
        # Вычитаем пропуски
        employee_absences = absences_by_employee.get(employee.id, [])
        absence_count = len([a for a in employee_absences if start_date <= a <= period_end_for_employee])
        
        work_days_for_employee -= absence_count
        
        # Учитываем стажировку (дни стажировки считаются как 0.5)
        probation_days = employee.probation_days or 0
        if probation_days > 0:
            # Если дни стажировки попадают в текущий период
            from datetime import timedelta
            probation_end = start_date + timedelta(days=probation_days - 1)
            
            # Считаем сколько рабочих дней стажировки в текущем периоде
            probation_work_days = 0
            current = start_date
            while current <= min(probation_end, period_end_for_employee):
                if current.weekday() < 5:  # Пн-Пт
                    probation_work_days += 1
                current += timedelta(days=1)
            
            # Вычитаем половину рабочих дней стажировки (т.к. они считаются как 0.5)
            work_days_for_employee -= probation_work_days * 0.5
        
        # Округляем до 1 знака после запятой
        work_days_for_employee = round(work_days_for_employee, 1)
        
        results.append({
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "calculated_days": work_days_for_employee,
            "total_days_in_month": total_work_days,
            "absences_count": absence_count,
            "probation_days": probation_days,
            "hire_date": str(employee.hire_date) if employee.hire_date else None,
            "termination_date": str(employee.termination_date) if employee.termination_date else None,
        })
    
    return {
        "year": year,
        "month": month,
        "period_end": str(period_end),
        "total_work_days": total_work_days,
        "employees": results
    }


# ==================== COMPANIES ====================

@app.get("/api/companies", response_model=List[schemas.Company])
def read_companies(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Получить список компаний"""
    companies = crud.get_companies(db, is_active=is_active)
    return companies


@app.get("/api/companies/{company_id}", response_model=schemas.Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    """Получить компанию по ID"""
    company = crud.get_company(db, company_id=company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@app.post("/api/companies", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    """Создать новую компанию"""
    return crud.create_company(db=db, company=company)


@app.put("/api/companies/{company_id}", response_model=schemas.Company)
def update_company(company_id: int, company: schemas.CompanyUpdate, db: Session = Depends(get_db)):
    """Обновить компанию"""
    db_company = crud.get_company(db, company_id=company_id)
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return crud.update_company(db=db, company_id=company_id, company=company)


@app.delete("/api/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """Удалить компанию"""
    db_company = crud.get_company(db, company_id=company_id)
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    crud.delete_company(db=db, company_id=company_id)
    return {"message": "Company deleted successfully"}


# ==================== TERRITORIES ====================

@app.get("/api/territories", response_model=List[schemas.Territory])
def read_territories(
    request: Request,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список территорий/структуры компании с фильтрацией по компании"""
    from auth import get_user_company_id
    company_id = get_user_company_id(current_user, request)
    
    territories = crud.get_territories(db, is_active=is_active)
    
    # Фильтруем по company_id если указан
    if company_id:
        territories = [t for t in territories if t.company_id == company_id]
    
    return territories


@app.post("/api/territories", response_model=schemas.Territory)
def create_territory(territory: schemas.TerritoryCreate, db: Session = Depends(get_db)):
    """Создать новую территорию"""
    return crud.create_territory(db=db, territory=territory)


@app.get("/api/territories/{territory_id}", response_model=schemas.Territory)
def read_territory(territory_id: int, db: Session = Depends(get_db)):
    """Получить территорию по ID"""
    territory = crud.get_territory(db, territory_id=territory_id)
    if territory is None:
        raise HTTPException(status_code=404, detail="Territory not found")
    return territory


@app.put("/api/territories/{territory_id}", response_model=schemas.Territory)
def update_territory(territory_id: int, territory: schemas.TerritoryUpdate, db: Session = Depends(get_db)):
    """Обновить территорию"""
    db_territory = crud.get_territory(db, territory_id=territory_id)
    if db_territory is None:
        raise HTTPException(status_code=404, detail="Territory not found")
    return crud.update_territory(db=db, territory_id=territory_id, territory=territory)


@app.delete("/api/territories/{territory_id}")
def delete_territory(territory_id: int, db: Session = Depends(get_db)):
    """Удалить территорию"""
    db_territory = crud.get_territory(db, territory_id=territory_id)
    if db_territory is None:
        raise HTTPException(status_code=404, detail="Territory not found")
    crud.delete_territory(db=db, territory_id=territory_id)
    return {"message": "Territory deleted successfully"}


@app.post("/api/territories/bulk-delete")
def bulk_delete_territories(territory_ids: List[int], db: Session = Depends(get_db)):
    """Массовое удаление территорий"""
    deleted_count = 0
    errors = []
    
    for territory_id in territory_ids:
        try:
            territory = db.query(models.Territory).filter(models.Territory.id == territory_id).first()
            if territory:
                # Удаляем территорию
                db.delete(territory)
                deleted_count += 1
            else:
                errors.append(f"Территория с ID {territory_id} не найдена")
        except Exception as e:
            db.rollback()
            errors.append(f"Ошибка удаления территории {territory_id}: {str(e)}")
    
    db.commit()
    
    return {
        "deleted": deleted_count,
        "errors": errors,
        "message": f"Удалено территорий: {deleted_count}"
    }


@app.post("/api/territories/bulk-update-criteria")
def bulk_update_territory_criteria(
    data: dict,
    db: Session = Depends(get_db)
):
    """Массовое обновление критериев расчёта отработанных дней для территорий"""
    territory_ids = data.get("territory_ids", [])
    criteria = data.get("criteria", {})
    
    updated_count = 0
    errors = []
    
    for territory_id in territory_ids:
        try:
            territory = db.query(models.Territory).filter(models.Territory.id == territory_id).first()
            if territory:
                if "work_days_calculation" in criteria:
                    territory.work_days_calculation = criteria["work_days_calculation"]
                if "order_count_threshold_low" in criteria:
                    territory.order_count_threshold_low = criteria["order_count_threshold_low"]
                if "order_count_threshold_mid" in criteria:
                    territory.order_count_threshold_mid = criteria["order_count_threshold_mid"]
                if "order_count_threshold_high" in criteria:
                    territory.order_count_threshold_high = criteria["order_count_threshold_high"]
                if "order_sum_threshold_low" in criteria:
                    territory.order_sum_threshold_low = criteria["order_sum_threshold_low"]
                if "order_sum_threshold_mid" in criteria:
                    territory.order_sum_threshold_mid = criteria["order_sum_threshold_mid"]
                if "order_sum_threshold_high" in criteria:
                    territory.order_sum_threshold_high = criteria["order_sum_threshold_high"]
                updated_count += 1
            else:
                errors.append(f"Территория с ID {territory_id} не найдена")
        except Exception as e:
            errors.append(f"Ошибка обновления территории {territory_id}: {str(e)}")
    
    db.commit()
    
    return {
        "updated": updated_count,
        "errors": errors,
        "message": f"Обновлено территорий: {updated_count}"
    }


@app.post("/api/territories/reorder")
def reorder_territories(territory_orders: List[dict], db: Session = Depends(get_db)):
    """Изменить порядок территорий"""
    crud.reorder_territories(db=db, territory_orders=territory_orders)
    return {"message": "Territories reordered successfully"}


# ==================== BRANDS ====================

@app.get("/api/brands", response_model=List[schemas.Brand])
def read_brands(
    request: Request,
    skip: int = 0,
    limit: int = 10000,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список брендов с фильтрацией по компании"""
    from auth import get_user_company_id
    company_id = get_user_company_id(current_user, request)
    
    brands = crud.get_brands(db, skip=skip, limit=limit, is_active=is_active)
    
    # Фильтруем по company_id если указан
    if company_id:
        brands = [b for b in brands if b.company_id == company_id]
    
    return brands


@app.post("/api/brands", response_model=schemas.Brand)
def create_brand(brand: schemas.BrandCreate, db: Session = Depends(get_db)):
    """Создать новый бренд"""
    return crud.create_brand(db=db, brand=brand)


@app.put("/api/brands/{brand_id}", response_model=schemas.Brand)
def update_brand(brand_id: int, brand: schemas.BrandCreate, db: Session = Depends(get_db)):
    """Обновить бренд"""
    db_brand = crud.get_brand(db, brand_id=brand_id)
    if db_brand is None:
        raise HTTPException(status_code=404, detail="Brand not found")
    return crud.update_brand(db=db, brand_id=brand_id, brand=brand)


@app.delete("/api/brands/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    """Удалить бренд"""
    db_brand = crud.get_brand(db, brand_id=brand_id)
    if db_brand is None:
        raise HTTPException(status_code=404, detail="Brand not found")
    crud.delete_brand(db=db, brand_id=brand_id)
    return {"message": "Brand deleted successfully"}


# ==================== KPI TYPES ====================

@app.get("/api/kpi-types", response_model=List[schemas.KPIType])
def read_kpi_types(
    request: Request,
    skip: int = 0,
    limit: int = 10000,
    is_active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список типов KPI с фильтрацией по компании"""
    from auth import get_user_company_id
    company_id = get_user_company_id(current_user, request)
    
    kpi_types = crud.get_kpi_types(db, skip=skip, limit=limit, is_active=is_active)
    
    # Фильтруем по company_id если указан
    if company_id:
        kpi_types = [k for k in kpi_types if k.company_id == company_id]
    
    return kpi_types


@app.post("/api/kpi-types", response_model=schemas.KPIType)
def create_kpi_type(kpi_type: schemas.KPITypeCreate, db: Session = Depends(get_db)):
    """Создать новый тип KPI"""
    return crud.create_kpi_type(db=db, kpi_type=kpi_type)


@app.put("/api/kpi-types/{kpi_type_id}", response_model=schemas.KPIType)
def update_kpi_type(kpi_type_id: int, kpi_type: schemas.KPITypeCreate, db: Session = Depends(get_db)):
    """Обновить тип KPI"""
    db_kpi = crud.get_kpi_type(db, kpi_type_id=kpi_type_id)
    if db_kpi is None:
        raise HTTPException(status_code=404, detail="KPI Type not found")
    return crud.update_kpi_type(db=db, kpi_type_id=kpi_type_id, kpi_type=kpi_type)


@app.delete("/api/kpi-types/{kpi_type_id}")
def delete_kpi_type(kpi_type_id: int, db: Session = Depends(get_db)):
    """Удалить тип KPI"""
    db_kpi = crud.get_kpi_type(db, kpi_type_id=kpi_type_id)
    if db_kpi is None:
        raise HTTPException(status_code=404, detail="KPI Type not found")
    crud.delete_kpi_type(db=db, kpi_type_id=kpi_type_id)
    return {"message": "KPI Type deleted successfully"}


# ==================== SALES PLANS ====================

@app.get("/api/sales-plans", response_model=List[schemas.SalesPlan])
def read_sales_plans(
    request: Request,
    employee_id: Optional[int] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить планы продаж с фильтрацией по компании"""
    from auth import get_accessible_employee_ids
    
    # Получаем доступные ID сотрудников
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    plans = crud.get_sales_plans(
        db,
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
        skip=skip,
        limit=limit
    )
    
    # Фильтруем по доступным сотрудникам
    plans = [p for p in plans if p.employee_id in accessible_ids]
    
    return plans


@app.post("/api/sales-plans", response_model=schemas.SalesPlan)
def create_sales_plan(plan: schemas.SalesPlanCreate, db: Session = Depends(get_db)):
    """Создать план продаж"""
    return crud.create_sales_plan(db=db, plan=plan)


@app.post("/api/sales-plans/bulk", response_model=List[schemas.SalesPlan])
def create_sales_plans_bulk(plans: List[schemas.SalesPlanCreate], db: Session = Depends(get_db)):
    """Массовое создание планов продаж"""
    return crud.create_sales_plans_bulk(db=db, plans=plans)


@app.get("/api/sales-plans/{plan_id}", response_model=schemas.SalesPlan)
def read_sales_plan(plan_id: int, db: Session = Depends(get_db)):
    """Получить план по ID"""
    plan = crud.get_sales_plan(db, plan_id=plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Sales plan not found")
    return plan


@app.put("/api/sales-plans/{plan_id}", response_model=schemas.SalesPlan)
def update_sales_plan(plan_id: int, plan: schemas.SalesPlanCreate, db: Session = Depends(get_db)):
    """Обновить план продаж"""
    db_plan = crud.get_sales_plan(db, plan_id=plan_id)
    if db_plan is None:
        raise HTTPException(status_code=404, detail="Sales plan not found")
    return crud.update_sales_plan(db=db, plan_id=plan_id, plan=plan)


@app.delete("/api/sales-plans/{plan_id}")
def delete_sales_plan(plan_id: int, db: Session = Depends(get_db)):
    """Удалить план продаж"""
    db_plan = crud.get_sales_plan(db, plan_id=plan_id)
    if db_plan is None:
        raise HTTPException(status_code=404, detail="Sales plan not found")
    crud.delete_sales_plan(db=db, plan_id=plan_id)
    return {"message": "Sales plan deleted successfully"}


# ==================== SALES FACTS ====================

@app.get("/api/sales-facts", response_model=List[schemas.SalesFact])
def read_sales_facts(
    request: Request,
    employee_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить факты продаж с фильтрацией по компании"""
    from auth import get_accessible_employee_ids
    
    # Получаем доступные ID сотрудников
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    facts = crud.get_sales_facts(
        db,
        employee_id=employee_id,
        brand_id=brand_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit
    )
    
    # Фильтруем по доступным сотрудникам
    facts = [f for f in facts if f.employee_id in accessible_ids]
    
    return facts


@app.post("/api/sales-facts", response_model=schemas.SalesFact)
def create_sales_fact(fact: schemas.SalesFactCreate, db: Session = Depends(get_db)):
    """Создать факт продажи"""
    return crud.create_sales_fact(db=db, fact=fact)


@app.post("/api/sales-facts/bulk", response_model=List[schemas.SalesFact])
def create_sales_facts_bulk(facts: List[schemas.SalesFactCreate], db: Session = Depends(get_db)):
    """Массовое создание фактов продаж"""
    return crud.create_sales_facts_bulk(db=db, facts=facts)


# ==================== RESERVED ORDERS ====================

@app.get("/api/reserved-orders")
def read_reserved_orders(
    request: Request,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить резервные заказы с фильтрацией по компании"""
    from auth import get_accessible_employee_ids
    
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    query = db.query(models.ReservedOrders)
    
    if employee_id:
        query = query.filter(models.ReservedOrders.employee_id == employee_id)
    if date_from:
        query = query.filter(models.ReservedOrders.order_date >= date_from)
    if date_to:
        query = query.filter(models.ReservedOrders.order_date <= date_to)
    
    orders = query.all()
    
    # Фильтруем по доступным сотрудникам
    filtered_orders = [o for o in orders if o.employee_id in accessible_ids]
    
    return filtered_orders


# ==================== IMPORT FROM 1C ====================

@app.post("/api/import/sales-html")
async def import_sales_from_html(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Импорт продаж из HTML файла 1С с учётом текущей компании"""
    from auth import get_user_company_id
    
    try:
        company_id = get_user_company_id(current_user, request)
        
        contents = await file.read()
        parser = HTMLParser1C()
        parsed_data = parser.parse_sales_from_bytes(contents)
        
        # Маппинг имен сотрудников на ID (только для текущей компании)
        employees = crud.get_employees(db, is_active=True)
        if company_id:
            employees = [e for e in employees if e.company_id == company_id]
        employee_map = {emp.full_name: emp.id for emp in employees}
        # Также добавляем маппинг по name_1c
        employee_map_1c = {emp.name_1c: emp.id for emp in employees if emp.name_1c}
        
        # Маппинг брендов (только для текущей компании)
        brands = crud.get_brands(db, is_active=True)
        if company_id:
            brands = [b for b in brands if b.company_id == company_id]
        brand_map = {brand.name: brand.id for brand in brands}
        # Также добавляем маппинг по name_1c
        brand_map_1c = {brand.name_1c: brand.id for brand in brands if brand.name_1c}
        
        # Маппинг KPI (только для текущей компании)
        kpi_types = crud.get_kpi_types(db, is_active=True)
        if company_id:
            kpi_types = [k for k in kpi_types if k.company_id == company_id]
        kpi_map = {kpi.name: kpi.id for kpi in kpi_types}
        # Также добавляем маппинг по name_1c
        kpi_map_1c = {kpi.name_1c: kpi.id for kpi in kpi_types if kpi.name_1c}
        
        # Создаем факты продаж
        imported_count = 0
        failed_count = 0
        errors = []
        
        for record in parsed_data:
            try:
                # Поиск сотрудника: сначала по name_1c, потом по full_name
                employee_id = employee_map_1c.get(record['employee_name']) or employee_map.get(record['employee_name'])
                if not employee_id:
                    # Пытаемся найти по частичному совпадению
                    for emp_name, emp_id in employee_map.items():
                        if record['employee_name'] in emp_name or emp_name in record['employee_name']:
                            employee_id = emp_id
                            break
                
                if not employee_id:
                    failed_count += 1
                    errors.append(f"Сотрудник не найден: {record['employee_name']}")
                    continue
                
                # Поиск бренда: сначала по name_1c, потом по name
                brand_id = None
                if record.get('brand_name'):
                    brand_id = brand_map_1c.get(record['brand_name']) or brand_map.get(record['brand_name'])
                
                # Поиск KPI: сначала по name_1c, потом по name
                kpi_id = None
                if record.get('kpi_name'):
                    kpi_id = kpi_map_1c.get(record['kpi_name']) or kpi_map.get(record['kpi_name'])
                
                fact = schemas.SalesFactCreate(
                    employee_id=employee_id,
                    brand_id=brand_id,
                    kpi_type_id=kpi_id,
                    sale_date=record['sale_date'],
                    fact_value=record['fact_value']
                )
                
                crud.create_sales_fact(db, fact)
                imported_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Ошибка импорта записи: {str(e)}")
        
        # Логируем импорт
        log = schemas.ImportLogCreate(
            import_type="sales",
            file_name=file.filename,
            records_imported=imported_count,
            records_failed=failed_count,
            status="success" if failed_count == 0 else "partial",
            error_message="; ".join(errors[:10]) if errors else None
        )
        crud.create_import_log(db, log)
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "failed": failed_count,
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@app.post("/api/import/attendance-html")
async def import_attendance_from_html(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Импорт табеля из HTML файла 1С"""
    try:
        contents = await file.read()
        parser = HTMLParser1C()
        parsed_data = parser.parse_attendance_from_bytes(contents)
        
        # Маппинг сотрудников
        employees = crud.get_employees(db, is_active=True)
        employee_map = {emp.full_name: emp.id for emp in employees}
        
        imported_count = 0
        failed_count = 0
        errors = []
        
        for record in parsed_data:
            try:
                employee_id = employee_map.get(record['employee_name'])
                if not employee_id:
                    for emp_name, emp_id in employee_map.items():
                        if record['employee_name'] in emp_name or emp_name in record['employee_name']:
                            employee_id = emp_id
                            break
                
                if not employee_id:
                    failed_count += 1
                    errors.append(f"Сотрудник не найден: {record['employee_name']}")
                    continue
                
                attendance = schemas.AttendanceCreate(
                    employee_id=employee_id,
                    work_date=record['work_date'],
                    is_present=record['is_present'],
                    hours_worked=record['hours_worked']
                )
                
                crud.create_attendance(db, attendance)
                imported_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Ошибка импорта записи: {str(e)}")
        
        log = schemas.ImportLogCreate(
            import_type="attendance",
            file_name=file.filename,
            records_imported=imported_count,
            records_failed=failed_count,
            status="success" if failed_count == 0 else "partial",
            error_message="; ".join(errors[:10]) if errors else None
        )
        crud.create_import_log(db, log)
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "failed": failed_count,
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@app.post("/api/import/orders-html")
async def import_orders_from_html(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Импорт статистики заказов из HTML файла 1С для расчёта отработанных дней.
    Формат файла: Дата | Торговый агент | Количество заказов | Сумма заказов
    """
    from auth import get_user_company_id
    from bs4 import BeautifulSoup
    from datetime import datetime
    
    try:
        company_id = get_user_company_id(current_user, request)
        
        contents = await file.read()
        soup = BeautifulSoup(contents, 'html.parser')
        
        # Получаем сотрудников текущей компании
        employees = crud.get_employees(db, is_active=True)
        if company_id:
            employees = [e for e in employees if e.company_id == company_id]
        
        # Маппинг по name_1c и full_name
        employee_map = {emp.full_name: emp for emp in employees}
        employee_map_1c = {emp.name_1c: emp for emp in employees if emp.name_1c}
        
        # Получаем территории для определения типа расчёта
        territories = crud.get_territories(db)
        territory_map = {t.id: t for t in territories}
        
        imported_count = 0
        skipped_count = 0
        failed_count = 0
        errors = []
        
        # Парсим таблицу
        table = soup.find('table')
        if not table:
            raise HTTPException(status_code=400, detail="Таблица не найдена в файле")
        
        rows = table.find_all('tr')[1:]  # Пропускаем заголовок
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 4:
                continue
            
            try:
                # Парсим данные из строки
                date_str = cells[0].get_text(strip=True)
                employee_name = cells[1].get_text(strip=True)
                order_count = int(cells[2].get_text(strip=True).replace(' ', '').replace(',', '') or 0)
                order_sum = float(cells[3].get_text(strip=True).replace(' ', '').replace(',', '.') or 0)
                
                # Парсим дату (формат ДД.ММ.ГГГГ)
                try:
                    order_date = datetime.strptime(date_str, '%d.%m.%Y').date()
                except:
                    try:
                        order_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    except:
                        failed_count += 1
                        errors.append(f"Неверный формат даты: {date_str}")
                        continue
                
                # Ищем сотрудника
                employee = employee_map_1c.get(employee_name) or employee_map.get(employee_name)
                if not employee:
                    # Частичное совпадение
                    for emp_name, emp in employee_map.items():
                        if employee_name in emp_name or emp_name in employee_name:
                            employee = emp
                            break
                
                if not employee:
                    failed_count += 1
                    errors.append(f"Сотрудник не найден: {employee_name}")
                    continue
                
                # Проверяем тип расчёта территории
                territory = territory_map.get(employee.territory_id)
                if not territory or territory.work_days_calculation != 'criteria':
                    skipped_count += 1
                    continue  # Пропускаем сотрудников со стандартным расчётом
                
                # Рассчитываем значение дня по критериям
                day_value = 0.0
                
                # По количеству заказов
                if order_count >= territory.order_count_threshold_high:
                    day_value += 0.5
                elif order_count >= territory.order_count_threshold_mid:
                    day_value += 0.25
                elif order_count < territory.order_count_threshold_low:
                    day_value += 0
                
                # По сумме заказов
                if order_sum >= territory.order_sum_threshold_high:
                    day_value += 0.5
                elif order_sum >= territory.order_sum_threshold_mid:
                    day_value += 0.25
                elif order_sum < territory.order_sum_threshold_low:
                    day_value += 0
                
                # Ограничиваем максимум 1.0
                day_value = min(day_value, 1.0)
                
                # Сохраняем статистику
                stats = schemas.DailyOrderStatsCreate(
                    employee_id=employee.id,
                    order_date=order_date,
                    order_count=order_count,
                    order_sum=order_sum,
                    calculated_day_value=day_value
                )
                crud.create_or_update_daily_order_stats(db, stats)
                imported_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Ошибка обработки строки: {str(e)}")
        
        return {
            "message": "Импорт завершён",
            "imported": imported_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "errors": errors[:10]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка импорта: {str(e)}")


@app.post("/api/import/order-count-html")
async def import_order_count_from_html(
    request: Request,
    file: UploadFile = File(...),
    year: int = Query(...),
    month: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Импорт количества заявок из HTML файла для табеля.
    Формат файла: Сотрудник | Количество заявок
    """
    from auth import get_user_company_id
    from bs4 import BeautifulSoup
    
    try:
        company_id = get_user_company_id(current_user, request)
        
        contents = await file.read()
        soup = BeautifulSoup(contents, 'html.parser')
        
        # Получаем сотрудников текущей компании
        employees = crud.get_employees(db, is_active=True)
        if company_id:
            employees = [e for e in employees if e.company_id == company_id]
        
        # Маппинг по name_1c и full_name
        employee_map = {emp.full_name: emp for emp in employees}
        employee_map_1c = {emp.name_1c: emp for emp in employees if emp.name_1c}
        
        imported_count = 0
        failed_count = 0
        errors = []
        
        # Парсим таблицу
        table = soup.find('table')
        if not table:
            raise HTTPException(status_code=400, detail="Таблица не найдена в файле")
        
        rows = table.find_all('tr')[1:]  # Пропускаем заголовок
        
        # Группируем по сотрудникам и считаем заявки с суммой > 0
        from collections import defaultdict
        employee_order_counts = defaultdict(int)
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 4:  # Нужно минимум 4 столбца (Пользователь, № заказа, Заявка, Сумма)
                continue
            
            try:
                # Парсим данные из строки
                employee_name = cells[0].get_text(strip=True)
                # Столбец 4: Сумма (индекс 3)
                sum_text = cells[3].get_text(strip=True).replace(' ', '').replace('\xa0', '').replace(',', '.')
                
                # Проверяем сумму
                try:
                    sum_value = float(sum_text) if sum_text else 0
                except ValueError:
                    sum_value = 0
                
                # Считаем только строки с суммой > 0
                if sum_value <= 0:
                    continue
                
                # Ищем сотрудника
                employee = employee_map_1c.get(employee_name) or employee_map.get(employee_name)
                if not employee:
                    # Частичное совпадение
                    for emp_name, emp in employee_map.items():
                        if employee_name in emp_name or emp_name in employee_name:
                            employee = emp
                            break
                
                if not employee:
                    continue  # Пропускаем, если сотрудник не найден
                
                # Увеличиваем счетчик заявок для этого сотрудника
                employee_order_counts[employee.id] += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Ошибка обработки строки: {str(e)}")
        
        # Сохраняем результаты для каждого сотрудника
        for employee_id, order_count in employee_order_counts.items():
            try:
                # Обновляем или создаём запись табеля
                existing = db.query(models.Attendance).filter(
                    models.Attendance.employee_id == employee_id,
                    models.Attendance.year == year,
                    models.Attendance.month == month
                ).first()
                
                if existing:
                    existing.order_count = order_count
                else:
                    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
                    new_attendance = models.Attendance(
                        company_id=employee.company_id or company_id or 1,
                        employee_id=employee_id,
                        year=year,
                        month=month,
                        days_worked=0,
                        order_count=order_count
                    )
                    db.add(new_attendance)
                
                imported_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Ошибка сохранения для сотрудника {employee_id}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Импорт завершён",
            "imported": imported_count,
            "failed": failed_count,
            "errors": errors[:10]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка импорта: {str(e)}")


@app.post("/api/import/bulk")
async def import_bulk_files(
    request: Request,
    files: List[UploadFile] = File(...),
    year: int = Query(...),
    month: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Множественный импорт файлов. Тип определяется по названию файла:
    - plans.html или план*.html → Планы продаж
    - sales.html или факт*.html или продаж*.html → Фактические продажи
    - reserved.html или резерв*.html → Заказы в резерве
    - kpi.html или кпи*.html → KPI данные
    - order_count.html или заявк*.html → Количество заявок
    - orders.html или статистика*.html → Статистика заказов (для расчёта дней)
    """
    from auth import get_user_company_id
    from bs4 import BeautifulSoup
    
    company_id = get_user_company_id(current_user, request)
    
    results = []
    
    # Определяем тип файла по названию
    def detect_file_type(filename):
        filename_lower = filename.lower()
        if 'plan' in filename_lower or 'план' in filename_lower:
            return 'plans'
        elif 'sales' in filename_lower or 'факт' in filename_lower or 'продаж' in filename_lower:
            return 'sales'
        elif 'reserved' in filename_lower or 'резерв' in filename_lower:
            return 'reserved'
        elif 'kpi' in filename_lower or 'кпи' in filename_lower:
            return 'kpi'
        elif 'order_count' in filename_lower or 'заявк' in filename_lower or 'заявок' in filename_lower:
            return 'order_count'
        elif 'orders' in filename_lower or 'статистик' in filename_lower:
            return 'orders'
        return None
    
    for file in files:
        file_type = detect_file_type(file.filename)
        
        if not file_type:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": f"Не удалось определить тип файла по названию: {file.filename}"
            })
            continue
        
        try:
            contents = await file.read()
            
            if file_type == 'order_count':
                # Импорт количества заявок
                soup = BeautifulSoup(contents, 'html.parser')
                employees = crud.get_employees(db, is_active=True)
                if company_id:
                    employees = [e for e in employees if e.company_id == company_id]
                
                employee_map = {emp.full_name: emp for emp in employees}
                employee_map_1c = {emp.name_1c: emp for emp in employees if emp.name_1c}
                
                imported_count = 0
                failed_count = 0
                
                table = soup.find('table')
                if table:
                    rows = table.find_all('tr')[1:]
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) < 2:
                            continue
                        try:
                            employee_name = cells[0].get_text(strip=True)
                            order_count = int(cells[1].get_text(strip=True).replace(' ', '').replace(',', '') or 0)
                            
                            employee = employee_map_1c.get(employee_name) or employee_map.get(employee_name)
                            if not employee:
                                for emp_name, emp in employee_map.items():
                                    if employee_name in emp_name or emp_name in employee_name:
                                        employee = emp
                                        break
                            
                            if employee:
                                existing = db.query(models.Attendance).filter(
                                    models.Attendance.employee_id == employee.id,
                                    models.Attendance.year == year,
                                    models.Attendance.month == month
                                ).first()
                                
                                if existing:
                                    existing.order_count = order_count
                                else:
                                    new_attendance = models.Attendance(
                                        company_id=employee.company_id or company_id or 1,
                                        employee_id=employee.id,
                                        year=year,
                                        month=month,
                                        days_worked=0,
                                        order_count=order_count
                                    )
                                    db.add(new_attendance)
                                imported_count += 1
                            else:
                                failed_count += 1
                        except:
                            failed_count += 1
                    
                    db.commit()
                
                results.append({
                    "filename": file.filename,
                    "type": file_type,
                    "status": "success",
                    "imported": imported_count,
                    "failed": failed_count
                })
            
            else:
                # Для остальных типов используем существующую логику парсинга
                period_start = date(year, month, 1)
                if month == 12:
                    period_end = date(year + 1, 1, 1) - timedelta(days=1)
                else:
                    period_end = date(year, month + 1, 1) - timedelta(days=1)
                
                soup = BeautifulSoup(contents, 'html.parser')
                
                # Получаем сотрудников, бренды, KPI
                employees = crud.get_employees(db, is_active=True)
                if company_id:
                    employees = [e for e in employees if e.company_id == company_id]
                
                brands = crud.get_brands(db)
                kpi_types = crud.get_kpi_types(db)
                
                employee_map = {emp.full_name: emp for emp in employees}
                employee_map_1c = {emp.name_1c: emp for emp in employees if emp.name_1c}
                brand_map = {b.name: b for b in brands}
                brand_map_1c = {b.name_1c: b for b in brands if b.name_1c}
                kpi_map = {k.name: k for k in kpi_types}
                kpi_map_1c = {k.name_1c: k for k in kpi_types if k.name_1c}
                
                table = soup.find('table')
                if not table:
                    results.append({
                        "filename": file.filename,
                        "type": file_type,
                        "status": "error",
                        "message": "Таблица не найдена в файле"
                    })
                    continue
                
                rows = table.find_all('tr')
                if len(rows) < 2:
                    results.append({
                        "filename": file.filename,
                        "type": file_type,
                        "status": "error",
                        "message": "Недостаточно строк в таблице"
                    })
                    continue
                
                # Парсим заголовки
                header_row = rows[0]
                headers = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]
                
                imported_count = 0
                failed_count = 0
                
                for row in rows[1:]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 2:
                        continue
                    
                    try:
                        employee_name = cells[0].get_text(strip=True)
                        employee = employee_map_1c.get(employee_name) or employee_map.get(employee_name)
                        
                        if not employee:
                            for emp_name, emp in employee_map.items():
                                if employee_name in emp_name or emp_name in employee_name:
                                    employee = emp
                                    break
                        
                        if not employee:
                            failed_count += 1
                            continue
                        
                        # Обрабатываем каждый столбец (бренд/KPI)
                        for col_idx, cell in enumerate(cells[1:], 1):
                            if col_idx >= len(headers):
                                continue
                            
                            header_name = headers[col_idx]
                            value_text = cell.get_text(strip=True).replace(' ', '').replace(',', '.')
                            
                            try:
                                value = float(value_text) if value_text else 0
                            except:
                                continue
                            
                            if value == 0:
                                continue
                            
                            # Ищем бренд или KPI
                            brand = brand_map_1c.get(header_name) or brand_map.get(header_name)
                            kpi = kpi_map_1c.get(header_name) or kpi_map.get(header_name)
                            
                            if brand:
                                if file_type == 'plans':
                                    existing = db.query(models.SalesPlan).filter(
                                        models.SalesPlan.employee_id == employee.id,
                                        models.SalesPlan.brand_id == brand.id,
                                        models.SalesPlan.period_start == period_start
                                    ).first()
                                    if existing:
                                        existing.plan_value = value
                                    else:
                                        db.add(models.SalesPlan(
                                            company_id=employee.company_id or company_id or 1,
                                            employee_id=employee.id,
                                            brand_id=brand.id,
                                            period_start=period_start,
                                            period_end=period_end,
                                            plan_value=value
                                        ))
                                    imported_count += 1
                                
                                elif file_type == 'sales':
                                    existing = db.query(models.SalesFact).filter(
                                        models.SalesFact.employee_id == employee.id,
                                        models.SalesFact.brand_id == brand.id,
                                        models.SalesFact.sale_date == period_end
                                    ).first()
                                    if existing:
                                        existing.fact_value = value
                                    else:
                                        db.add(models.SalesFact(
                                            company_id=employee.company_id or company_id or 1,
                                            employee_id=employee.id,
                                            brand_id=brand.id,
                                            sale_date=period_end,
                                            fact_value=value
                                        ))
                                    imported_count += 1
                                
                                elif file_type == 'reserved':
                                    existing = db.query(models.ReservedOrder).filter(
                                        models.ReservedOrder.employee_id == employee.id,
                                        models.ReservedOrder.brand_id == brand.id,
                                        models.ReservedOrder.order_date == period_end
                                    ).first()
                                    if existing:
                                        existing.reserved_value = value
                                    else:
                                        db.add(models.ReservedOrder(
                                            company_id=employee.company_id or company_id or 1,
                                            employee_id=employee.id,
                                            brand_id=brand.id,
                                            order_date=period_end,
                                            reserved_value=value
                                        ))
                                    imported_count += 1
                            
                            elif kpi and file_type == 'kpi':
                                existing = db.query(models.KPIFact).filter(
                                    models.KPIFact.employee_id == employee.id,
                                    models.KPIFact.kpi_type_id == kpi.id,
                                    models.KPIFact.fact_date == period_end
                                ).first()
                                if existing:
                                    existing.fact_value = value
                                else:
                                    db.add(models.KPIFact(
                                        company_id=employee.company_id or company_id or 1,
                                        employee_id=employee.id,
                                        kpi_type_id=kpi.id,
                                        fact_date=period_end,
                                        fact_value=value
                                    ))
                                imported_count += 1
                    
                    except Exception as e:
                        failed_count += 1
                
                db.commit()
                
                results.append({
                    "filename": file.filename,
                    "type": file_type,
                    "status": "success",
                    "imported": imported_count,
                    "failed": failed_count
                })
        
        except Exception as e:
            results.append({
                "filename": file.filename,
                "type": file_type,
                "status": "error",
                "message": str(e)
            })
    
    return {
        "message": "Множественный импорт завершён",
        "results": results
    }


@app.get("/api/daily-order-stats")
def get_daily_order_stats(
    request: Request,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику заказов по дням"""
    from auth import get_accessible_employee_ids
    
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    if date_from and date_to:
        stats = crud.get_all_daily_order_stats_by_period(db, date_from, date_to)
    else:
        stats = db.query(models.DailyOrderStats).all()
    
    # Фильтруем по доступным сотрудникам
    filtered_stats = [s for s in stats if s.employee_id in accessible_ids]
    
    if employee_id:
        filtered_stats = [s for s in filtered_stats if s.employee_id == employee_id]
    
    return filtered_stats


# ==================== WORK CALENDAR ====================

@app.get("/api/work-calendar", response_model=List[schemas.WorkCalendar])
def read_work_calendars(
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Получить производственный календарь"""
    return crud.get_work_calendars(db, year=year)


@app.get("/api/work-calendar/{year}/{month}", response_model=schemas.WorkCalendar)
def read_work_calendar(year: int, month: int, db: Session = Depends(get_db)):
    """Получить производственный календарь для конкретного месяца"""
    calendar = crud.get_work_calendar(db, year=year, month=month)
    if calendar is None:
        raise HTTPException(status_code=404, detail="Work calendar not found")
    return calendar


@app.post("/api/work-calendar", response_model=schemas.WorkCalendar)
def create_work_calendar(calendar: schemas.WorkCalendarCreate, db: Session = Depends(get_db)):
    """Создать запись производственного календаря"""
    existing = crud.get_work_calendar(db, year=calendar.year, month=calendar.month)
    if existing:
        raise HTTPException(status_code=400, detail="Calendar for this month already exists")
    return crud.create_work_calendar(db=db, calendar=calendar)


@app.put("/api/work-calendar/{year}/{month}", response_model=schemas.WorkCalendar)
def update_work_calendar(
    year: int,
    month: int,
    calendar: schemas.WorkCalendarUpdate,
    db: Session = Depends(get_db)
):
    """Обновить производственный календарь"""
    db_calendar = crud.update_work_calendar(db, year=year, month=month, calendar=calendar)
    if db_calendar is None:
        raise HTTPException(status_code=404, detail="Work calendar not found")
    return db_calendar


# ==================== ATTENDANCE ====================

@app.get("/api/attendance", response_model=List[schemas.Attendance])
def read_attendance(
    request: Request,
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить записи табеля с учетом прав доступа"""
    from auth import get_accessible_employee_ids
    
    accessible_ids = get_accessible_employee_ids(current_user, db, request)
    
    records = crud.get_attendance_records(
        db,
        employee_id=employee_id,
        year=year,
        month=month,
        skip=skip,
        limit=limit
    )
    
    # Фильтруем по доступным сотрудникам
    filtered_records = [rec for rec in records if rec.employee_id in accessible_ids]
    
    return filtered_records


@app.get("/api/attendance/{attendance_id}", response_model=schemas.Attendance)
def read_attendance_by_id(attendance_id: int, db: Session = Depends(get_db)):
    """Получить запись табеля по ID"""
    attendance = crud.get_attendance(db, attendance_id=attendance_id)
    if attendance is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance


@app.post("/api/attendance", response_model=schemas.Attendance)
def create_attendance_record(attendance: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    """Создать запись табеля"""
    # Проверяем, нет ли уже записи для этого сотрудника в этом месяце
    existing = crud.get_attendance_by_employee_month(
        db, 
        employee_id=attendance.employee_id,
        year=attendance.year,
        month=attendance.month
    )
    if existing:
        raise HTTPException(status_code=400, detail="Attendance record for this employee and month already exists")
    return crud.create_attendance(db=db, attendance=attendance)


@app.put("/api/attendance/{attendance_id}", response_model=schemas.Attendance)
def update_attendance_record(
    attendance_id: int,
    attendance: schemas.AttendanceUpdate,
    db: Session = Depends(get_db)
):
    """Обновить запись табеля"""
    db_attendance = crud.update_attendance(db, attendance_id=attendance_id, attendance=attendance)
    if db_attendance is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return db_attendance


# ==================== SALARY RULES ====================

@app.get("/api/salary-rules", response_model=List[schemas.SalaryRule])
def read_salary_rules(
    request: Request,
    position: Optional[str] = None,
    is_active: Optional[bool] = True,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить правила расчета зарплаты с фильтрацией по компании"""
    from auth import get_user_company_id
    company_id = get_user_company_id(current_user, request)
    
    rules = crud.get_salary_rules(db, position=position, is_active=is_active)
    
    # Фильтруем по company_id если указан
    if company_id:
        rules = [r for r in rules if r.company_id == company_id]
    
    return rules


@app.post("/api/salary-rules", response_model=schemas.SalaryRule)
def create_salary_rule(rule: schemas.SalaryRuleCreate, db: Session = Depends(get_db)):
    """Создать правило расчета зарплаты"""
    return crud.create_salary_rule(db=db, rule=rule)


@app.get("/api/salary-rules/{rule_id}", response_model=schemas.SalaryRule)
def read_salary_rule(rule_id: int, db: Session = Depends(get_db)):
    """Получить правило по ID"""
    rule = crud.get_salary_rule(db, rule_id=rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Salary rule not found")
    return rule


@app.put("/api/salary-rules/{rule_id}", response_model=schemas.SalaryRule)
def update_salary_rule(rule_id: int, rule: schemas.SalaryRuleUpdate, db: Session = Depends(get_db)):
    """Обновить правило"""
    db_rule = crud.get_salary_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Salary rule not found")
    return crud.update_salary_rule(db=db, rule_id=rule_id, rule=rule)


@app.delete("/api/salary-rules/{rule_id}")
def delete_salary_rule(rule_id: int, db: Session = Depends(get_db)):
    """Удалить правило"""
    db_rule = crud.get_salary_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Salary rule not found")
    crud.delete_salary_rule(db=db, rule_id=rule_id)
    return {"message": "Salary rule deleted successfully"}


# ==================== SALARY CALCULATIONS ====================

@app.get("/api/salary-calculations", response_model=List[schemas.SalaryCalculation])
def read_salary_calculations(
    employee_id: Optional[int] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db)
):
    """Получить расчеты зарплаты"""
    calculations = crud.get_salary_calculations(
        db,
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
        skip=skip,
        limit=limit
    )
    return calculations


@app.post("/api/salary-calculations/calculate")
def calculate_salary(
    employee_id: int,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db)
):
    """Рассчитать зарплату сотрудника"""
    calculator = SalaryCalculator(db)
    
    try:
        calculation = calculator.calculate_employee_salary(
            employee_id,
            period_start,
            period_end
        )
        
        # Сохраняем расчет
        db_calculation = crud.create_salary_calculation(db, calculation)
        
        return db_calculation
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation failed: {str(e)}")


@app.post("/api/salary-calculations/calculate-team")
def calculate_team_salaries(
    period_start: date,
    period_end: date,
    supervisor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Рассчитать зарплату для всей команды"""
    calculator = SalaryCalculator(db)
    
    try:
        calculations = calculator.calculate_team_salaries(
            period_start,
            period_end,
            supervisor_id
        )
        
        # Сохраняем расчеты
        saved_calculations = []
        for calc in calculations:
            db_calc = crud.create_salary_calculation(db, calc)
            saved_calculations.append(db_calc)
        
        return {
            "message": "Team salaries calculated",
            "count": len(saved_calculations),
            "calculations": saved_calculations
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation failed: {str(e)}")


# ==================== DASHBOARD ====================

@app.get("/api/dashboard/team")
def get_team_dashboard(
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db)
):
    """Получить дашборд команды"""
    calculator = SalaryCalculator(db)
    employees = crud.get_employees(db, is_active=True)
    
    employee_performances = []
    total_plan = 0
    total_fact = 0
    
    for employee in employees:
        try:
            plan_data = calculator.calculate_plan_completion(
                employee.id,
                period_start,
                period_end
            )
            
            attendance_data = calculator.calculate_attendance(
                employee.id,
                period_start,
                period_end
            )
            
            # Примерный расчет зарплаты
            salary_calc = calculator.calculate_employee_salary(
                employee.id,
                period_start,
                period_end
            )
            
            employee_performances.append({
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "position": employee.position,
                "total_plan": plan_data["total_plan"],
                "total_fact": plan_data["total_fact"],
                "completion_percent": plan_data["completion_percent"],
                "attendance_percent": attendance_data["attendance_percent"],
                "estimated_salary": salary_calc.total_salary
            })
            
            total_plan += plan_data["total_plan"]
            total_fact += plan_data["total_fact"]
            
        except Exception as e:
            print(f"Error calculating for employee {employee.id}: {e}")
            continue
    
    avg_completion = (total_fact / total_plan * 100) if total_plan > 0 else 0
    
    # Статистика по брендам
    brands = crud.get_brands(db, is_active=True)
    brand_performances = []
    
    for brand in brands:
        brand_plan = 0
        brand_fact = 0
        
        for employee in employees:
            plans = crud.get_sales_plans(
                db,
                employee_id=employee.id,
                period_start=period_start,
                period_end=period_end
            )
            
            facts = crud.get_sales_facts(
                db,
                employee_id=employee.id,
                brand_id=brand.id,
                date_from=period_start,
                date_to=period_end
            )
            
            brand_plan += sum(p.plan_value for p in plans if p.brand_id == brand.id)
            brand_fact += sum(f.fact_value for f in facts)
        
        if brand_plan > 0 or brand_fact > 0:
            brand_performances.append({
                "brand_id": brand.id,
                "brand_name": brand.name,
                "total_plan": brand_plan,
                "total_fact": brand_fact,
                "completion_percent": (brand_fact / brand_plan * 100) if brand_plan > 0 else 0
            })
    
    return {
        "period_start": period_start,
        "period_end": period_end,
        "total_employees": len(employees),
        "active_employees": len([e for e in employees if e.is_active]),
        "total_plan": total_plan,
        "total_fact": total_fact,
        "avg_completion_percent": round(avg_completion, 2),
        "employees": employee_performances,
        "brands": brand_performances
    }


# ==================== IMPORT LOGS ====================

@app.get("/api/import-logs", response_model=List[schemas.ImportLog])
def read_import_logs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Получить логи импорта"""
    logs = crud.get_import_logs(db, skip=skip, limit=limit)
    return logs


# ==================== TELEGRAM REPORTS ====================

@app.post("/api/telegram/send-reports")
def send_telegram_reports(
    request: Request,
    year: int = Query(...),
    month: int = Query(...),
    employee_ids: Optional[List[int]] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Отправка отчетов в Telegram с учётом текущей компании
    Если employee_ids не указаны, отправляет всем активным сотрудникам с telegram_id
    """
    from telegram_bot import send_sales_report_to_employee
    from salary_calculator import SalaryCalculator
    from auth import get_user_company_id
    
    company_id = get_user_company_id(current_user, request)
    
    # Получаем токен бота компании
    bot_token = None
    if company_id:
        company = crud.get_company(db, company_id)
        if company and company.telegram_bot_token:
            bot_token = company.telegram_bot_token
    
    # Получаем сотрудников (с фильтрацией по компании)
    if employee_ids:
        employees = [crud.get_employee(db, emp_id) for emp_id in employee_ids]
        employees = [e for e in employees if e and e.telegram_id]
        # Фильтруем по компании
        if company_id:
            employees = [e for e in employees if e.company_id == company_id]
    else:
        all_employees = crud.get_employees(db)
        employees = [e for e in all_employees if e.is_active and e.telegram_id]
        # Фильтруем по компании
        if company_id:
            employees = [e for e in employees if e.company_id == company_id]
    
    if not employees:
        raise HTTPException(status_code=404, detail="Нет сотрудников с Telegram ID")
    
    # Получаем производственный календарь
    work_calendar = crud.get_work_calendar(db, year=year, month=month)
    if not work_calendar:
        raise HTTPException(status_code=404, detail="Производственный календарь не найден")
    
    # Вычисляем рабочие дни
    today = date.today()
    if today.year == year and today.month == month:
        days_in_month = today.day
    else:
        from calendar import monthrange
        days_in_month = monthrange(year, month)[1]
    
    work_days_passed = min(days_in_month, work_calendar.working_days)
    work_days_left = max(work_calendar.working_days - work_days_passed, 0)
    
    # Получаем все бренды и KPI
    brands = crud.get_brands(db)
    kpi_types = crud.get_kpi_types(db)
    
    results = []
    calculator = SalaryCalculator(db)
    
    # Формируем период
    from calendar import monthrange
    period_start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    period_end = date(year, month, last_day)
    
    for employee in employees:
        try:
            # Получаем планы и факты
            plans = crud.get_sales_plans(db, employee_id=employee.id, period_start=period_start, period_end=period_end)
            facts = crud.get_sales_facts(db, employee_id=employee.id, date_from=period_start, date_to=period_end)
            
            # Рассчитываем зарплату на сегодняшний день (пока отключено - нужно исправить salary_calculator)
            salary_earned = None
            # try:
            #     today = date.today()
            #     if today.year == year and today.month == month:
            #         current_period_end = today
            #     else:
            #         current_period_end = period_end
            #     
            #     salary_result = calculator.calculate_employee_salary(employee.id, period_start, current_period_end)
            #     salary_earned = salary_result['total_salary']
            #     print(f"💰 Зарплата для {employee.full_name} на {current_period_end}: {salary_earned}")
            # except Exception as e:
            #     print(f"❌ Ошибка расчета зарплаты для {employee.full_name}: {str(e)}")
            
            # Получаем правило зарплаты сотрудника
            salary_rule = crud.get_salary_rule(db, employee.salary_rule_id) if employee.salary_rule_id else None
            
            # Функция расчета начислений (как на фронтенде)
            def calculate_accrual_from_rule(percent, brand_id=None, kpi_id=None):
                if not salary_rule or not salary_rule.motivation_config:
                    return 0
                
                config = salary_rule.motivation_config
                rules = None
                
                # Определяем правила для бренда или KPI
                if brand_id and config.get('brands'):
                    brand_rule = config['brands'].get(str(brand_id))
                    if brand_rule:
                        rules = brand_rule
                elif kpi_id and config.get('kpis'):
                    kpi_rule = config['kpis'].get(str(kpi_id))
                    if kpi_rule:
                        rules = kpi_rule
                
                if not rules:
                    return 0
                
                # Если amounts - это объект с ключами-процентами
                if isinstance(rules.get('amounts'), dict):
                    rounded_percent = int(percent * 100)
                    from_threshold = rules.get('threshold_from', 0)
                    to_threshold = rules.get('threshold_to', 999)
                    
                    if rounded_percent < from_threshold:
                        return 0
                    
                    if rounded_percent > to_threshold:
                        return rules['amounts'].get(str(to_threshold), 0)
                    
                    return rules['amounts'].get(str(rounded_percent), 0)
                
                return 0
            
            # Группируем по брендам (с начислениями)
            brands_data = []
            for brand in brands:
                brand_plans = [p for p in plans if p.brand_id == brand.id and p.kpi_type_id is None]
                brand_facts = [f for f in facts if f.brand_id == brand.id and f.kpi_type_id is None]
                
                total_plan = sum(p.plan_value for p in brand_plans)
                total_fact = sum(f.fact_value for f in brand_facts)
                percent = total_fact / total_plan if total_plan > 0 else 0
                
                # Рассчитываем начисление
                brand_salary = calculate_accrual_from_rule(percent, brand_id=brand.id)
                
                if total_plan > 0:  # Показываем только бренды с планом
                    brands_data.append({
                        'name': brand.name,
                        'plan': total_plan,
                        'fact': total_fact,
                        'percent': percent,
                        'salary': brand_salary
                    })
            
            # Группируем по KPI (с начислениями)
            kpi_data = []
            for kpi in kpi_types:
                kpi_plans = [p for p in plans if p.kpi_type_id == kpi.id]
                kpi_facts = [f for f in facts if f.kpi_type_id == kpi.id]
                
                total_plan = sum(p.plan_value for p in kpi_plans)
                total_fact = sum(f.fact_value for f in kpi_facts)
                percent = total_fact / total_plan if total_plan > 0 else 0
                
                # Рассчитываем начисление
                kpi_salary = calculate_accrual_from_rule(percent, kpi_id=kpi.id)
                
                if total_plan > 0:  # Показываем только KPI с планом
                    kpi_data.append({
                        'name': kpi.name,
                        'plan': total_plan,
                        'fact': total_fact,
                        'percent': percent,
                        'salary': kpi_salary
                    })
            
            # Получаем резервные заказы
            from models import ReservedOrders
            reserved = db.query(ReservedOrders).filter(
                ReservedOrders.employee_id == employee.id,
                ReservedOrders.order_date >= period_start,
                ReservedOrders.order_date <= period_end
            ).all()
            total_reserved = sum(r.reserved_value for r in reserved)
            
            # Общие итоги
            total_plan = sum(p.plan_value for p in plans)
            total_fact = sum(f.fact_value for f in facts)
            total_percent = total_fact / total_plan if total_plan > 0 else 0
            
            # Рассчитываем начисление за общий итог (all_brands)
            all_brands_accrual = 0
            if salary_rule and salary_rule.motivation_config:
                all_brands_rule = salary_rule.motivation_config.get('all_brands')
                if all_brands_rule and all_brands_rule.get('amounts'):
                    # Фильтруем бренды с планом > 0
                    brands_with_plan = [b for b in brands_data if b['plan'] > 0]
                    
                    if brands_with_plan:
                        threshold_from = all_brands_rule.get('threshold_from', 0)
                        # Проверяем, выполнены ли все бренды
                        all_completed = all(b['percent'] >= threshold_from / 100 for b in brands_with_plan)
                        
                        if all_completed:
                            # Берем минимальный процент
                            min_percent = min(b['percent'] for b in brands_with_plan)
                            rounded_percent = int(min_percent * 100)
                            threshold_to = all_brands_rule.get('threshold_to', 999)
                            
                            if rounded_percent > threshold_to:
                                all_brands_accrual = all_brands_rule['amounts'].get(str(threshold_to), 0)
                            else:
                                all_brands_accrual = all_brands_rule['amounts'].get(str(rounded_percent), 0)
            
            # Получаем фиксированную часть и дорожные
            fixed_salary = 0
            travel_allowance = 0
            if salary_rule:
                base_salary = salary_rule.fixed_salary or 0
                base_travel = salary_rule.travel_allowance or 0
                
                # Получаем табель для пересчета пропорционально отработанным дням
                attendance_record = crud.get_attendance_records(
                    db, employee_id=employee.id, year=year, month=month
                )
                days_worked = attendance_record[0].days_worked if attendance_record else 0
                
                # Получаем рабочие дни из календаря
                work_calendar = crud.get_work_calendar(db, year, month)
                working_days = work_calendar.working_days if work_calendar else 22
                
                # Пересчитываем пропорционально
                if working_days > 0:
                    attendance_ratio = days_worked / working_days
                    fixed_salary = round(base_salary * attendance_ratio)
                    travel_allowance = round(base_travel * attendance_ratio)
            
            # Считаем общую сумму начислений (мотивация + фикса + дорожные)
            total_salary = sum(b.get('salary', 0) for b in brands_data) + sum(k.get('salary', 0) for k in kpi_data) + all_brands_accrual + fixed_salary + travel_allowance
            
            # Отправляем отчет (используем токен бота компании)
            success = send_sales_report_to_employee(
                telegram_id=employee.telegram_id,
                employee_name=employee.full_name,
                brands_data=brands_data,
                kpi_data=kpi_data,
                total_plan=total_plan,
                total_fact=total_fact,
                total_percent=total_percent,
                total_reserved=total_reserved,
                work_days_passed=work_days_passed,
                work_days_left=work_days_left,
                all_brands_accrual=all_brands_accrual,
                fixed_salary=fixed_salary,
                travel_allowance=travel_allowance,
                total_salary=total_salary,
                salary_earned=salary_earned,
                bot_token=bot_token
            )
            
            results.append({
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'telegram_id': employee.telegram_id,
                'success': success
            })
        except Exception as e:
            results.append({
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'telegram_id': employee.telegram_id,
                'success': False,
                'error': str(e)
            })
    
    return {
        'total': len(results),
        'success': sum(1 for r in results if r['success']),
        'failed': sum(1 for r in results if not r['success']),
        'results': results
    }


# ==================== ИМПОРТ ДАННЫХ ИЗ 1С ====================

@app.post("/api/import/parse")
async def parse_1c_file(
    file: UploadFile = File(...),
    import_type: str = Query(..., description="plans, sales, kpi, reserved"),
    db: Session = Depends(get_db)
):
    """
    Шаг 1: Парсинг HTML файла из 1С и проверка отсутствующих сущностей
    """
    try:
        # Читаем содержимое файла
        content = await file.read()
        html_content = content.decode('utf-8')
        
        # Парсим файл в зависимости от типа
        if import_type == 'sales':
            from import_1c_sales_parser import parse_sales_html
            parsed_data = parse_sales_html(html_content)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем наличие сущностей в БД для продаж
            from import_1c_sales_service import check_sales_entities
            check_result = check_sales_entities(db, parsed_data)
            
            return {
                "success": True,
                "records_count": len(parsed_data['data']),
                "missing_employees": check_result['missing_employees'],
                "missing_brands": check_result['missing_brands'],
                "missing_kpis": [],  # Для продаж KPI не используются
                "preview_data": parsed_data['data'][:10],
                "errors": parsed_data['errors']
            }
        elif import_type == 'reserved':
            # Используем простой парсер для резервных заказов (столбцы 1 и 7)
            from import_1c_reserved_parser import parse_reserved_html
            parsed_data = parse_reserved_html(html_content)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем наличие сотрудников в БД
            from import_1c_reserved_service import check_reserved_entities
            check_result = check_reserved_entities(db, parsed_data)
            
            return {
                "success": True,
                "records_count": len(parsed_data['data']),
                "missing_employees": check_result['missing_employees'],
                "missing_brands": [],  # Для резервных заказов бренды не используются
                "missing_kpis": [],
                "preview_data": parsed_data['data'][:10],
                "errors": parsed_data['errors']
            }
        elif import_type == 'kpi':
            # Используем универсальный парсер для 7-столбцового формата
            from import_1c_parser import parse_1c_html
            parsed_data = parse_1c_html(html_content, 'kpi')
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем наличие сущностей в БД
            from import_1c_service import check_missing_entities
            check_result = check_missing_entities(db, parsed_data)
            
            return {
                "success": True,
                "records_count": len(parsed_data['data']),
                "missing_employees": check_result['missing_employees'],
                "missing_brands": [],  # Для KPI бренды не используются (фильтруем)
                "missing_kpis": check_result['missing_kpis'],
                "preview_data": parsed_data['data'][:10],
                "errors": parsed_data['errors']
            }
        else:
            # Планы и другие типы
            from import_1c_parser import parse_1c_html
            parsed_data = parse_1c_html(html_content, import_type)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем наличие сущностей в БД
            from import_1c_service import check_missing_entities
            check_result = check_missing_entities(db, parsed_data)
            
            return {
                "success": True,
                "records_count": len(parsed_data['data']),
                "missing_employees": check_result['missing_employees'],
                "missing_brands": check_result['missing_brands'],
                "missing_kpis": check_result['missing_kpis'],
                "preview_data": parsed_data['data'][:10],
                "errors": parsed_data['errors']
            }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in parse_1c_file: {error_details}")
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга файла: {str(e)}")


@app.post("/api/import/execute")
async def execute_import(
    file: UploadFile = File(...),
    import_type: str = Query(...),
    year: int = Query(...),
    month: int = Query(...),
    day: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Шаг 2: Выполнение импорта данных после подтверждения пользователя
    """
    try:
        # Читаем и парсим файл
        content = await file.read()
        html_content = content.decode('utf-8')
        
        # Парсим файл в зависимости от типа
        if import_type == 'sales':
            from import_1c_sales_parser import parse_sales_html
            parsed_data = parse_sales_html(html_content)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем сущности для продаж
            from import_1c_sales_service import check_sales_entities
            entities = check_sales_entities(db, parsed_data)
            
            # Проверяем, что нет отсутствующих сущностей
            if entities['missing_employees'] or entities['missing_brands']:
                raise HTTPException(
                    status_code=400,
                    detail="Есть отсутствующие сущности. Сначала создайте их."
                )
            
            # Выполняем импорт продаж
            from import_1c_sales_service import import_sales
            result = import_sales(db, parsed_data, year, month, entities)
            
        elif import_type == 'reserved':
            # Используем простой парсер для резервных заказов (столбцы 1 и 7)
            from import_1c_reserved_parser import parse_reserved_html
            parsed_data = parse_reserved_html(html_content)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем сотрудников
            from import_1c_reserved_service import check_reserved_entities
            entities = check_reserved_entities(db, parsed_data)
            
            # Проверяем, что нет отсутствующих сотрудников
            if entities['missing_employees']:
                raise HTTPException(
                    status_code=400,
                    detail="Есть отсутствующие сотрудники. Сначала создайте их."
                )
            
            # Выполняем импорт резервных заказов
            from import_1c_service import import_reserved_orders
            result = import_reserved_orders(db, parsed_data, year, month, entities)
            
        elif import_type == 'kpi':
            # Используем универсальный парсер для 7-столбцового формата
            from import_1c_parser import parse_1c_html
            parsed_data = parse_1c_html(html_content, 'kpi')
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем сущности
            from import_1c_service import check_missing_entities
            entities = check_missing_entities(db, parsed_data)
            
            # Проверяем, что нет отсутствующих сущностей
            if entities['missing_employees'] or entities['missing_kpis']:
                raise HTTPException(
                    status_code=400,
                    detail="Есть отсутствующие сущности. Сначала создайте их."
                )
            
            # Выполняем импорт KPI данных (используем новую функцию)
            from import_1c_service import import_kpi_facts
            result = import_kpi_facts(db, parsed_data, year, month, entities)
            
        else:
            # Планы и другие типы
            from import_1c_parser import parse_1c_html
            parsed_data = parse_1c_html(html_content, import_type)
            
            if not parsed_data['success']:
                raise HTTPException(status_code=400, detail=parsed_data['errors'])
            
            # Проверяем сущности
            from import_1c_service import check_missing_entities
            entities = check_missing_entities(db, parsed_data)
            
            # Проверяем, что нет отсутствующих сущностей
            if entities['missing_employees'] or entities['missing_brands'] or entities['missing_kpis']:
                raise HTTPException(
                    status_code=400,
                    detail="Есть отсутствующие сущности. Сначала создайте их."
                )
            
            # Выполняем импорт планов
            from import_1c_service import import_plans
            if import_type == "plans":
                result = import_plans(db, parsed_data, year, month, entities)
            else:
                raise HTTPException(status_code=400, detail="Неизвестный тип импорта")
        
        return {
            "success": True,
            "imported": result['imported'],
            "failed": result['failed'],
            "errors": result['errors']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"=== ОШИБКА ИМПОРТА ===")
        print(error_details)
        raise HTTPException(status_code=500, detail=f"Ошибка импорта: {str(e)}")


@app.post("/api/import/create-employee")
def create_employee_quick(
    employee_data: dict,
    db: Session = Depends(get_db)
):
    """
    Быстрое создание сотрудника из интерфейса импорта
    """
    try:
        print(f"=== СОЗДАНИЕ СОТРУДНИКА ===")
        print(f"Данные: {employee_data}")
        print(f"Супервайзер из данных: {employee_data.get('supervisor')}")
        print(f"Менеджер из данных: {employee_data.get('manager')}")
        # Получаем company_id из данных или используем 1 по умолчанию
        company_id = employee_data.get('company_id', 1)
        
        # Находим или создаем территорию
        territory = None
        if employee_data.get('territory'):
            territory = db.query(models.Territory).filter(
                models.Territory.name == employee_data['territory'],
                models.Territory.company_id == company_id
            ).first()
            
            if not territory:
                territory = models.Territory(
                    company_id=company_id,
                    name=employee_data['territory'],
                    is_active=True
                )
                db.add(territory)
                db.flush()
        
        # Ищем супервайзера по name_1c
        supervisor_id = None
        if employee_data.get('supervisor'):
            print(f"Ищем супервайзера: '{employee_data['supervisor']}'")
            supervisor = db.query(models.Employee).filter(
                models.Employee.name_1c == employee_data['supervisor']
            ).first()
            if supervisor:
                supervisor_id = supervisor.id
                print(f"✅ Супервайзер найден: ID={supervisor_id}, ФИО={supervisor.full_name}")
            else:
                print(f"❌ Супервайзер НЕ найден в базе")
        
        # Ищем менеджера по name_1c
        manager_id = None
        if employee_data.get('manager'):
            print(f"Ищем менеджера: '{employee_data['manager']}'")
            manager = db.query(models.Employee).filter(
                models.Employee.name_1c == employee_data['manager']
            ).first()
            if manager:
                manager_id = manager.id
                print(f"✅ Менеджер найден: ID={manager_id}, ФИО={manager.full_name}")
            else:
                print(f"❌ Менеджер НЕ найден в базе")
        
        # Создаем сотрудника
        new_employee = models.Employee(
            company_id=company_id,
            full_name=employee_data['full_name'],
            name_1c=employee_data['name_1c'],
            position=employee_data.get('position', 'agent'),
            territory_id=territory.id if territory else None,
            telegram_id=employee_data.get('telegram_id'),
            supervisor_id=supervisor_id,
            manager_id=manager_id,
            is_active=True
        )
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        
        return {
            "success": True,
            "employee": {
                "id": new_employee.id,
                "full_name": new_employee.full_name,
                "name_1c": new_employee.name_1c
            }
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in create_employee_quick: {error_details}")
        raise HTTPException(status_code=500, detail=f"Ошибка создания сотрудника: {str(e)}")


# ==================== AUTHENTICATION ====================

from datetime import timedelta
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    require_role,
    get_accessible_employee_ids,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Вход в систему"""
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Создаем токен доступа с company_id
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": user.username, 
        "role": user.role,
        "company_id": user.company_id
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/current-user", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получить информацию о текущем пользователе"""
    return current_user


@app.post("/api/auth/switch-company", response_model=schemas.Token)
def switch_company(
    company_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Переключить компанию (для admin и director)"""
    if current_user.role not in ['admin', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only admin and director can switch companies"
        )
    
    # Проверяем существование компании
    company = crud.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Создаем новый токен с выбранной компанией
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": current_user.username,
        "role": current_user.role,
        "company_id": company_id  # Временная компания для просмотра
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/logout")
async def logout(current_user: models.User = Depends(get_current_user)):
    """Выход из системы (на клиенте нужно удалить токен)"""
    return {"message": "Successfully logged out"}


# ==================== USER MANAGEMENT (для admin и director) ====================

@app.get("/api/users", response_model=List[schemas.UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(require_role(['admin', 'director'])),
    db: Session = Depends(get_db)
):
    """Получить список пользователей (admin и director)"""
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.post("/api/users", response_model=schemas.UserResponse)
def create_user(
    user: schemas.UserCreate,
    current_user: models.User = Depends(require_role(['admin', 'director'])),
    db: Session = Depends(get_db)
):
    """Создать нового пользователя (admin и director)"""
    try:
        # Проверяем, не существует ли уже пользователь с таким username
        db_user = crud.get_user_by_username(db, username=user.username)
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        return crud.create_user(db=db, user=user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    current_user: models.User = Depends(require_role(['admin', 'director'])),
    db: Session = Depends(get_db)
):
    """Обновить пользователя (admin и director)"""
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return crud.update_user(db=db, user_id=user_id, user=user)


@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(require_role(['admin', 'director'])),
    db: Session = Depends(get_db)
):
    """Удалить пользователя (только admin)"""
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    crud.delete_user(db=db, user_id=user_id)
    return {"message": "User deleted successfully"}


# ==================== HEALTH CHECK ====================

@app.get("/")
def root():
    """Health check"""
    return {
        "status": "ok",
        "message": "Sales & Salary Management System API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
