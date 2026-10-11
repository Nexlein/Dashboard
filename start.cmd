@echo off
cd /d "%~dp0"
docker compose version >nul 2>&1
if errorlevel 1 goto docker_missing
docker info >nul 2>&1
if errorlevel 1 goto docker_missing
docker compose up --build --wait --wait-timeout 180
if errorlevel 1 goto failed
echo Local inbox: http://localhost:8025
start http://localhost:8081
exit /b 0
:docker_missing
echo Install and start Docker Desktop with Compose v2.24+ first.
:failed
pause
exit /b 1
