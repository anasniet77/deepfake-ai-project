@echo off
echo Starting Deepfake AI App...

:: Start Python AI server
start cmd /k "cd ai-api && python -m uvicorn main:app --reload --port 8000"

:: Start Node backend
start cmd /k "cd server && node index.js"

:: Start React frontend
start cmd /k "cd client && npm run dev"

echo All servers starting...
pause