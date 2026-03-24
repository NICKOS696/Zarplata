"""
Проверка доступности чата
"""
import requests

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"
CHAT_ID = 89761488

# Пробуем получить информацию о чате
url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChat"
params = {'chat_id': CHAT_ID}

print(f"Проверка чата {CHAT_ID}...")
response = requests.get(url, params=params, timeout=10)

print(f"Статус: {response.status_code}")
print(f"Ответ: {response.json()}")

if response.status_code == 200:
    data = response.json()
    if data.get('ok'):
        chat_info = data.get('result', {})
        print(f"\n✅ Чат найден!")
        print(f"ID: {chat_info.get('id')}")
        print(f"Имя: {chat_info.get('first_name')}")
        print(f"Username: @{chat_info.get('username')}")
        print(f"Тип: {chat_info.get('type')}")
    else:
        print(f"\n❌ Ошибка: {data.get('description')}")
else:
    error = response.json()
    print(f"\n❌ Ошибка {error.get('error_code')}: {error.get('description')}")
    if error.get('error_code') == 400:
        print("\n⚠️ Чат не найден. Это означает, что:")
        print("   1. Пользователь НЕ нажал START в боте")
        print("   2. Или пользователь заблокировал бота")
        print("   3. Или chat_id неверный")
        print(f"\n📱 Откройте бота: https://t.me/profit_expert_ltd_bot")
        print("   И нажмите кнопку START!")
