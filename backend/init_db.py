"""
Скрипт инициализации базы данных с тестовыми данными
"""
from database import engine, SessionLocal
import models
import schemas
import crud
from datetime import date, timedelta

def init_database():
    """Инициализация базы данных"""
    
    # Создаем таблицы
    print("Создание таблиц...")
    models.Base.metadata.create_all(bind=engine)
    print("✓ Таблицы созданы")
    
    db = SessionLocal()
    
    try:
        # Проверяем, есть ли уже данные
        existing_employees = db.query(models.Employee).first()
        if existing_employees:
            print("База данных уже содержит данные. Пропускаем инициализацию.")
            return
        
        print("\nДобавление тестовых данных...")
        
        # Создаем территории
        territories = []
        territory_names = [
            "ТА Миробадский район",
            "ТА Юнус Абадский район",
            "СУПЕРВАЙЗЕР ГОРОД [1]",
            "ТА Чиланзарский район",
            "ТА Мирзо Улугбекский район",
            "СУПЕРВАЙЗЕР ГОРОД [2]",
            "МЕНЕДЖЕР ГОРОД",
        ]
        
        for i, name in enumerate(territory_names):
            territory = crud.create_territory(db, schemas.TerritoryCreate(
                name=name,
                sort_order=i,
                is_active=True
            ))
            territories.append(territory)
        print(f"✓ Создано территорий: {len(territories)}")
        
        # Создаем менеджера (верхний уровень)
        manager = crud.create_employee(db, schemas.EmployeeCreate(
            full_name="Иванов Иван Иванович",
            position="manager",
            telegram_id="111111111",
            territory_id=territories[6].id,  # МЕНЕДЖЕР ГОРОД
            fixed_salary=80000.0,
            is_active=True
        ))
        print(f"✓ Создан менеджер: {manager.full_name}")
        
        # Создаем супервайзеров
        supervisors = []
        supervisor_data = [
            ("Петров Петр Петрович", territories[2].id),  # СУПЕРВАЙЗЕР ГОРОД [1]
            ("Сидорова Мария Ивановна", territories[5].id),  # СУПЕРВАЙЗЕР ГОРОД [2]
        ]
        
        for i, (name, territory_id) in enumerate(supervisor_data):
            supervisor = crud.create_employee(db, schemas.EmployeeCreate(
                full_name=name,
                position="supervisor",
                telegram_id=f"22222222{i}",
                territory_id=territory_id,
                manager_id=manager.id,
                fixed_salary=50000.0,
                is_active=True
            ))
            supervisors.append(supervisor)
            print(f"✓ Создан супервайзер: {supervisor.full_name}")
        
        # Создаем торговых агентов
        agents = []
        agent_data = [
            ("Козлов Алексей Сергеевич", territories[0].id, supervisors[0].id),  # ТА Миробадский район
            ("Новикова Елена Дмитриевна", territories[1].id, supervisors[0].id),  # ТА Юнус Абадский район
            ("Смирнов Дмитрий Петрович", territories[3].id, supervisors[1].id),  # ТА Чиланзарский район
            ("Кузнецова Анна Ивановна", territories[4].id, supervisors[1].id)  # ТА Мирзо Улугбекский район
        ]
        
        for i, (name, territory_id, supervisor_id) in enumerate(agent_data):
            agent = crud.create_employee(db, schemas.EmployeeCreate(
                full_name=name,
                position="agent",
                telegram_id=f"33333333{i}",
                territory_id=territory_id,
                supervisor_id=supervisor_id,
                manager_id=manager.id,
                fixed_salary=30000.0,
                is_active=True
            ))
            agents.append(agent)
            print(f"✓ Создан торговый агент: {agent.full_name}")
        
        # Создаем бренды
        brand_names = ["Brand A", "Brand B", "Brand C", "Brand D"]
        brands = []
        for brand_name in brand_names:
            brand = crud.create_brand(db, schemas.BrandCreate(
                name=brand_name,
                is_active=True
            ))
            brands.append(brand)
        print(f"✓ Создано брендов: {len(brands)}")
        
        # Создаем типы KPI
        kpi_names = [
            ("Объем продаж", "Общий объем продаж в рублях"),
            ("Количество сделок", "Количество закрытых сделок"),
            ("Новые клиенты", "Количество привлеченных новых клиентов")
        ]
        kpi_types = []
        for kpi_name, kpi_desc in kpi_names:
            kpi = crud.create_kpi_type(db, schemas.KPITypeCreate(
                name=kpi_name,
                description=kpi_desc,
                is_active=True
            ))
            kpi_types.append(kpi)
        print(f"✓ Создано типов KPI: {len(kpi_types)}")
        
        # Создаем планы продаж на текущий месяц
        today = date.today()
        month_start = date(today.year, today.month, 1)
        if today.month == 12:
            month_end = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(today.year, today.month + 1, 1) - timedelta(days=1)
        
        print(f"\nСоздание планов на период: {month_start} - {month_end}")
        
        for agent in agents:
            for brand in brands:
                # План по объему продаж
                crud.create_sales_plan(db, schemas.SalesPlanCreate(
                    employee_id=agent.id,
                    brand_id=brand.id,
                    kpi_type_id=kpi_types[0].id,  # Объем продаж
                    period_start=month_start,
                    period_end=month_end,
                    plan_value=100000.0
                ))
                
                # План по количеству сделок
                crud.create_sales_plan(db, schemas.SalesPlanCreate(
                    employee_id=agent.id,
                    brand_id=brand.id,
                    kpi_type_id=kpi_types[1].id,  # Количество сделок
                    period_start=month_start,
                    period_end=month_end,
                    plan_value=20.0
                ))
        
        print(f"✓ Создано планов продаж")
        
        # Создаем тестовые факты продаж
        import random
        for agent in agents:
            for day in range(1, min(today.day + 1, 15)):  # За первые 2 недели месяца
                sale_date = date(today.year, today.month, day)
                
                for brand in brands[:2]:  # Только для первых двух брендов
                    # Факт продаж
                    crud.create_sales_fact(db, schemas.SalesFactCreate(
                        employee_id=agent.id,
                        brand_id=brand.id,
                        kpi_type_id=kpi_types[0].id,
                        sale_date=sale_date,
                        fact_value=random.uniform(3000, 8000)
                    ))
                    
                    # Факт сделок
                    crud.create_sales_fact(db, schemas.SalesFactCreate(
                        employee_id=agent.id,
                        brand_id=brand.id,
                        kpi_type_id=kpi_types[1].id,
                        sale_date=sale_date,
                        fact_value=random.randint(1, 3)
                    ))
        
        print(f"✓ Созданы тестовые факты продаж")
        
        # Создаем производственный календарь для текущего месяца
        crud.create_work_calendar(db, schemas.WorkCalendarCreate(
            year=today.year,
            month=today.month,
            working_days=22,  # Стандартное количество рабочих дней
            notes="Стандартный месяц"
        ))
        print(f"✓ Создан производственный календарь")
        
        # Создаем табель посещаемости (по месяцам)
        for agent in agents:
            # Случайное количество отработанных дней (от 18 до 22)
            days_worked = random.randint(18, 22)
            
            crud.create_attendance(db, schemas.AttendanceCreate(
                employee_id=agent.id,
                year=today.year,
                month=today.month,
                days_worked=days_worked,
                notes=f"Отработано {days_worked} из 22 дней"
            ))
        
        print(f"✓ Создан табель посещаемости")
        
        # Создаем правила расчета зарплаты
        
        # Правило для торговых агентов - процент от продаж
        crud.create_salary_rule(db, schemas.SalaryRuleCreate(
            name="Базовый процент для торговых агентов",
            position="agent",
            rule_type="percentage",
            config={
                "base_percent": 3,
                "bonus_percent": 2,
                "threshold": 100
            },
            is_active=True
        ))
        
        # Правило для супервайзеров - процент от команды
        crud.create_salary_rule(db, schemas.SalaryRuleCreate(
            name="Процент от команды для супервайзеров",
            position="supervisor",
            rule_type="percentage",
            config={
                "base_percent": 1,
                "bonus_percent": 1,
                "threshold": 100
            },
            is_active=True
        ))
        
        # Правило для менеджеров - процент от всей команды
        crud.create_salary_rule(db, schemas.SalaryRuleCreate(
            name="Процент от всей команды для менеджеров",
            position="manager",
            rule_type="percentage",
            config={
                "base_percent": 0.5,
                "bonus_percent": 0.5,
                "threshold": 100
            },
            is_active=True
        ))
        
        print(f"✓ Созданы правила расчета зарплаты")
        
        print("\n✅ База данных успешно инициализирована!")
        print(f"\nСоздано:")
        print(f"  - Сотрудников: {1 + len(supervisors) + len(agents)}")
        print(f"  - Брендов: {len(brands)}")
        print(f"  - Типов KPI: {len(kpi_types)}")
        print(f"  - Планов продаж: {len(agents) * len(brands) * 2}")
        print(f"\nТеперь вы можете:")
        print(f"  1. Запустить backend: cd backend && uvicorn main:app --reload")
        print(f"  2. Открыть API документацию: http://localhost:8000/docs")
        print(f"  3. Запустить frontend: cd frontend && npm run dev")
        
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
