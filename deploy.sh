#!/bin/bash

# Скрипт для быстрого развертывания на сервере

echo "🚀 Начинаем развертывание приложения..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и повторите попытку."
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Файл backend/.env не найден. Создаем из примера..."
    cp .env.example backend/.env
    echo "✅ Создан backend/.env. ВАЖНО: Отредактируйте его перед запуском!"
    echo "   Особенно измените SECRET_KEY и CORS_ORIGINS"
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Создание необходимых директорий
echo "📁 Создаем необходимые директории..."
mkdir -p data
mkdir -p ssl

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Сборка и запуск контейнеров
echo "🔨 Сборка Docker образов..."
docker-compose build

echo "▶️  Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверка логов
echo ""
echo "📝 Последние логи backend:"
docker-compose logs --tail=20 backend

echo ""
echo "📝 Последние логи frontend:"
docker-compose logs --tail=20 frontend

# Проверка доступности
echo ""
echo "🔍 Проверка доступности..."
if curl -s http://localhost:8000/api/employees > /dev/null; then
    echo "✅ Backend доступен на http://localhost:8000"
else
    echo "⚠️  Backend недоступен. Проверьте логи: docker-compose logs backend"
fi

if curl -s http://localhost > /dev/null; then
    echo "✅ Frontend доступен на http://localhost"
else
    echo "⚠️  Frontend недоступен. Проверьте логи: docker-compose logs frontend"
fi

echo ""
echo "✨ Развертывание завершено!"
echo ""
echo "📌 Полезные команды:"
echo "   Просмотр логов:     docker-compose logs -f"
echo "   Перезапуск:         docker-compose restart"
echo "   Остановка:          docker-compose down"
echo "   Статус:             docker-compose ps"
echo ""
echo "🌐 Приложение доступно по адресу: http://localhost"
echo "🔧 API доступен по адресу: http://localhost:8000/api"
