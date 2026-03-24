"""
Получение информации о боте
"""
import requests

TELEGRAM_BOT_TOKEN = "7626473361:AAH__tD1eCwsBK1bqlj5FxbiPRQbnaQ1Tbw"

def get_bot_info():
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Статус: {response.status_code}")
        print(f"Ответ: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                print(f"\n✅ Информация о боте:")
                print(f"ID: {bot_info.get('id')}")
                print(f"Имя: {bot_info.get('first_name')}")
                print(f"Username: @{bot_info.get('username')}")
                print(f"\n🔗 Ссылка на бота: https://t.me/{bot_info.get('username')}")
                return bot_info
        else:
            print("❌ Ошибка получения информации о боте")
            return None
    except Exception as e:
        print(f"❌ Исключение: {str(e)}")
        return None

if __name__ == "__main__":
    get_bot_info()
