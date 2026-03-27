"""
Простой рендерер шаблонов для Telegram сообщений
"""
import re


def format_number(value):
    """Форматирует число с разделителями тысяч"""
    try:
        return f"{int(value):,}".replace(',', ' ')
    except (ValueError, TypeError):
        return str(value)


def render_progress_bar(percent, length=10):
    """Создает текстовую шкалу прогресса"""
    filled = int(percent / 10)
    filled = max(0, min(length, filled))
    empty = length - filled
    return '▰' * filled + '▱' * empty


def render_simple_template(template_text: str, data: dict) -> str:
    """
    Рендерит шаблон с подстановкой переменных
    
    Поддерживаемые переменные:
    - {employee_name} - имя сотрудника
    - {territory} - территория
    - {fixed_salary} - фиксированная часть
    - {travel_allowance} - дорожные
    - {bonus} - бонус
    - {days_worked} - отработано дней
    - {working_days} - рабочих дней в месяце
    - {total_plan} - общий план
    - {total_fact} - общий факт
    - {total_percent} - процент выполнения
    - {total_accrual} - начисление по мотивации
    - {total_salary} - итоговая зарплата
    - {order_count} - количество заявок
    - {reserved_orders} - резервные заказы
    - {forecast_result} - прогноз на конец месяца
    - {forecast_percent} - прогноз выполнения %
    - {plan_per_day} - план на завтра
    - {days_remaining} - осталось рабочих дней
    - {progress_bar} - шкала выполнения
    
    Циклы:
    - {brands_loop}...{/brands_loop} - цикл по брендам
      Внутри доступны: {brand_name}, {brand_plan}, {brand_fact}, {brand_percent}, {brand_accrual}
    - {kpi_loop}...{/kpi_loop} - цикл по KPI
      Внутри доступны: {kpi_name}, {kpi_plan}, {kpi_fact}, {kpi_percent}, {kpi_accrual}
    
    Args:
        template_text: Текст шаблона с переменными
        data: Словарь с данными для подстановки
        
    Returns:
        Отрендеренный текст сообщения
    """
    result = template_text
    
    # Обрабатываем цикл по брендам
    brands_loop_pattern = r'\{brands_loop\}(.*?)\{/brands_loop\}'
    brands_match = re.search(brands_loop_pattern, result, re.DOTALL)
    if brands_match:
        loop_template = brands_match.group(1)
        brands_output = []
        
        for brand in data.get('brands', []):
            brand_text = loop_template
            brand_text = brand_text.replace('{brand_name}', str(brand.get('name', '')))
            brand_text = brand_text.replace('{brand_plan}', format_number(brand.get('plan', 0)))
            brand_text = brand_text.replace('{brand_fact}', format_number(brand.get('fact', 0)))
            brand_text = brand_text.replace('{brand_percent}', f"{brand.get('percent', 0):.0f}")
            brand_text = brand_text.replace('{brand_accrual}', format_number(brand.get('accrual', 0)))
            brand_text = brand_text.replace('{brand_progress_bar}', render_progress_bar(brand.get('percent', 0)))
            brands_output.append(brand_text)
        
        result = re.sub(brands_loop_pattern, ''.join(brands_output), result, flags=re.DOTALL)
    
    # Обрабатываем цикл по KPI
    kpi_loop_pattern = r'\{kpi_loop\}(.*?)\{/kpi_loop\}'
    kpi_match = re.search(kpi_loop_pattern, result, re.DOTALL)
    if kpi_match:
        loop_template = kpi_match.group(1)
        kpi_output = []
        
        for kpi in data.get('kpis', []):
            kpi_text = loop_template
            kpi_text = kpi_text.replace('{kpi_name}', str(kpi.get('name', '')))
            kpi_text = kpi_text.replace('{kpi_plan}', format_number(kpi.get('plan', 0)))
            kpi_text = kpi_text.replace('{kpi_fact}', format_number(kpi.get('fact', 0)))
            kpi_text = kpi_text.replace('{kpi_percent}', f"{kpi.get('percent', 0):.0f}")
            kpi_text = kpi_text.replace('{kpi_accrual}', format_number(kpi.get('accrual', 0)))
            kpi_text = kpi_text.replace('{kpi_progress_bar}', render_progress_bar(kpi.get('percent', 0)))
            kpi_output.append(kpi_text)
        
        result = re.sub(kpi_loop_pattern, ''.join(kpi_output), result, flags=re.DOTALL)
    
    # Простые текстовые переменные
    result = result.replace('{employee_name}', str(data.get('employee_name', '')))
    result = result.replace('{territory}', str(data.get('territory', '')))
    
    # Числовые переменные с форматированием
    result = result.replace('{fixed_salary}', format_number(data.get('fixed_salary', 0)))
    result = result.replace('{travel_allowance}', format_number(data.get('travel_allowance', 0)))
    result = result.replace('{bonus}', format_number(data.get('bonus', 0)))
    result = result.replace('{days_worked}', str(data.get('days_worked', 0)))
    result = result.replace('{working_days}', str(data.get('working_days', 0)))
    result = result.replace('{total_plan}', format_number(data.get('total_plan', 0)))
    result = result.replace('{total_fact}', format_number(data.get('total_fact', 0)))
    result = result.replace('{total_percent}', f"{data.get('total_percent', 0):.0f}")
    result = result.replace('{total_accrual}', format_number(data.get('total_accrual', 0)))
    result = result.replace('{total_salary}', format_number(data.get('total_salary', 0)))
    result = result.replace('{order_count}', str(data.get('order_count', 0)))
    result = result.replace('{reserved_orders}', format_number(data.get('reserved_orders', 0)))
    result = result.replace('{forecast_result}', format_number(data.get('forecast_result', 0)))
    result = result.replace('{forecast_percent}', f"{data.get('forecast_percent', 0):.0f}")
    result = result.replace('{plan_per_day}', format_number(data.get('plan_per_day', 0)))
    result = result.replace('{days_remaining}', str(data.get('days_remaining', 0)))
    
    # Шкала прогресса
    progress_bar = render_progress_bar(data.get('total_percent', 0))
    result = result.replace('{progress_bar}', progress_bar)
    
    return result
