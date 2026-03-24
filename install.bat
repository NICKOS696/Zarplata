@echo off
echo ========================================
echo Installing Zarplata System
echo ========================================

echo.
echo [1/4] Installing Backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Installing Frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Creating .env file...
cd ..\backend
if not exist .env (
    copy .env.example .env
    echo .env file created. Please edit it with your settings.
) else (
    echo .env file already exists.
)

echo.
echo [4/4] Initializing database...
python init_db.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend/.env file if needed
echo 2. Run start_backend.bat in one terminal
echo 3. Run start_frontend.bat in another terminal
echo 4. Open http://localhost:5173 in your browser
echo.
pause
