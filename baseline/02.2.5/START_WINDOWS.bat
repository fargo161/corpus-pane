@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 serve.py
  pause
  exit /b
)
where python >nul 2>nul
if not errorlevel 1 (
  python serve.py
  pause
  exit /b
)
echo Python 3 was not found. Open index.html directly in Chrome or Edge instead.
echo If your browser restricts local pages, install Python 3 to use this local launcher.
pause
