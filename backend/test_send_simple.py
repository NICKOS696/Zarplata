"""
Простейшая отправка сообщения
"""
import requests
import json

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"
CHAT_ID = 89761488

url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

# Минимальное сообщение
payload = {
    'chat_id': CHAT_ID,
    'text': 'Тест 123'
}

print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
print(f"\nОтправка...")

response = requests.post(url, json=payload, timeout=10)

print(f"Статус: {response.status_code}")
print(f"Ответ: {response.text[:500]}")

if response.status_code == 200:
    print("\n✅ УСПЕХ! Сообщение отправлено!")
else:
    print(f"\n❌ ОШИБКА!")
