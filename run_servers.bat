@echo off
TITLE WorkforceHub - Server Launcher
echo ========================================================
echo   Starting Workforce & Project Management System
echo ========================================================
echo.

echo [1/2] Launching Django Backend at http://127.0.0.1:8000 ...
start "WorkforceHub Backend (Django)" cmd /k "cd backend && python manage.py runserver 127.0.0.1:8000"

timeout /t 2 /nobreak >nul

echo [2/2] Launching React Frontend at http://localhost:5173 ...
start "WorkforceHub Frontend (Vite/React)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   Both servers are starting in separate windows!
echo   Frontend Web Portal : http://localhost:5173
echo   Backend REST API    : http://127.0.0.1:8000/api/
echo   Django Admin Panel  : http://127.0.0.1:8000/admin/
echo ========================================================
pause

