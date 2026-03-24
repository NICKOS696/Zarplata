# 💼 Система учета продаж и расчета зарплаты

Современная веб-система для управления продажами, расчета мотивации и зарплаты торговой команды.

![Status](https://img.shields.io/badge/status-ready-green)
![Python](https://img.shields.io/badge/python-3.9+-blue)
![React](https://img.shields.io/badge/react-18.2-blue)
![FastAPI](https://img.shields.io/badge/fastapi-0.104-green)

## ✨ Возможности

- 📊 **План-факт анализ** по сотрудникам, супервайзерам, брендам и KPI
- 💰 **Автоматический расчет зарплаты** с учетом мотивационной программы
- 📅 **Учет табеля посещаемости** для расчета фиксированной части
- 📥 **Импорт данных из 1С** (HTML формат)
- 📈 **Интерактивные дашборды** с визуализацией данных
- 🔄 **Гибкая настройка** брендов, KPI и правил расчета
- 🎯 **Динамическое управление** - легко добавлять/удалять сотрудников, бренды, KPI
- 📱 **Современный UI** с адаптивным дизайном

## Технологический стек

### Backend
- **FastAPI** - современный Python веб-фреймворк
- **SQLAlchemy** - ORM для работы с БД
- **PostgreSQL/SQLite** - база данных
- **Pydantic** - валидация данных
- **python-telegram-bot** - интеграция с Telegram

### Frontend
- **React** - UI библиотека
- **TailwindCSS** - стилизация
- **shadcn/ui** - компоненты
- **Recharts** - графики и визуализация
- **Lucide React** - иконки

## 🚀 Быстрая установка

### Автоматическая установка (Windows)

Просто запустите:
```powershell
install.bat
```

Это автоматически:
- Установит все зависимости (Python и Node.js)
- Создаст файл конфигурации
- Инициализирует базу данных с тестовыми данными

### Ручная установка

#### 1. Установите зависимости

```powershell
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

#### 2. Настройте окружение

Создайте файл `backend/.env`:

```env
DATABASE_URL=sqlite:///./sales.db
TELEGRAM_BOT_TOKEN=your_bot_token_here
SECRET_KEY=your_secret_key_here
DEBUG=True
CORS_ORIGINS=http://localhost:5173
```

#### 3. Инициализируйте базу данных

```powershell
cd backend
python init_db.py
```

## ▶️ Запуск приложения

### Быстрый запуск (Windows)

**Терминал 1:**
```powershell
start_backend.bat
```

**Терминал 2:**
```powershell
start_frontend.bat
```

### Ручной запуск

**Backend:**
```powershell
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

Откройте браузер: **http://localhost:5173**

## Использование

1. Откройте браузер: `http://localhost:5173`
2. Добавьте сотрудников, бренды и KPI
3. Загрузите данные продаж из 1С
4. Загрузите табель посещаемости
5. Система автоматически рассчитает зарплату
6. Отправьте отчеты через Telegram

## Структура проекта

```
Zarplata/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── models.py            # Модели базы данных
│   ├── schemas.py           # Pydantic схемы
│   ├── database.py          # Настройка БД
│   ├── crud.py              # CRUD операции
│   ├── salary_calculator.py # Логика расчета зарплаты
│   ├── html_parser.py       # Парсер HTML из 1С
│   ├── telegram_bot.py      # Telegram бот
│   ├── reports.py           # Генерация отчетов
│   └── requirements.txt     # Python зависимости
├── frontend/
│   ├── src/
│   │   ├── components/      # React компоненты
│   │   ├── pages/           # Страницы приложения
│   │   ├── services/        # API сервисы
│   │   └── App.jsx          # Главный компонент
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Основные функции

### Управление данными
- Добавление/редактирование сотрудников
- Управление брендами и KPI
- Настройка планов продаж
- Загрузка табеля

### Расчеты
- Автоматический расчет выполнения плана
- Расчет мотивационной части зарплаты
- Учет посещаемости в фиксированной части
- История расчетов

### Отчеты
- Общий дашборд команды
- Индивидуальные отчеты сотрудников
- Отчеты по супервайзерам
- Анализ по брендам и KPI

### Telegram
- Автоматическая рассылка отчетов
- Команды: /stats, /plan, /salary
- Уведомления о достижениях

## Автор

Создано для оптимизации учета продаж и расчета зарплаты торговой команды.
