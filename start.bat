@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Act Generator — запуск сайта
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [Ошибка] Node.js не найден.
  echo Установите с https://nodejs.org/ и перезапустите.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Устанавливаем зависимости...
  call npm install
  if errorlevel 1 (
    echo [Ошибка] npm install не удался.
    pause
    exit /b 1
  )
  echo.
)

REM Освобождаем порт 3000, если занят
powershell -NoProfile -Command ^
  "$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo Сайт откроется сам: http://localhost:3000
echo.
echo ВАЖНО: не кликайте мышкой по чёрному окну —
echo иначе Windows «заморозит» сервер.
echo Остановка: Ctrl+C
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM Запуск через PowerShell без QuickEdit (клик по окну не зависнет)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"

echo.
echo Сервер остановлен.
pause
