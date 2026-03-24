"""
Тестовый скрипт для проверки отправки в Telegram
"""
import requests

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

def test_send_message(chat_id: str):
    """Тестовая отправка простого сообщения"""
    
    # Простое сообщение без Markdown
    simple_message = "Тест: Привет! Это тестовое сообщение от бота."
    
    payload = {
        'chat_id': chat_id,
        'text': simple_message,
    }
    
    try:
        print(f"Отправка сообщения пользователю {chat_id}...")
        response = requests.post(TELEGRAM_API_URL, json=payload, timeout=10)
        
        print(f"Статус: {response.status_code}")
        print(f"Ответ: {response.text}")
        
        if response.status_code == 200:
            print("✅ Сообщение отправлено успешно!")
            return True
        else:
            print(f"❌ Ошибка: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Исключение: {str(e)}")
        return False


def test_markdown_message(chat_id: str):
    """Тестовая отправка сообщения с Markdown"""
    
    markdown_message = """*Тестовый отчет*
📅 10 декабря

*Бренд 1* ⭐
📊 План: 100 000
✅ Факт: 80 000
📈 Выполнение: 80%

Это тест Markdown форматирования."""
    
    payload = {
        'chat_id': chat_id,
        'text': markdown_message,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    
    try:
        print(f"\nОтправка Markdown сообщения пользователю {chat_id}...")
        response = requests.post(TELEGRAM_API_URL, json=payload, timeout=10)
        
        print(f"Статус: {response.status_code}")
        print(f"Ответ: {response.text}")
        
        if response.status_code == 200:
            print("✅ Markdown сообщение отправлено успешно!")
            return True
        else:
            print(f"❌ Ошибка: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Исключение: {str(e)}")
        return False


if __name__ == "__main__":
    # Введите ваш chat_id
    chat_id = input("Введите ваш Telegram chat_id: ").strip()
    
    if not chat_id:
        print("❌ Chat ID не указан!")
    else:
        # Тест 1: Простое сообщение
        test_send_message(chat_id)
        
        # Тест 2: Markdown сообщение
        test_markdown_message(chat_id)
