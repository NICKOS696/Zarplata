"""
Тест отправки без Markdown
"""
import requests

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"
CHAT_ID = "89761488"

message = """Тестовый Сотрудник
Отчет на 10 декабря

МИРФУДС
План: 100 000
Факт: 80 000
Выполнение: 80%

ОБЩИЙ ИТОГ:
План: 150 000
Факт: 120 000
Общее выполнение: 80%

ЗАРАБОТАНО НА СЕГОДНЯ:
50 000 руб"""

url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

# БЕЗ Markdown
payload = {
    'chat_id': CHAT_ID,
    'text': message
}

print("Отправка БЕЗ Markdown...")
response = requests.post(url, json=payload, timeout=10)
print(f"Статус: {response.status_code}")
print(f"Ответ: {response.text[:200]}")

if response.status_code == 200:
    print("\n✅ Успешно!")
else:
    print("\n❌ Ошибка!")
