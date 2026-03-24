"""
Telegram бот для отправки отчетов о продажах и зарплате
"""
import os
import requests
from datetime import datetime, date
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"


def format_number(num: float) -> str:
    """Форматирование числа с разделителями тысяч"""
    return f"{int(round(num)):,}".replace(",", " ")


def clamp_percent(value: float) -> float:
    """Ограничение процента от 0 до 1"""
    return max(0, min(1, value))


def get_progress_bar(percent: float) -> str:
    """Генерация прогресс-бара"""
    p = clamp_percent(percent)
    filled = round(p * 10)
    empty = 10 - filled
    return '▰' * filled + '▱' * empty


def get_performance_emoji(percent: float) -> str:
    """Эмодзи в зависимости от процента выполнения"""
    p = clamp_percent(percent)
    if p >= 1.0:
        return '🌟'
    elif p >= 0.8:
        return '✨'
    elif p >= 0.5:
        return '⭐'
    else:
        return '💫'


def format_brand_section(name: str, plan: float, fact: float, percent: float, salary: float = None) -> str:
    """Форматирование секции бренда"""
    p = clamp_percent(percent)
    result = f"""{name} {get_performance_emoji(p)}
🎯 План: {format_number(plan)}
💎 Факт: {format_number(fact)}
📊 Выполнение: {round(p * 100)}%
{get_progress_bar(p)}"""
    
    # Показываем начисление всегда (даже если 0)
    if salary is not None:
        result += f"\n💰 Начислено: {format_number(salary)} сум"
    
    result += "\n━━━━━━━━━━━━━━━━"
    return result


def calculate_forecast(fact: float, plan: float, work_days_passed: int, work_days_left: int) -> Dict:
    """Расчет прогноза выполнения плана"""
    if work_days_passed == 0:
        work_days_passed = 1
    
    daily_avg = fact / work_days_passed
    forecast = round(fact + daily_avg * work_days_left)
    forecast_percent = forecast / plan if plan > 0 else 0
    remain = max(plan - fact, 0)
    required_daily = round(remain / work_days_left) if work_days_left > 0 else remain
    
    return {
        'forecast': forecast,
        'forecast_percent': forecast_percent,
        'required_daily': required_daily
    }


def format_russian_date(date_obj: date) -> str:
    """Форматирование даты на русском"""
    months = {
        1: 'января', 2: 'февраля', 3: 'марта', 4: 'апреля',
        5: 'мая', 6: 'июня', 7: 'июля', 8: 'августа',
        9: 'сентября', 10: 'октября', 11: 'ноября', 12: 'декабря'
    }
    return f"{date_obj.day} {months[date_obj.month]}"


def generate_sales_report(
    employee_name: str,
    brands_data: List[Dict],
    kpi_data: List[Dict],
    total_plan: float,
    total_fact: float,
    total_percent: float,
    total_reserved: float = 0,
    work_days_passed: int = 0,
    work_days_left: int = 0,
    all_brands_accrual: float = 0,
    fixed_salary: float = 0,
    travel_allowance: float = 0,
    total_salary: float = 0,
    salary_earned: Optional[float] = None
) -> str:
    """
    Генерация отчета о продажах
    
    brands_data: [{'name': 'МИРФУДС', 'plan': 100000, 'fact': 80000, 'percent': 0.8, 'salary': 50000}, ...]
    kpi_data: [{'name': 'KPI - Каши', 'plan': 50000, 'fact': 40000, 'percent': 0.8, 'salary': 25000}, ...]
    """
    today = format_russian_date(date.today())
    
    # Формируем секции брендов
    brands_sections = '\n\n'.join([
        format_brand_section(b['name'], b['plan'], b['fact'], b['percent'], b.get('salary', 0))
        for b in brands_data
    ])
    
    # Формируем секции KPI
    kpi_sections = '\n\n'.join([
        format_brand_section(k['name'], k['plan'], k['fact'], k['percent'], k.get('salary', 0))
        for k in kpi_data
    ])
    
    # Расчет прогноза
    forecast = calculate_forecast(total_fact, total_plan, work_days_passed, work_days_left)
    
    # Формируем сообщение
    message = f"""👤 {employee_name}
📅 Отчет по расчету на {today}
━━━━━━━━━━━━━━━━━━━━━━

💼 Фикса: {format_number(fixed_salary)} сум
🚗 Дорожные: {format_number(travel_allowance)} сум

{brands_sections}

{kpi_sections}

━━━━━━━━━━━━━━━━━━━━━━

📊 ОБЩИЙ ИТОГ:
🎯 План: {format_number(total_plan)}
💎 Факт: {format_number(total_fact)}
📈 Выполнение: {round(total_percent * 100)}%
💰 Начислено: {format_number(all_brands_accrual)} сум
{get_progress_bar(total_percent)}

💰 ИТОГО НАЧИСЛЕНО: {format_number(total_salary)} сум

━━━━━━━━━━━━━━━━━━━━━━

🔮 ПРОГНОЗ:
📈 Ожидаемый результат: {format_number(forecast['forecast'])}
🎯 Прогноз выполнения: {round(forecast['forecast_percent'] * 100)}%
{get_progress_bar(forecast['forecast_percent'])}

━━━━━━━━━━━━━━━━━━━━━━

💡 РЕКОМЕНДАЦИИ:
⚡️ План на завтра: {format_number(forecast['required_daily'])}
⏰ Осталось рабочих дней: {work_days_left}

━━━━━━━━━━━━━━━━━━━━━━

📦 ЗАКАЗЫ НЕ ОТГРУЖЕНЫ:
💼 В резерве: {format_number(total_reserved)} сум"""

    # Добавляем информацию о зарплате, если есть
    if salary_earned is not None:
        message += f"""

━━━━━━━━━━━━━━━━━━━━━━

💰 ЗАРАБОТАНО НА СЕГОДНЯ:
┏━━━━━━━━━━━━━━━━━━━━┓
┃  {format_number(salary_earned)} сум  ┃
┗━━━━━━━━━━━━━━━━━━━━┛"""

    
    return message


def send_telegram_message(chat_id: str, message: str, bot_token: str = None) -> bool:
    """Отправка сообщения в Telegram
    
    Args:
        chat_id: ID чата/пользователя
        message: Текст сообщения
        bot_token: Токен бота (если не указан, используется токен по умолчанию)
    """
    # Используем переданный токен или токен по умолчанию
    token = bot_token or TELEGRAM_BOT_TOKEN
    api_url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    # Преобразуем chat_id в int для надежности
    try:
        chat_id_int = int(str(chat_id).strip())
    except:
        print(f"❌ Неверный формат chat_id: {chat_id}")
        return False
    
    # Убираем Markdown символы для надежности
    message_clean = message.replace('*', '').replace('_', '').replace('`', '')
    
    # Отправляем БЕЗ Markdown (надежнее) и с chat_id как число
    payload = {
        'chat_id': chat_id_int,  # Отправляем как число, не строку!
        'text': message_clean,
        'disable_web_page_preview': True
    }
    
    try:
        print(f"🔄 Попытка отправки пользователю {chat_id_int} (тип: {type(chat_id_int).__name__})...")
        print(f"📝 Длина сообщения: {len(message_clean)} символов")
        print(f"🤖 Используется бот: {token[:20]}...")
        response = requests.post(api_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ Сообщение отправлено пользователю {chat_id_int}")
            return True
        else:
            print(f"❌ Ошибка отправки пользователю {chat_id_int}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Исключение при отправке пользователю {chat_id_int}: {str(e)}")
        return False


def send_sales_report_to_employee(
    telegram_id: str,
    employee_name: str,
    brands_data: List[Dict],
    kpi_data: List[Dict],
    total_plan: float,
    total_fact: float,
    total_percent: float,
    total_reserved: float = 0,
    work_days_passed: int = 0,
    work_days_left: int = 0,
    all_brands_accrual: float = 0,
    fixed_salary: float = 0,
    travel_allowance: float = 0,
    total_salary: float = 0,
    salary_earned: Optional[float] = None,
    bot_token: str = None
) -> bool:
    """Отправка отчета о продажах сотруднику
    
    Args:
        bot_token: Токен Telegram бота компании (если не указан, используется токен по умолчанию)
    """
    message = generate_sales_report(
        employee_name=employee_name,
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
        salary_earned=salary_earned
    )
    
    return send_telegram_message(telegram_id, message, bot_token=bot_token)
