@echo off
REM Start backend and frontend locally for BYOPGateCS.studio

cd /d "%~dp0backend"
start "Backend" cmd /k "call .venv\Scripts\activate && python -m uvicorn server:app --host 127.0.0.1 --port 8000"

cd /d "%~dp0frontend"
start "Frontend" cmd /k "yarn start"

echo Backend and frontend startup commands launched in new windows.
echo Visit http://localhost:3000 after the frontend finishes compiling.
echo Backend API is available at http://127.0.0.1:8000/api/.
pause
