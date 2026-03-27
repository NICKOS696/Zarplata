from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, JSON, DateTime, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Company(Base):
    """Модель компании (для мультитенантности)"""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    telegram_bot_token = Column(String, nullable=True)  # Токен Telegram бота для отправки отчётов
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    territories = relationship("Territory", back_populates="company")
    employees = relationship("Employee", back_populates="company")
    brands = relationship("Brand", back_populates="company")
    kpi_types = relationship("KPIType", back_populates="company")
    salary_rules = relationship("SalaryRule", back_populates="company")


class Territory(Base):
    """Модель структуры компании (территория/отдел)"""
    __tablename__ = "territories"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    sort_order = Column(Integer, default=0)  # Порядок сортировки
    is_active = Column(Boolean, default=True)
    
    # Тип расчёта отработанных дней: 'standard' (по факту) или 'criteria' (по критериям заказов)
    work_days_calculation = Column(String, default='standard')
    
    # Критерии для расчёта по количеству заказов (пороговые значения)
    order_count_threshold_low = Column(Integer, default=0)    # меньше этого = 0
    order_count_threshold_mid = Column(Integer, default=0)    # от этого = 0.25
    order_count_threshold_high = Column(Integer, default=0)   # больше этого = 0.5
    
    # Критерии для расчёта по сумме заказов (пороговые значения)
    order_sum_threshold_low = Column(Float, default=0)        # меньше этого = 0
    order_sum_threshold_mid = Column(Float, default=0)        # от этого = 0.25
    order_sum_threshold_high = Column(Float, default=0)       # больше этого = 0.5
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="territories")
    employees = relationship("Employee", back_populates="territory")


class Employee(Base):
    """Модель сотрудника"""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False, index=True)
    name_1c = Column(String, nullable=True, index=True)  # Название в 1С для интеграции
    position = Column(String, nullable=False)  # agent, supervisor, manager
    telegram_id = Column(String, nullable=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    territory_id = Column(Integer, ForeignKey("territories.id"), nullable=True)  # Привязка к структуре
    salary_rule_id = Column(Integer, ForeignKey("salary_rules.id"), nullable=True)  # Привязка к правилу зарплаты
    is_active = Column(Boolean, default=True)
    fixed_salary = Column(Float, default=0.0)  # Фиксированная часть зарплаты (deprecated, теперь в правиле)
    hire_date = Column(Date, nullable=True)  # Дата приема на работу
    termination_date = Column(Date, nullable=True)  # Дата увольнения
    probation_days = Column(Integer, default=0)  # Количество дней стажировки (считаются как 0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="employees")
    supervisor = relationship("Employee", remote_side=[id], foreign_keys=[supervisor_id], backref="supervised_agents")
    manager = relationship("Employee", remote_side=[id], foreign_keys=[manager_id], backref="managed_employees")
    territory = relationship("Territory", back_populates="employees")
    salary_rule = relationship("SalaryRule", backref="employees")
    sales_facts = relationship("SalesFact", back_populates="employee")
    sales_plans = relationship("SalesPlan", back_populates="employee")
    attendance_records = relationship("Attendance", back_populates="employee")
    salary_calculations = relationship("SalaryCalculation", back_populates="employee")
    absences = relationship("Absence", back_populates="employee")
    bonuses = relationship("Bonus", back_populates="employee")


class Brand(Base):
    """Модель бренда"""
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    name_1c = Column(String, nullable=True)  # Название в 1С для импорта
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="brands")
    sales_facts = relationship("SalesFact", back_populates="brand")
    sales_plans = relationship("SalesPlan", back_populates="brand")
    
    # Уникальность: имя бренда уникально в рамках компании
    __table_args__ = (UniqueConstraint('company_id', 'name', name='_company_brand_uc'),)


class KPIType(Base):
    """Модель типа KPI"""
    __tablename__ = "kpi_types"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    name_1c = Column(String, nullable=True)  # Название в 1С для импорта
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    no_plan = Column(Boolean, default=False)  # KPI без плана (только факт и начисление)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="kpi_types")
    sales_facts = relationship("SalesFact", back_populates="kpi_type")
    sales_plans = relationship("SalesPlan", back_populates="kpi_type")
    
    # Уникальность: имя KPI уникально в рамках компании
    __table_args__ = (UniqueConstraint('company_id', 'name', name='_company_kpi_uc'),)


class SalesPlan(Base):
    """Модель плана продаж"""
    __tablename__ = "sales_plans"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    kpi_type_id = Column(Integer, ForeignKey("kpi_types.id"), nullable=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    plan_value = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="sales_plans")
    brand = relationship("Brand", back_populates="sales_plans")
    kpi_type = relationship("KPIType", back_populates="sales_plans")


class SalesFact(Base):
    """Модель фактических продаж"""
    __tablename__ = "sales_facts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    kpi_type_id = Column(Integer, ForeignKey("kpi_types.id"), nullable=True)
    sale_date = Column(Date, nullable=False, index=True)
    fact_value = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="sales_facts")
    brand = relationship("Brand", back_populates="sales_facts")
    kpi_type = relationship("KPIType", back_populates="sales_facts")


class Attendance(Base):
    """Модель табеля посещаемости (по месяцам)"""
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint('employee_id', 'year', 'month', name='_employee_year_month_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12
    days_worked = Column(Float, default=0.0)  # Количество отработанных дней (поддерживает 0.5)
    order_count = Column(Integer, default=0)  # Количество заявок за месяц (для грейдовой системы)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")


class SalaryRule(Base):
    """Модель правил расчета зарплаты"""
    __tablename__ = "salary_rules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)  # agent, supervisor, manager
    
    # Фиксированные части
    fixed_salary = Column(Float, default=0.0)  # Фиксированный оклад (классический)
    travel_allowance = Column(Float, default=0.0)  # Дорожные (фиксированные)
    
    # Грейдовая система фиксированной оплаты
    fixed_salary_type = Column(String, default='classic')  # 'classic' или 'graded'
    
    # Грейд "Стажер"
    grade_trainee_salary = Column(Float, default=0.0)  # Сумма оклада для стажера
    grade_trainee_condition = Column(String, default='orders')  # 'orders' или 'percent'
    grade_trainee_threshold = Column(Float, default=0.0)  # Порог (кол-во заявок или %)
    
    # Грейд "Профессионал"
    grade_professional_salary = Column(Float, default=0.0)  # Сумма оклада для профессионала
    grade_professional_condition = Column(String, default='orders')  # 'orders' или 'percent'
    grade_professional_threshold = Column(Float, default=0.0)  # Порог (кол-во заявок или %)
    
    # Грейд "Эксперт"
    grade_expert_salary = Column(Float, default=0.0)  # Сумма оклада для эксперта
    grade_expert_condition = Column(String, default='orders')  # 'orders' или 'percent'
    grade_expert_threshold = Column(Float, default=0.0)  # Порог (кол-во заявок или %)
    
    # Мотивационная часть - JSON для гибкости
    # Структура: {
    #   "brands": {
    #     "brand_id": {
    #       "method": "fixed_per_percent" | "percent_of_sales" | "bonus_plus_percent",
    #       "threshold_from": 70,  # С какого % начинается начисление
    #       "threshold_to": 110,   # До какого % идет начисление
    #       "config": {...}        # Зависит от метода
    #     }
    #   },
    #   "kpis": {
    #     "kpi_id": {
    #       "method": "fixed_per_percent",
    #       "threshold_from": 80,
    #       "threshold_to": 110,
    #       "config": {...}
    #     }
    #   }
    # }
    motivation_config = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="salary_rules")


class SalaryCalculation(Base):
    """Модель расчета зарплаты"""
    __tablename__ = "salary_calculations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    # Компоненты зарплаты
    fixed_part = Column(Float, default=0.0)  # Фиксированная часть
    motivation_part = Column(Float, default=0.0)  # Мотивационная часть
    bonus_part = Column(Float, default=0.0)  # Бонусы
    penalty_part = Column(Float, default=0.0)  # Штрафы
    total_salary = Column(Float, default=0.0)  # Итого
    
    # Метрики выполнения
    plan_completion_percent = Column(Float, default=0.0)
    attendance_percent = Column(Float, default=0.0)
    days_worked = Column(Integer, default=0)
    days_total = Column(Integer, default=0)
    
    # Детали расчета
    calculation_details = Column(JSON, nullable=True)
    
    is_sent = Column(Boolean, default=False)  # Отправлено ли в Telegram
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="salary_calculations")


class WorkCalendar(Base):
    """Модель производственного календаря"""
    __tablename__ = "work_calendar"
    __table_args__ = (UniqueConstraint('year', 'month', name='_year_month_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12
    working_days = Column(Integer, nullable=False)  # Количество рабочих дней
    notes = Column(String, nullable=True)  # Примечания (праздники и т.д.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReservedOrders(Base):
    """Модель заказов в резерве (не отгруженные заказы)"""
    __tablename__ = "reserved_orders"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    kpi_type_id = Column(Integer, ForeignKey("kpi_types.id"), nullable=True)
    order_date = Column(Date, nullable=False, index=True)
    reserved_value = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", backref="reserved_orders")
    brand = relationship("Brand", backref="reserved_orders")
    kpi_type = relationship("KPIType", backref="reserved_orders")


class ImportLog(Base):
    """Модель логов импорта данных"""
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    import_type = Column(String, nullable=False)  # sales, attendance, plans, reserved
    file_name = Column(String, nullable=True)
    records_imported = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    status = Column(String, nullable=False)  # success, failed, partial
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Absence(Base):
    """Модель пропусков сотрудников"""
    __tablename__ = "absences"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    absence_date = Column(Date, nullable=False, index=True)
    reason = Column(Text, nullable=True)  # Причина пропуска
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="absences")

    # Уникальность: один сотрудник - одна запись на дату
    __table_args__ = (UniqueConstraint('employee_id', 'absence_date', name='_employee_absence_date_uc'),)


class Bonus(Base):
    """Модель бонусов сотрудников"""
    __tablename__ = "bonuses"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    bonus_date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)  # Сумма бонуса
    note = Column(Text, nullable=True)  # Примечание
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="bonuses")


class DailyOrderStats(Base):
    """Модель ежедневной статистики заказов (для расчёта отработанных дней по критериям)"""
    __tablename__ = "daily_order_stats"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    order_date = Column(Date, nullable=False, index=True)
    order_count = Column(Integer, default=0)  # Количество заказов за день
    order_sum = Column(Float, default=0)      # Сумма заказов за день
    calculated_day_value = Column(Float, default=0)  # Рассчитанное значение дня (0, 0.25, 0.5, 0.75, 1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")

    # Уникальность: один сотрудник - одна дата
    __table_args__ = (UniqueConstraint('employee_id', 'order_date', name='_employee_order_date_uc'),)


class User(Base):
    """Модель пользователя для аутентификации"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, analyst, director
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)  # Компания пользователя (null для admin)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # Связь с сотрудником
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")
    
    # Роли:
    # - admin: полный доступ ко всем данным всех компаний (company_id = null)
    # - analyst: доступ ко всем данным своей компании (company_id указан)
    # - director: доступ к сводной таблице с переключателем компаний (company_id = null)


class TelegramMessageTemplate(Base):
    """Модель шаблона сообщения для Telegram"""
    __tablename__ = "telegram_message_templates"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # Название шаблона
    template_text = Column(Text, nullable=False)  # Текст шаблона с переменными вида {employee_name}, {brand_plan}, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    company = relationship("Company")

    __table_args__ = (
        UniqueConstraint('company_id', 'name', name='uq_telegram_template_company_name'),
    )
