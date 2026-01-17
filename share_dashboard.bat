@echo off
echo ===================================================
echo   Velicity Dashboard - Instant Share
echo ===================================================
echo.
echo 1. Ensure 'npm run dev' is running in another window.
echo 2. If this is your first time, it might ask for an Ngrok Token.
echo    (Get it for free at https://dashboard.ngrok.com/get-started/your-authtoken)
echo.
echo Starting Tunnel...
echo.
echo Trying system 'ngrok'...
call ngrok http 3000
if %errorlevel% neq 0 (
    echo System ngrok not found. Falling back to 'npx ngrok'...
    call npx ngrok http 3000
)
pause
