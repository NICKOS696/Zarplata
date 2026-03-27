"""
Утилита для рендеринга шаблонов сообщений Telegram
Подставляет переменные из данных сводной таблицы
"""
from typing import Dict, List, Any
from datetime import datetime, date, timedelta
import re


def generate_progress_bar(percent: float, length: int = 10) -> str:
    """Генерирует шкалу выполнения вида ▰▰▰▰▰▱▱▱▱▱"""
    filled = int((percent / 100) * length)
    empty = length - filled
    return '▰' * filled + '▱' * empty


def calculate_forecast(total_fact: float, days_worked: int, working_days: int) -> float:
    """Рассчитывает прогноз на конец месяца"""
    if days_worked == 0:
        return 0
    daily_average = total_fact / days_worked
    return daily_average * working_days


def calculate_plan_per_day(total_plan: float, total_fact: float, days_remaining: int) -> float:
    """Рассчитывает план на завтра (остаток плана / оставшиеся дни)"""
    if days_remaining <= 0:
        return 0
    remaining_plan = max(0, total_plan - total_fact)
    return remaining_plan / days_remaining


def format_number(value: float) -> str:
    """Форматирует число с разделителями тысяч"""
    return f"{int(value):,}".replace(',', ' ')


def render_template(template_text: str, employee_data: Dict[str, Any]) -> str:
    """
    Рендерит шаблон с подстановкой переменных
    
    Args:
        template_text: Текст шаблона с переменными
        employee_data: Данные сотрудника из сводной таблицы
        
    Returns:
        Отрендеренный текст сообщения
    """
    result = template_text
    
    # Базовые переменные
    result = result.replace('{employee_name}', employee_data.get('employee_name', ''))
    result = result.replace('{territory}', employee_data.get('territory', ''))
    
    # Дата
    now = datetime.now()
    result = result.replace('{date}', now.strftime('%d.%m.%Y'))
    result = result.replace('{month}', now.strftime('%B'))
    result = result.replace('{year}', str(now.year))
    
    # Зарплата
    result = result.replace('{fixed_salary}', format_number(employee_data.get('fixed_salary', 0)))
    result = result.replace('{travel_allowance}', format_number(employee_data.get('travel_allowance', 0)))
    result = result.replace('{bonus}', format_number(employee_data.get('bonus', 0)))
    result = result.replace('{days_worked}', str(employee_data.get('days_worked', 0)))
    result = result.replace('{working_days}', str(employee_data.get('working_days', 0)))
    
    # Обрабатываем цикл по брендам
    brands_loop_pattern = r'\{brands_loop\}(.*?)\{/brands_loop\}'
    brands_match = re.search(brands_loop_pattern, result, re.DOTALL)
    
    if brands_match:
        brands_template = brands_match.group(1)
        brands_content = []
        
        for brand in employee_data.get('brands', []):
            brand_text = brands_template
            brand_text = brand_text.replace('{brand_name}', brand.get('name', ''))
            brand_text = brand_text.replace('{brand_plan}', format_number(brand.get('plan', 0)))
            brand_text = brand_text.replace('{brand_fact}', format_number(brand.get('fact', 0)))
            brand_text = brand_text.replace('{brand_percent}', str(int(brand.get('percent', 0))))
            brand_text = brand_text.replace('{brand_accrual}', format_number(brand.get('accrual', 0)))
            brand_text = brand_text.replace('{progress_bar}', generate_progress_bar(brand.get('percent', 0)))
            brands_content.append(brand_text)
        
        result = re.sub(brands_loop_pattern, '\n'.join(brands_content), result, flags=re.DOTALL)
    
    # Обрабатываем цикл по KPI
    kpi_loop_pattern = r'\{kpi_loop\}(.*?)\{/kpi_loop\}'
    kpi_match = re.search(kpi_loop_pattern, result, re.DOTALL)
    
    if kpi_match:
        kpi_template = kpi_match.group(1)
        kpi_content = []
        
        for kpi in employee_data.get('kpis', []):
            kpi_text = kpi_template
            kpi_text = kpi_text.replace('{kpi_name}', kpi.get('name', ''))
            kpi_text = kpi_text.replace('{kpi_plan}', format_number(kpi.get('plan', 0)))
            kpi_text = kpi_text.replace('{kpi_fact}', format_number(kpi.get('fact', 0)))
            kpi_text = kpi_text.replace('{kpi_percent}', str(int(kpi.get('percent', 0))))
            kpi_text = kpi_text.replace('{kpi_accrual}', format_number(kpi.get('accrual', 0)))
            kpi_text = kpi_text.replace('{progress_bar}', generate_progress_bar(kpi.get('percent', 0)))
            kpi_content.append(kpi_text)
        
        result = re.sub(kpi_loop_pattern, '\n'.join(kpi_content), result, flags=re.DOTALL)
    
    # Итоги
    result = result.replace('{total_plan}', format_number(employee_data.get('total_plan', 0)))
    result = result.replace('{total_fact}', format_number(employee_data.get('total_fact', 0)))
    result = result.replace('{total_percent}', str(int(employee_data.get('total_percent', 0))))
    result = result.replace('{total_accrual}', format_number(employee_data.get('total_accrual', 0)))
    result = result.replace('{total_salary}', format_number(employee_data.get('total_salary', 0)))
    result = result.replace('{order_count}', str(employee_data.get('order_count', 0)))
    result = result.replace('{reserved_orders}', format_number(employee_data.get('reserved_orders', 0)))
    
    # Прогноз
    days_worked = employee_data.get('days_worked', 0)
    working_days = employee_data.get('working_days', 1)
    total_fact = employee_data.get('total_fact', 0)
    total_plan = employee_data.get('total_plan', 0)
    
    # Рассчитываем прогноз
    forecast = calculate_forecast(total_fact, days_worked, working_days)
    forecast_percent = (forecast / total_plan * 100) if total_plan > 0 else 0
    
    # Рассчитываем оставшиеся дни и план на завтра
    today = datetime.now().day
    days_in_month = (datetime.now().replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    days_remaining = max(0, working_days - days_worked)
    plan_per_day = calculate_plan_per_day(total_plan, total_fact, days_remaining)
    
    result = result.replace('{forecast_result}', format_number(forecast))
    result = result.replace('{forecast_percent}', str(int(forecast_percent)))
    result = result.replace('{plan_per_day}', format_number(plan_per_day))
    result = result.replace('{days_remaining}', str(days_remaining))
    
    # Шкала выполнения для общего процента
    if '{progress_bar}' in result:
        result = result.replace('{progress_bar}', generate_progress_bar(employee_data.get('total_percent', 0)))
    
    return result


def prepare_employee_data_for_template(summary_data: Dict[str, Any], employee_id: int) -> Dict[str, Any]:
    """
    Подготавливает данные сотрудника для рендеринга шаблона
    
    Args:
        summary_data: Данные из сводной таблицы
        employee_id: ID сотрудника
        
    Returns:
        Словарь с данными для подстановки в шаблон
    """
    # Находим данные сотрудника в сводной таблице
    employee_summary = None
    for item in summary_data.get('data', []):
        if item['employee']['id'] == employee_id:
            employee_summary = item
            break
    
    if not employee_summary:
        return {}
    
    # Формируем данные для шаблона
    employee = employee_summary['employee']
    territory = employee_summary.get('territory', {})
    
    # Собираем данные по брендам
    brands = []
    for idx, brand_data in enumerate(employee_summary.get('brandData', [])):
        brand_info = summary_data.get('brands', [])[idx] if idx < len(summary_data.get('brands', [])) else {}
        brands.append({
            'name': brand_info.get('name', f'Бренд {idx+1}'),
            'plan': brand_data.get('plan', 0),
            'fact': brand_data.get('fact', 0),
            'percent': brand_data.get('percent', 0),
            'accrual': employee_summary.get('brandAccruals', [])[idx] if idx < len(employee_summary.get('brandAccruals', [])) else 0
        })
    
    # Собираем данные по KPI
    kpis = []
    for idx, kpi_data in enumerate(employee_summary.get('kpiData', [])):
        kpi_info = summary_data.get('kpiTypes', [])[idx] if idx < len(summary_data.get('kpiTypes', [])) else {}
        kpis.append({
            'name': kpi_info.get('name', f'KPI {idx+1}'),
            'plan': kpi_data.get('plan', 0),
            'fact': kpi_data.get('fact', 0),
            'percent': kpi_data.get('percent', 0),
            'accrual': employee_summary.get('kpiAccruals', [])[idx] if idx < len(employee_summary.get('kpiAccruals', [])) else 0
        })
    
    return {
        'employee_name': employee.get('full_name', ''),
        'territory': territory.get('name', ''),
        'fixed_salary': employee_summary.get('fixedSalary', 0),
        'travel_allowance': employee_summary.get('travelAllowance', 0),
        'bonus': employee_summary.get('bonus', 0),
        'days_worked': employee_summary.get('daysWorked', 0),
        'working_days': employee_summary.get('workingDays', 0),
        'brands': brands,
        'kpis': kpis,
        'total_plan': employee_summary.get('totalPlan', 0),
        'total_fact': employee_summary.get('totalFact', 0),
        'total_percent': employee_summary.get('totalPercent', 0),
        'total_accrual': employee_summary.get('totalAccrual', 0),
        'total_salary': employee_summary.get('fixedSalary', 0) + employee_summary.get('travelAllowance', 0) + employee_summary.get('bonus', 0) + employee_summary.get('totalAccrual', 0),
        'order_count': employee_summary.get('orderCount', 0),
        'reserved_orders': employee_summary.get('totalReserved', 0),
    }
