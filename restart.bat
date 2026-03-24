@echo off
echo Перезапуск системы...
echo.

echo Остановка процессов...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Удаление старой базы данных...
cd backend
del sales.db 2>nul

echo Инициализация новой базы данных...
python init_db.py

echo.
echo ========================================
echo База данных пересоздана!
echo ========================================
echo.
echo Теперь запустите:
echo 1. start_backend.bat
echo 2. start_frontend.bat
echo.
pause
