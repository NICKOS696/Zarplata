from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime


# Company Schemas
class CompanyBase(BaseModel):
    name: str
    telegram_bot_token: Optional[str] = None
    is_active: bool = True


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    is_active: Optional[bool] = None


class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Territory Schemas
class TerritoryBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True
    work_days_calculation: str = 'standard'  # 'standard' или 'criteria'
    # Критерии по количеству заказов
    order_count_threshold_low: int = 0
    order_count_threshold_mid: int = 0
    order_count_threshold_high: int = 0
    # Критерии по сумме заказов
    order_sum_threshold_low: float = 0
    order_sum_threshold_mid: float = 0
    order_sum_threshold_high: float = 0


class TerritoryCreate(TerritoryBase):
    company_id: Optional[int] = 1


class TerritoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    work_days_calculation: Optional[str] = None
    order_count_threshold_low: Optional[int] = None
    order_count_threshold_mid: Optional[int] = None
    order_count_threshold_high: Optional[int] = None
    order_sum_threshold_low: Optional[float] = None
    order_sum_threshold_mid: Optional[float] = None
    order_sum_threshold_high: Optional[float] = None


class Territory(TerritoryBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Employee Schemas
class EmployeeBase(BaseModel):
    full_name: str
    name_1c: Optional[str] = None
    position: str
    telegram_id: Optional[str] = None
    supervisor_id: Optional[int] = None
    manager_id: Optional[int] = None
    territory_id: Optional[int] = None
    salary_rule_id: Optional[int] = None
    fixed_salary: Optional[float] = 0.0  # deprecated
    is_active: bool = True
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    probation_days: int = 0


class EmployeeCreate(EmployeeBase):
    company_id: Optional[int] = 1


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    name_1c: Optional[str] = None
    position: Optional[str] = None
    telegram_id: Optional[str] = None
    supervisor_id: Optional[int] = None
    manager_id: Optional[int] = None
    territory_id: Optional[int] = None
    salary_rule_id: Optional[int] = None
    fixed_salary: Optional[float] = None
    is_active: Optional[bool] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    probation_days: Optional[int] = None


class Employee(EmployeeBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Brand Schemas
class BrandBase(BaseModel):
    name: str
    name_1c: Optional[str] = None
    is_active: bool = True


class BrandCreate(BrandBase):
    company_id: Optional[int] = 1


class Brand(BrandBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# KPI Type Schemas
class KPITypeBase(BaseModel):
    name: str
    name_1c: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    no_plan: bool = False  # KPI без плана (только факт и начисление)


class KPITypeCreate(KPITypeBase):
    company_id: Optional[int] = 1


class KPIType(KPITypeBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Sales Plan Schemas
class SalesPlanBase(BaseModel):
    employee_id: int
    brand_id: Optional[int] = None
    kpi_type_id: Optional[int] = None
    period_start: date
    period_end: date
    plan_value: float


class SalesPlanCreate(SalesPlanBase):
    company_id: Optional[int] = 1


class SalesPlan(SalesPlanBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Sales Fact Schemas
class SalesFactBase(BaseModel):
    employee_id: int
    brand_id: Optional[int] = None
    kpi_type_id: Optional[int] = None
    sale_date: date
    fact_value: float


class SalesFactCreate(SalesFactBase):
    company_id: Optional[int] = 1


class SalesFact(SalesFactBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Work Calendar Schemas
class WorkCalendarBase(BaseModel):
    year: int
    month: int  # 1-12
    working_days: int
    notes: Optional[str] = None


class WorkCalendarCreate(WorkCalendarBase):
    pass


class WorkCalendarUpdate(BaseModel):
    working_days: Optional[int] = None
    notes: Optional[str] = None


class WorkCalendar(WorkCalendarBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Attendance Schemas (обновленная версия - по месяцам)
class AttendanceBase(BaseModel):
    employee_id: int
    year: int
    month: int  # 1-12
    days_worked: float = 0
    order_count: int = 0  # Количество заявок за месяц (для грейдовой системы)
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    company_id: Optional[int] = 1


class AttendanceUpdate(BaseModel):
    days_worked: Optional[float] = None
    order_count: Optional[int] = None
    notes: Optional[str] = None


class Attendance(AttendanceBase):
    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Salary Rule Schemas
class SalaryRuleBase(BaseModel):
    name: str
    position: str  # agent, supervisor, manager
    fixed_salary: float = 0.0  # Фиксированный оклад (месячный)
    travel_allowance: float = 0.0  # Дорожные (месячные)
    motivation_config: Optional[Dict[str, Any]] = None  # Конфигурация мотивации
    is_active: bool = True
    
    # Грейдовая система
    fixed_salary_type: str = 'classic'  # 'classic' или 'graded'
    
    # Грейд "Стажер"
    grade_trainee_salary: float = 0.0
    grade_trainee_condition: str = 'orders'  # 'orders' или 'percent'
    grade_trainee_threshold: float = 0.0
    
    # Грейд "Профессионал"
    grade_professional_salary: float = 0.0
    grade_professional_condition: str = 'orders'
    grade_professional_threshold: float = 0.0
    
    # Грейд "Эксперт"
    grade_expert_salary: float = 0.0
    grade_expert_condition: str = 'orders'
    grade_expert_threshold: float = 0.0


class SalaryRuleCreate(SalaryRuleBase):
    company_id: Optional[int] = 1


class SalaryRuleUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    fixed_salary: Optional[float] = None
    travel_allowance: Optional[float] = None
    motivation_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    
    # Грейдовая система
    fixed_salary_type: Optional[str] = None
    grade_trainee_salary: Optional[float] = None
    grade_trainee_condition: Optional[str] = None
    grade_trainee_threshold: Optional[float] = None
    grade_professional_salary: Optional[float] = None
    grade_professional_condition: Optional[str] = None
    grade_professional_threshold: Optional[float] = None
    grade_expert_salary: Optional[float] = None
    grade_expert_condition: Optional[str] = None
    grade_expert_threshold: Optional[float] = None


class SalaryRule(SalaryRuleBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Salary Calculation Schemas
class SalaryCalculationBase(BaseModel):
    employee_id: int
    period_start: date
    period_end: date
    fixed_part: float = 0.0
    motivation_part: float = 0.0
    bonus_part: float = 0.0
    penalty_part: float = 0.0
    total_salary: float = 0.0
    plan_completion_percent: float = 0.0
    attendance_percent: float = 0.0
    days_worked: int = 0
    days_total: int = 0
    calculation_details: Optional[Dict[str, Any]] = None


class SalaryCalculation(SalaryCalculationBase):
    id: int
    is_sent: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Import Log Schemas
class ImportLogCreate(BaseModel):
    import_type: str
    file_name: Optional[str] = None
    records_imported: int = 0
    records_failed: int = 0
    status: str
    error_message: Optional[str] = None


class ImportLog(ImportLogCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard Schemas
class EmployeePerformance(BaseModel):
    employee_id: int
    employee_name: str
    position: str
    total_plan: float
    total_fact: float
    completion_percent: float
    attendance_percent: float
    estimated_salary: float


class BrandPerformance(BaseModel):
    brand_id: int
    brand_name: str
    total_plan: float
    total_fact: float
    completion_percent: float


class TeamDashboard(BaseModel):
    period_start: date
    period_end: date
    total_employees: int
    active_employees: int
    total_plan: float
    total_fact: float
    avg_completion_percent: float
    employees: List[EmployeePerformance]
    brands: List[BrandPerformance]


# Bulk Import Schemas
class BulkSalesImport(BaseModel):
    sales_data: List[SalesFactCreate]


class BulkAttendanceImport(BaseModel):
    attendance_data: List[AttendanceCreate]


# Absence Schemas
class AbsenceBase(BaseModel):
    employee_id: int
    absence_date: date
    reason: Optional[str] = None


class AbsenceCreate(AbsenceBase):
    company_id: Optional[int] = 1


class AbsenceUpdate(BaseModel):
    absence_date: Optional[date] = None
    reason: Optional[str] = None


class Absence(AbsenceBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Bonus Schemas
class BonusBase(BaseModel):
    employee_id: int
    bonus_date: date
    amount: float
    note: Optional[str] = None


class BonusCreate(BonusBase):
    company_id: Optional[int] = 1


class BonusUpdate(BaseModel):
    bonus_date: Optional[date] = None
    amount: Optional[float] = None
    note: Optional[str] = None


class Bonus(BonusBase):
    id: int
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    username: str
    role: str  # admin, analyst, director
    company_id: Optional[int] = None  # null для admin и director
    employee_id: Optional[int] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None
    employee_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Ответ с данными пользователя (без пароля)"""
    id: int
    username: str
    role: str
    company_id: Optional[int] = None
    employee_id: Optional[int] = None
    is_active: bool
    
    class Config:
        from_attributes = True


# DailyOrderStats Schemas
class DailyOrderStatsBase(BaseModel):
    employee_id: int
    order_date: date
    order_count: int = 0
    order_sum: float = 0
    calculated_day_value: float = 0


class DailyOrderStatsCreate(DailyOrderStatsBase):
    pass


class DailyOrderStatsUpdate(BaseModel):
    order_count: Optional[int] = None
    order_sum: Optional[float] = None
    calculated_day_value: Optional[float] = None


class DailyOrderStats(DailyOrderStatsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Токен доступа"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Данные из токена"""
    username: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None


# Telegram Message Template Schemas
class TelegramMessageTemplateBase(BaseModel):
    name: str
    template_text: str
    is_active: bool = True


class TelegramMessageTemplateCreate(TelegramMessageTemplateBase):
    company_id: int


class TelegramMessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    template_text: Optional[str] = None
    is_active: Optional[bool] = None


class TelegramMessageTemplate(TelegramMessageTemplateBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
