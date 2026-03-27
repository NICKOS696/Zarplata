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
    
    Args:
        template_text: Текст шаблона с переменными
        data: Словарь с данными для подстановки
        
    Returns:
        Отрендеренный текст сообщения
    """
    result = template_text
    
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
