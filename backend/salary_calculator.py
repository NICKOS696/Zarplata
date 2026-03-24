from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import models
import schemas
import crud


class SalaryCalculator:
    """Класс для расчета зарплаты с учетом мотивационной программы"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_plan_completion(
        self,
        employee_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """Рассчитывает процент выполнения плана"""
        
        # Получаем планы
        plans = crud.get_sales_plans(
            self.db,
            employee_id=employee_id,
            period_start=period_start,
            period_end=period_end
        )
        
        # Получаем факты
        facts = crud.get_sales_facts(
            self.db,
            employee_id=employee_id,
            date_from=period_start,
            date_to=period_end
        )
        
        # Группируем по брендам и KPI
        plan_by_category = {}
        fact_by_category = {}
        
        for plan in plans:
            key = (plan.brand_id, plan.kpi_type_id)
            plan_by_category[key] = plan_by_category.get(key, 0) + plan.plan_value
        
        for fact in facts:
            key = (fact.brand_id, fact.kpi_type_id)
            fact_by_category[key] = fact_by_category.get(key, 0) + fact.fact_value
        
        # Рассчитываем общий процент
        total_plan = sum(plan_by_category.values())
        total_fact = sum(fact_by_category.values())
        
        completion_percent = (total_fact / total_plan * 100) if total_plan > 0 else 0
        
        # Детализация по категориям
        details = []
        for key in plan_by_category:
            brand_id, kpi_type_id = key
            plan_val = plan_by_category[key]
            fact_val = fact_by_category.get(key, 0)
            percent = (fact_val / plan_val * 100) if plan_val > 0 else 0
            
            brand_name = None
            kpi_name = None
            
            if brand_id:
                brand = crud.get_brand(self.db, brand_id)
                brand_name = brand.name if brand else None
            
            if kpi_type_id:
                kpi = crud.get_kpi_type(self.db, kpi_type_id)
                kpi_name = kpi.name if kpi else None
            
            details.append({
                "brand": brand_name,
                "kpi": kpi_name,
                "plan": plan_val,
                "fact": fact_val,
                "percent": round(percent, 2)
            })
        
        return {
            "total_plan": total_plan,
            "total_fact": total_fact,
            "completion_percent": round(completion_percent, 2),
            "details": details
        }
    
    def calculate_attendance(
        self,
        employee_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """Рассчитывает посещаемость"""
        
        attendance_records = crud.get_attendance_records(
            self.db,
            employee_id=employee_id,
            year=period_start.year,
            month=period_start.month
        )
        
        # Если табель уже заполнен (конец месяца), берем фактические дни
        # Если нет - считаем, что сотрудник работает каждый рабочий день
        if attendance_records and attendance_records[0].days_worked > 0:
            days_worked = attendance_records[0].days_worked
        else:
            # Считаем рабочие дни с начала месяца до текущей даты
            from datetime import date
            today = date.today()
            current_end = min(period_end, today if today.month == period_start.month else period_end)
            
            days_worked = 0
            current_date = period_start
            while current_date <= current_end:
                if current_date.weekday() < 5:  # Пн-Пт
                    days_worked += 1
                current_date += timedelta(days=1)
        
        total_days = (period_end - period_start).days + 1
        
        # Считаем только рабочие дни (исключаем выходные)
        working_days = 0
        current_date = period_start
        while current_date <= period_end:
            if current_date.weekday() < 5:  # Пн-Пт
                working_days += 1
            current_date += timedelta(days=1)
        
        attendance_percent = (days_worked / working_days * 100) if working_days > 0 else 0
        
        return {
            "days_worked": days_worked,
            "working_days": working_days,
            "attendance_percent": round(attendance_percent, 2)
        }
    
    def calculate_motivation_part(
        self,
        completion_percent: float,
        total_fact: float,
        salary_rules: List[models.SalaryRule]
    ) -> Dict[str, Any]:
        """Рассчитывает мотивационную часть зарплаты"""
        
        motivation = 0.0
        bonus = 0.0
        applied_rules = []
        
        for rule in salary_rules:
            if not rule.is_active:
                continue
            
            config = rule.config
            rule_motivation = 0.0
            
            if rule.rule_type == "percentage":
                # Процент от выполнения
                base_percent = config.get("base_percent", 0)
                bonus_percent = config.get("bonus_percent", 0)
                threshold = config.get("threshold", 100)
                
                if completion_percent >= threshold:
                    rule_motivation = total_fact * (base_percent + bonus_percent) / 100
                    bonus += total_fact * bonus_percent / 100
                else:
                    rule_motivation = total_fact * base_percent / 100
                
            elif rule.rule_type == "tiered":
                # Ступенчатая система
                tiers = config.get("tiers", [])
                for tier in tiers:
                    tier_from = tier.get("from", 0)
                    tier_to = tier.get("to", 100)
                    tier_percent = tier.get("percent", 0)
                    
                    if tier_from <= completion_percent <= tier_to:
                        rule_motivation = total_fact * tier_percent / 100
                        break
            
            elif rule.rule_type == "fixed":
                # Фиксированная сумма при достижении порога
                threshold = config.get("threshold", 100)
                amount = config.get("amount", 0)
                
                if completion_percent >= threshold:
                    rule_motivation = amount
            
            motivation += rule_motivation
            
            if rule_motivation > 0:
                applied_rules.append({
                    "rule_name": rule.name,
                    "rule_type": rule.rule_type,
                    "amount": round(rule_motivation, 2)
                })
        
        return {
            "motivation_part": round(motivation, 2),
            "bonus_part": round(bonus, 2),
            "applied_rules": applied_rules
        }
    
    def calculate_fixed_part(
        self,
        base_fixed_salary: float,
        attendance_percent: float,
        min_attendance_threshold: float = 80.0
    ) -> Dict[str, Any]:
        """Рассчитывает фиксированную часть с учетом посещаемости"""
        
        if attendance_percent >= min_attendance_threshold:
            fixed_part = base_fixed_salary
            penalty = 0.0
        else:
            # Пропорционально посещаемости
            fixed_part = base_fixed_salary * (attendance_percent / 100)
            penalty = base_fixed_salary - fixed_part
        
        return {
            "fixed_part": round(fixed_part, 2),
            "penalty_part": round(penalty, 2)
        }
    
    def calculate_motivation_by_config(
        self,
        employee_id: int,
        period_start: date,
        period_end: date,
        motivation_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Рассчитывает мотивационную часть по новой структуре motivation_config"""
        
        if not motivation_config:
            return {"motivation_part": 0.0, "bonus_part": 0.0, "applied_rules": []}
        
        # Получаем планы и факты по брендам и KPI
        plans = crud.get_sales_plans(self.db, employee_id=employee_id, period_start=period_start, period_end=period_end)
        facts = crud.get_sales_facts(self.db, employee_id=employee_id, date_from=period_start, date_to=period_end)
        
        # Группируем по брендам и KPI
        plan_by_item = {}
        fact_by_item = {}
        
        for plan in plans:
            if plan.brand_id:
                key = ('brand', plan.brand_id)
                plan_by_item[key] = plan_by_item.get(key, 0) + plan.plan_value
            elif plan.kpi_type_id:
                key = ('kpi', plan.kpi_type_id)
                plan_by_item[key] = plan_by_item.get(key, 0) + plan.plan_value
        
        for fact in facts:
            if fact.brand_id:
                key = ('brand', fact.brand_id)
                fact_by_item[key] = fact_by_item.get(key, 0) + fact.fact_value
            elif fact.kpi_type_id:
                key = ('kpi', fact.kpi_type_id)
                fact_by_item[key] = fact_by_item.get(key, 0) + fact.fact_value
        
        total_motivation = 0.0
        total_bonus = 0.0
        applied_rules = []
        
        # Обрабатываем бренды
        brands_config = motivation_config.get('brands', {})
        for brand_id_str, brand_rules in brands_config.items():
            brand_id = int(brand_id_str)
            key = ('brand', brand_id)
            plan_val = plan_by_item.get(key, 0)
            fact_val = fact_by_item.get(key, 0)
            
            if plan_val > 0:
                completion_percent = (fact_val / plan_val) * 100
                
                # Поддержка как старого формата (один объект), так и нового (массив правил)
                rules_list = brand_rules if isinstance(brand_rules, list) else [brand_rules]
                
                brand_total_amount = 0
                brand_total_bonus = 0
                
                # Проходим по всем правилам для этого бренда
                for rule_config in rules_list:
                    result = self._calculate_by_method(rule_config, completion_percent, fact_val, plan_val)
                    brand_total_amount += result['amount']
                    brand_total_bonus += result['bonus']
                
                total_motivation += brand_total_amount
                total_bonus += brand_total_bonus
                
                if brand_total_amount > 0 or brand_total_bonus > 0:
                    brand = crud.get_brand(self.db, brand_id)
                    applied_rules.append({
                        "item_name": brand.name if brand else f"Brand {brand_id}",
                        "method": f"{len(rules_list)} правил(а)" if len(rules_list) > 1 else rules_list[0].get('method'),
                        "completion_percent": round(completion_percent, 2),
                        "amount": round(brand_total_amount + brand_total_bonus, 2)
                    })
        
        # Обрабатываем KPI
        kpis_config = motivation_config.get('kpis', {})
        for kpi_id_str, kpi_config in kpis_config.items():
            kpi_id = int(kpi_id_str)
            key = ('kpi', kpi_id)
            plan_val = plan_by_item.get(key, 0)
            fact_val = fact_by_item.get(key, 0)
            
            if plan_val > 0:
                completion_percent = (fact_val / plan_val) * 100
                result = self._calculate_by_method(kpi_config, completion_percent, fact_val, plan_val)
                total_motivation += result['amount']
                total_bonus += result['bonus']
                
                if result['amount'] > 0 or result['bonus'] > 0:
                    kpi = crud.get_kpi_type(self.db, kpi_id)
                    applied_rules.append({
                        "item_name": kpi.name if kpi else f"KPI {kpi_id}",
                        "method": kpi_config.get('method'),
                        "completion_percent": round(completion_percent, 2),
                        "amount": round(result['amount'] + result['bonus'], 2)
                    })
        
        # Обрабатываем комбинации брендов
        brand_combinations = motivation_config.get('brand_combinations', [])
        for combo in brand_combinations:
            brand_ids = combo.get('brand_ids', [])
            if not brand_ids:
                continue
            
            # Суммируем планы и факты по всем брендам в комбинации
            combo_plan = sum(plan_by_item.get(('brand', bid), 0) for bid in brand_ids)
            combo_fact = sum(fact_by_item.get(('brand', bid), 0) for bid in brand_ids)
            
            if combo_plan > 0:
                completion_percent = (combo_fact / combo_plan) * 100
                result = self._calculate_by_method(combo, completion_percent, combo_fact, combo_plan)
                total_motivation += result['amount']
                total_bonus += result['bonus']
                
                if result['amount'] > 0 or result['bonus'] > 0:
                    brand_names = []
                    for bid in brand_ids:
                        brand = crud.get_brand(self.db, bid)
                        if brand:
                            brand_names.append(brand.name)
                    
                    applied_rules.append({
                        "item_name": f"Комбинация: {', '.join(brand_names)}",
                        "method": combo.get('method'),
                        "completion_percent": round(completion_percent, 2),
                        "amount": round(result['amount'] + result['bonus'], 2)
                    })
        
        # Обрабатываем "все бренды вместе"
        all_brands_config = motivation_config.get('all_brands')
        if all_brands_config:
            # Суммируем планы и факты по всем брендам
            all_brands_plan = sum(v for k, v in plan_by_item.items() if k[0] == 'brand')
            all_brands_fact = sum(v for k, v in fact_by_item.items() if k[0] == 'brand')
            
            if all_brands_plan > 0:
                completion_percent = (all_brands_fact / all_brands_plan) * 100
                result = self._calculate_by_method(all_brands_config, completion_percent, all_brands_fact, all_brands_plan)
                total_motivation += result['amount']
                total_bonus += result['bonus']
                
                if result['amount'] > 0 or result['bonus'] > 0:
                    applied_rules.append({
                        "item_name": "Все бренды вместе",
                        "method": all_brands_config.get('method'),
                        "completion_percent": round(completion_percent, 2),
                        "amount": round(result['amount'] + result['bonus'], 2)
                    })
        
        return {
            "motivation_part": round(total_motivation, 2),
            "bonus_part": round(total_bonus, 2),
            "applied_rules": applied_rules
        }
    
    def _calculate_by_method(
        self,
        config: Dict[str, Any],
        completion_percent: float,
        fact_val: float,
        plan_val: float
    ) -> Dict[str, float]:
        """Рассчитывает начисление по конкретному методу"""
        
        method = config.get('method', 'fixed_amount_table')
        amount = 0.0
        bonus = 0.0
        
        if method == 'fixed_amount_table':
            # Таблица фиксированных сумм
            thresholds = config.get('thresholds', [])
            for threshold_item in sorted(thresholds, key=lambda x: x.get('threshold', 0), reverse=True):
                if completion_percent >= threshold_item.get('threshold', 0):
                    amount = threshold_item.get('amount', 0)
                    break
        
        elif method == 'percent_of_sales':
            # Процент от продаж
            threshold_from = config.get('threshold_from', 0)
            threshold_to = config.get('threshold_to', 999)
            percent = config.get('percent', 0)
            
            print(f"DEBUG percent_of_sales: completion={completion_percent}, from={threshold_from}, to={threshold_to}, percent={percent}, fact={fact_val}")
            
            # Проверяем, попадает ли процент выполнения в заданный диапазон
            if completion_percent >= threshold_from and completion_percent <= threshold_to:
                amount = fact_val * (percent / 100)
                print(f"DEBUG percent_of_sales: НАЧИСЛЕНО amount={amount}")
        
        elif method == 'bonus_plus_percent':
            # Таблица фиксированных сумм + % от перевыполнения
            amounts = config.get('amounts', {})
            
            # Находим фиксированную сумму по таблице
            # Ищем максимальный порог, который достигнут
            completion_int = int(completion_percent)
            threshold_from = config.get('threshold_from', 70)
            threshold_to = config.get('threshold_to', 100)
            
            for threshold in range(threshold_to, threshold_from - 1, -1):
                if completion_int >= threshold:
                    amount = amounts.get(str(threshold), 0)
                    break
            
            # Добавляем процент от перевыполнения (свыше 100%)
            if completion_percent > 100:
                percent_of_excess = config.get('percent_of_excess', 0)
                excess_amount = fact_val - plan_val  # Сумма перевыполнения
                bonus = excess_amount * (percent_of_excess / 100)
        
        return {"amount": amount, "bonus": bonus}

    def calculate_employee_salary(
        self,
        employee_id: int,
        period_start: date,
        period_end: date
    ) -> schemas.SalaryCalculationBase:
        """Полный расчет зарплаты сотрудника"""
        
        # Получаем сотрудника
        employee = crud.get_employee(self.db, employee_id)
        if not employee:
            raise ValueError(f"Employee {employee_id} not found")
        
        # Расчет выполнения плана
        plan_data = self.calculate_plan_completion(employee_id, period_start, period_end)
        
        # Расчет посещаемости
        attendance_data = self.calculate_attendance(employee_id, period_start, period_end)
        
        # Получаем правило зарплаты сотрудника
        salary_rule = None
        if employee.salary_rule_id:
            salary_rule = crud.get_salary_rule(self.db, employee.salary_rule_id)
        
        # Расчет мотивационной части
        if salary_rule and salary_rule.motivation_config:
            motivation_data = self.calculate_motivation_by_config(
                employee_id,
                period_start,
                period_end,
                salary_rule.motivation_config
            )
        else:
            # Fallback на старый метод для совместимости
            salary_rules = crud.get_salary_rules(self.db, position=employee.position, is_active=True)
            motivation_data = self.calculate_motivation_part(
                plan_data["completion_percent"],
                plan_data["total_fact"],
                salary_rules
            )
        
        # Расчет фиксированной части
        fixed_data = self.calculate_fixed_part(
            employee.fixed_salary,
            attendance_data["attendance_percent"]
        )
        
        # Получаем бонусы за период
        bonuses = crud.get_bonuses(
            self.db,
            employee_id=employee_id,
            date_from=period_start,
            date_to=period_end
        )
        total_bonuses = sum(bonus.amount for bonus in bonuses)
        
        # Итоговая зарплата
        total_salary = (
            fixed_data["fixed_part"] +
            motivation_data["motivation_part"] +
            motivation_data["bonus_part"] +
            total_bonuses -
            fixed_data["penalty_part"]
        )
        
        # Детали расчета
        calculation_details = {
            "plan_data": plan_data,
            "attendance_data": attendance_data,
            "motivation_data": motivation_data,
            "fixed_data": fixed_data,
            "bonuses": {
                "count": len(bonuses),
                "total_amount": total_bonuses,
                "details": [{"date": str(b.bonus_date), "amount": b.amount, "note": b.note} for b in bonuses]
            }
        }
        
        # Создаем объект расчета
        salary_calculation = schemas.SalaryCalculationBase(
            employee_id=employee_id,
            period_start=period_start,
            period_end=period_end,
            fixed_part=fixed_data["fixed_part"],
            motivation_part=motivation_data["motivation_part"],
            bonus_part=motivation_data["bonus_part"],
            penalty_part=fixed_data["penalty_part"],
            total_salary=round(total_salary, 2),
            plan_completion_percent=plan_data["completion_percent"],
            attendance_percent=attendance_data["attendance_percent"],
            days_worked=attendance_data["days_worked"],
            days_total=attendance_data["working_days"],
            calculation_details=calculation_details
        )
        
        return salary_calculation
    
    def calculate_team_salaries(
        self,
        period_start: date,
        period_end: date,
        supervisor_id: Optional[int] = None
    ) -> List[schemas.SalaryCalculationBase]:
        """Расчет зарплаты для всей команды"""
        
        employees = crud.get_employees(self.db, is_active=True)
        
        if supervisor_id:
            employees = [emp for emp in employees if emp.supervisor_id == supervisor_id]
        
        calculations = []
        for employee in employees:
            try:
                calculation = self.calculate_employee_salary(
                    employee.id,
                    period_start,
                    period_end
                )
                calculations.append(calculation)
            except Exception as e:
                print(f"Error calculating salary for employee {employee.id}: {e}")
                continue
        
        return calculations
