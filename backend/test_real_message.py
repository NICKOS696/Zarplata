"""
Тест отправки реального сообщения с данными
"""
import sys
sys.path.append('.')

from telegram_bot import generate_sales_report, send_telegram_message

# Тестовые данные
brands_data = [
    {'name': 'МИРФУДС', 'plan': 100000, 'fact': 80000, 'percent': 0.8}
]

kpi_data = [
    {'name': 'KPI - Каши', 'plan': 50000, 'fact': 40000, 'percent': 0.8}
]

# Генерируем сообщение
message = generate_sales_report(
    employee_name="Тестовый Сотрудник",
    brands_data=brands_data,
    kpi_data=kpi_data,
    total_plan=150000,
    total_fact=120000,
    total_percent=0.8,
    work_days_passed=10,
    work_days_left=12,
    salary_earned=50000
)

print("=" * 60)
print("СГЕНЕРИРОВАННОЕ СООБЩЕНИЕ:")
print("=" * 60)
print(message)
print("=" * 60)

# Пробуем отправить
chat_id = "89761488"
print(f"\nОтправка сообщения на chat_id: {chat_id}")
result = send_telegram_message(chat_id, message)

if result:
    print("\n✅ Успешно!")
else:
    print("\n❌ Ошибка!")
