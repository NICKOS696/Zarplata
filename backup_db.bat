@echo off
chcp 65001 > nul
echo ========================================
echo Резервное копирование базы данных
echo ========================================

set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if exist backend\sales.db (
    copy backend\sales.db backend\backups\sales_%TIMESTAMP%.db
    echo ✅ Резервная копия создана: sales_%TIMESTAMP%.db
) else (
    echo ❌ База данных не найдена!
)

pause
