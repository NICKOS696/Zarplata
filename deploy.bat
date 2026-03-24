@echo off
chcp 65001 >nul
echo 🚀 Начинаем развертывание приложения...
echo.

REM Проверка наличия Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker не установлен. Установите Docker Desktop и повторите попытку.
    pause
    exit /b 1
)

REM Проверка наличия Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose не установлен. Установите Docker Desktop и повторите попытку.
    pause
    exit /b 1
)

REM Проверка наличия .env файла
if not exist "backend\.env" (
    echo ⚠️  Файл backend\.env не найден. Создаем из примера...
    copy .env.example backend\.env
    echo ✅ Создан backend\.env. ВАЖНО: Отредактируйте его перед запуском!
    echo    Особенно измените SECRET_KEY и CORS_ORIGINS
    pause
)

REM Создание необходимых директорий
echo 📁 Создаем необходимые директории...
if not exist "data" mkdir data
if not exist "ssl" mkdir ssl

REM Остановка существующих контейнеров
echo 🛑 Остановка существующих контейнеров...
docker-compose down

REM Сборка и запуск контейнеров
echo 🔨 Сборка Docker образов...
docker-compose build

echo ▶️  Запуск контейнеров...
docker-compose up -d

REM Ожидание запуска
echo ⏳ Ожидание запуска сервисов...
timeout /t 10 /nobreak >nul

REM Проверка статуса
echo 📊 Статус контейнеров:
docker-compose ps

echo.
echo ✨ Развертывание завершено!
echo.
echo 📌 Полезные команды:
echo    Просмотр логов:     docker-compose logs -f
echo    Перезапуск:         docker-compose restart
echo    Остановка:          docker-compose down
echo    Статус:             docker-compose ps
echo.
echo 🌐 Приложение доступно по адресу: http://localhost
echo 🔧 API доступен по адресу: http://localhost:8000/api
echo.
pause
