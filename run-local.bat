@echo off
setlocal

cd /d "%~dp0"

set PORT=5000
set TARGET_URL=http://localhost:%PORT%/parent.html

echo [INFO] Working directory: %CD%
echo [INFO] Starting local server on port %PORT%...

py --version >nul 2>&1
if %errorlevel%==0 (
  echo [INFO] Using launcher: py
  start "" "%TARGET_URL%"
  py -m http.server %PORT%
  goto :eof
)

python --version >nul 2>&1
if %errorlevel%==0 (
  echo [INFO] Using executable: python
  start "" "%TARGET_URL%"
  python -m http.server %PORT%
  goto :eof
)

echo [ERROR] Python was not found.
echo [ERROR] Install Python 3 and add it to PATH, then run this file again.
pause
