# Быстрое развертывание

## Для Windows (локальное тестирование Docker)

1. Установите [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)

2. Откройте PowerShell в папке проекта и выполните:
```powershell
.\deploy.bat
```

3. Откройте браузер: http://localhost

## Для Linux сервера (production)

### Быстрый старт (одной командой)

```bash
# Скачайте и запустите скрипт установки
curl -fsSL https://raw.githubusercontent.com/your-repo/Zarplata/main/deploy.sh | bash
```

### Или пошагово:

1. **Подключитесь к серверу:**
```bash
ssh user@your-server-ip
```

2. **Установите Docker (если не установлен):**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

3. **Загрузите проект:**
```bash
# Через Git
git clone https://github.com/your-repo/Zarplata.git
cd Zarplata

# Или загрузите архив
wget https://your-server.com/zarplata.zip
unzip zarplata.zip
cd Zarplata
```

4. **Настройте окружение:**
```bash
# Создайте .env файл
cp .env.example backend/.env
nano backend/.env
```

**Обязательно измените:**
- `SECRET_KEY` - сгенерируйте новый ключ
- `CORS_ORIGINS` - укажите ваш домен (например: `https://yourdomain.com`)

Генерация SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

5. **Запустите приложение:**
```bash
chmod +x deploy.sh
./deploy.sh
```

6. **Настройте домен (опционально):**

В DNS провайдере создайте A-запись:
- Имя: `@` или `yourdomain.com`
- Тип: `A`
- Значение: IP вашего сервера

7. **Настройте SSL (для HTTPS):**
```bash
# Установите certbot
sudo apt install certbot -y

# Получите сертификат
sudo certbot certonly --standalone -d yourdomain.com

# Скопируйте сертификаты
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*.pem

# Раскомментируйте HTTPS секцию в nginx.conf
nano nginx.conf

# Перезапустите
docker-compose restart frontend
```

## Проверка работы

```bash
# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Проверка доступности
curl http://localhost
curl http://localhost:8000/api/employees
```

## Создание первого администратора

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

## Обновление приложения

```bash
git pull
docker-compose down
docker-compose up -d --build
```

## Резервное копирование

```bash
# Создание бэкапа
cp data/zarplata.db data/zarplata_backup_$(date +%Y%m%d_%H%M%S).db

# Восстановление
docker-compose down
cp data/zarplata_backup_YYYYMMDD_HHMMSS.db data/zarplata.db
docker-compose up -d
```

## Остановка приложения

```bash
docker-compose down
```

## Полная документация

Смотрите `DEPLOYMENT.md` для подробной информации.

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте ресурсы: `docker stats`
