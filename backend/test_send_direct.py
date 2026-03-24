"""
Прямая отправка тестового сообщения
"""
import requests

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"
CHAT_ID = "89761488"

def send_test():
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    # Простое сообщение
    payload = {
        'chat_id': CHAT_ID,
        'text': 'Тест: Привет! Это тестовое сообщение от бота Profit Expert LTD.'
    }
    
    print(f"Отправка сообщения на chat_id: {CHAT_ID}")
    print(f"URL: {url}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"\nСтатус: {response.status_code}")
        print(f"Ответ: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Сообщение отправлено успешно!")
        else:
            print(f"\n❌ Ошибка отправки")
            
            # Дополнительная диагностика
            result = response.json()
            if result.get('error_code') == 403:
                print("\n⚠️ Ошибка 403: Бот заблокирован пользователем или пользователь не нажал START")
            elif result.get('error_code') == 400:
                print("\n⚠️ Ошибка 400: Неверный chat_id или формат сообщения")
            elif result.get('error_code') == 404:
                print("\n⚠️ Ошибка 404: Chat не найден. Убедитесь, что:")
                print("   1. Вы нажали START в боте @profit_expert_ltd_bot")
                print("   2. Chat ID указан правильно")
                
    except Exception as e:
        print(f"\n❌ Исключение: {str(e)}")

if __name__ == "__main__":
    send_test()
