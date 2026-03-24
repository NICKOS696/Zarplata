# Инструкция по развертыванию на сервере

## Требования к серверу

- Ubuntu 20.04 или новее (или другой Linux дистрибутив)
- Docker и Docker Compose установлены
- Минимум 2GB RAM
- Минимум 10GB свободного места на диске
- Открытые порты: 80 (HTTP), 443 (HTTPS)

## Шаг 1: Подготовка сервера

### Установка Docker

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавляем пользователя в группу docker
sudo usermod -aG docker $USER

# Устанавливаем Docker Compose
sudo apt install docker-compose -y

# Перезагружаемся для применения изменений
sudo reboot
```

## Шаг 2: Загрузка проекта на сервер

### Вариант А: Через Git (рекомендуется)

```bash
# Клонируем репозиторий
git clone <your-repository-url>
cd Zarplata
```

### Вариант Б: Через SCP/SFTP

```bash
# На локальной машине (Windows PowerShell)
scp -r "C:\Users\Николай Филиппов\CascadeProjects\Zarplata" user@your-server-ip:/home/user/
```

## Шаг 3: Настройка переменных окружения

```bash
# Создаем .env файл для backend
cd backend
cp ../.env.example .env

# Редактируем .env файл
nano .env
```

**Важно изменить в .env:**
- `SECRET_KEY` - сгенерируйте новый секретный ключ
- `CORS_ORIGINS` - укажите ваш домен
- `ENVIRONMENT=production`

Для генерации SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Шаг 4: Настройка frontend

Обновите файл `frontend/src/config.js`:

```javascript
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://yourdomain.com/api'  // Замените на ваш домен
  : 'http://localhost:8000/api';
```

## Шаг 5: Создание директорий

```bash
# Создаем директорию для базы данных
mkdir -p data

# Создаем директорию для SSL сертификатов
mkdir -p ssl
```

## Шаг 6: Запуск приложения

```bash
# Возвращаемся в корневую директорию проекта
cd /home/user/Zarplata

# Собираем и запускаем контейнеры
docker-compose up -d --build
```

Проверка статуса:
```bash
docker-compose ps
docker-compose logs -f
```

## Шаг 7: Настройка SSL сертификата (HTTPS)

### Вариант А: Let's Encrypt (бесплатно, рекомендуется)

```bash
# Устанавливаем certbot
sudo apt install certbot -y

# Получаем сертификат
sudo certbot certonly --standalone -d yourdomain.com

# Копируем сертификаты
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*.pem
```

### Вариант Б: Самоподписанный сертификат (для тестирования)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/privkey.pem \
  -out ./ssl/fullchain.pem \
  -subj "/CN=yourdomain.com"
```

### Активация HTTPS

Отредактируйте `nginx.conf` и раскомментируйте секцию HTTPS:

```bash
nano nginx.conf
```

Перезапустите контейнеры:
```bash
docker-compose restart frontend
```

## Шаг 8: Настройка автообновления SSL сертификата

Для Let's Encrypt добавьте в crontab:

```bash
sudo crontab -e
```

Добавьте строку:
```
0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /home/user/Zarplata/ssl/ && docker-compose restart frontend
```

## Шаг 9: Настройка firewall

```bash
# Разрешаем необходимые порты
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Шаг 10: Создание первого пользователя

После запуска приложения, создайте администратора через API:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "full_name": "Администратор",
    "role": "admin"
  }'
```

## Полезные команды

### Просмотр логов
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Перезапуск сервисов
```bash
docker-compose restart
docker-compose restart backend
docker-compose restart frontend
```

### Остановка сервисов
```bash
docker-compose down
```

### Обновление приложения
```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Резервное копирование базы данных
```bash
# Создание бэкапа
cp data/zarplata.db data/zarplata_backup_$(date +%Y%m%d_%H%M%S).db

# Или через скрипт
docker exec zarplata-backend sqlite3 /app/data/zarplata.db ".backup '/app/data/backup.db'"
```

### Восстановление из бэкапа
```bash
docker-compose down
cp data/zarplata_backup_YYYYMMDD_HHMMSS.db data/zarplata.db
docker-compose up -d
```

## Мониторинг

### Проверка использования ресурсов
```bash
docker stats
```

### Проверка доступности
```bash
curl http://localhost/
curl http://localhost:8000/api/employees
```

## Настройка домена

1. В панели управления вашего DNS провайдера создайте A-запись:
   - Имя: @ (или yourdomain.com)
   - Тип: A
   - Значение: IP-адрес вашего сервера

2. Дождитесь распространения DNS (может занять до 24 часов)

3. Проверьте:
   ```bash
   nslookup yourdomain.com
   ```

## Troubleshooting

### Проблема: Контейнеры не запускаются
```bash
docker-compose logs
docker-compose down
docker-compose up -d --build
```

### Проблема: База данных не создается
```bash
docker exec -it zarplata-backend ls -la /app/data
docker exec -it zarplata-backend python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### Проблема: CORS ошибки
Проверьте `backend/.env` и убедитесь, что `CORS_ORIGINS` содержит ваш домен.

### Проблема: 502 Bad Gateway
```bash
docker-compose logs backend
# Проверьте, что backend запущен и доступен
docker exec -it zarplata-backend curl http://localhost:8000/api/employees
```

## Безопасность

1. **Измените все пароли по умолчанию**
2. **Используйте сильный SECRET_KEY**
3. **Настройте регулярные бэкапы**
4. **Используйте HTTPS в production**
5. **Ограничьте доступ к серверу через firewall**
6. **Регулярно обновляйте систему и Docker образы**

## Производительность

Для увеличения производительности можно:

1. Использовать PostgreSQL вместо SQLite для больших объемов данных
2. Настроить кэширование через Redis
3. Увеличить ресурсы сервера
4. Настроить CDN для статических файлов

## Контакты и поддержка

При возникновении проблем проверьте:
- Логи: `docker-compose logs`
- Статус контейнеров: `docker-compose ps`
- Использование ресурсов: `docker stats`
