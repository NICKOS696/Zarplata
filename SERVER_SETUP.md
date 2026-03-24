# Настройка сервера - Пошаговая инструкция

## Данные вашего сервера

- **IPv4:** 5.42.123.202
- **IPv6:** 2a03:6f00:a::2:3be0
- **SSH:** `ssh root@5.42.123.202`
- **Пароль:** jAoQ7kmcd+-R.Y/
- **Закрытые порты:** 25, 53413, 2525, 587, 465, 3389, 389

## Шаг 1: Подключение к серверу

Откройте PowerShell и подключитесь:

```powershell
ssh root@5.42.123.202
```

Введите пароль: `jAoQ7kmcd+-R.Y/`

## Шаг 2: Установка необходимого ПО

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh

# Устанавливаем Docker Compose
apt install docker-compose -y

# Устанавливаем Git
apt install git -y

# Проверяем установку
docker --version
docker-compose --version
git --version
```

## Шаг 3: Загрузка проекта на сервер

### Вариант А: Через Git (если создали репозиторий)

```bash
cd /root
git clone https://github.com/your-username/Zarplata.git
cd Zarplata
```

### Вариант Б: Прямая загрузка с вашего компьютера

**На вашем компьютере (PowerShell):**

```powershell
# Переходим в папку проекта
cd "C:\Users\Николай Филиппов\CascadeProjects"

# Создаем архив (если есть 7-Zip)
7z a Zarplata.zip Zarplata\

# Или используем tar (если установлен)
tar -czf Zarplata.tar.gz Zarplata\

# Загружаем на сервер
scp Zarplata.tar.gz root@5.42.123.202:/root/
```

**На сервере:**

```bash
cd /root
tar -xzf Zarplata.tar.gz
cd Zarplata
```

## Шаг 4: Настройка переменных окружения

```bash
# Создаем .env файл
cp .env.example backend/.env

# Редактируем .env
nano backend/.env
```

**Измените следующие параметры:**

```env
# Генерируем новый SECRET_KEY
SECRET_KEY=ваш-новый-секретный-ключ

# Указываем ваш IP адрес
CORS_ORIGINS=http://5.42.123.202,https://5.42.123.202

# Production режим
ENVIRONMENT=production
```

Для генерации SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Сохраните файл: `Ctrl+O`, `Enter`, `Ctrl+X`

## Шаг 5: Создание необходимых директорий

```bash
mkdir -p data
mkdir -p ssl
```

## Шаг 6: Запуск приложения

```bash
# Запускаем контейнеры
docker-compose up -d --build

# Проверяем статус
docker-compose ps

# Смотрим логи
docker-compose logs -f
```

Для выхода из логов нажмите `Ctrl+C`

## Шаг 7: Проверка работы

```bash
# Проверяем backend
curl http://localhost:8000/api/employees

# Проверяем frontend
curl http://localhost
```

## Шаг 8: Создание первого администратора

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ваш-надежный-пароль",
    "full_name": "Администратор",
    "role": "admin"
  }'
```

## Доступ к приложению

Откройте в браузере:
- **По IPv4:** http://5.42.123.202
- **По IPv6:** http://[2a03:6f00:a::2:3be0] (если у вас есть IPv6)
- **Локально на сервере:** http://localhost

## Обновление кода (после изменений)

### Если используете Git:

**На вашем компьютере:**
```powershell
cd "C:\Users\Николай Филиппов\CascadeProjects\Zarplata"
git add .
git commit -m "Описание изменений"
git push
```

**На сервере:**
```bash
cd /root/Zarplata
chmod +x update.sh
./update.sh
```

### Если загружаете файлы напрямую:

**На вашем компьютере:**
```powershell
# Загружаем измененный файл
scp "C:\Users\Николай Филиппов\CascadeProjects\Zarplata\backend\main.py" root@5.42.123.202:/root/Zarplata/backend/
```

**На сервере:**
```bash
cd /root/Zarplata
docker-compose restart backend
```

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f frontend

# Перезапуск сервисов
docker-compose restart

# Остановка
docker-compose down

# Полная пересборка
docker-compose down
docker-compose up -d --build

# Проверка использования ресурсов
docker stats

# Резервное копирование БД
cp data/zarplata.db data/backup_$(date +%Y%m%d_%H%M%S).db
```

## Настройка автозапуска

Чтобы приложение автоматически запускалось после перезагрузки сервера:

```bash
# Создаем systemd сервис
nano /etc/systemd/system/zarplata.service
```

Вставьте:
```ini
[Unit]
Description=Zarplata Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/Zarplata
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

Активируйте:
```bash
systemctl enable zarplata
systemctl start zarplata
```

## Troubleshooting

### Проблема: Не могу подключиться по IPv6

Убедитесь, что ваш провайдер поддерживает IPv6. Проверьте на https://test-ipv6.com/

### Проблема: Контейнеры не запускаются

```bash
docker-compose logs
docker system prune -a
docker-compose up -d --build
```

### Проблема: База данных не создается

```bash
docker exec -it zarplata-backend ls -la /app/data
docker exec -it zarplata-backend python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### Проблема: Недостаточно памяти

```bash
# Проверка памяти
free -h

# Создание swap файла
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Безопасность

1. **Смените пароль root:**
```bash
passwd
```

2. **Настройте firewall:**
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

3. **Регулярно обновляйте систему:**
```bash
apt update && apt upgrade -y
```

4. **Делайте резервные копии:**
```bash
# Добавьте в crontab
crontab -e

# Добавьте строку (бэкап каждый день в 3:00)
0 3 * * * cp /root/Zarplata/data/zarplata.db /root/Zarplata/data/backup_$(date +\%Y\%m\%d).db
```

## Контакты

При возникновении проблем проверьте:
- Логи: `docker-compose logs`
- Статус: `docker-compose ps`
- Ресурсы: `docker stats`
