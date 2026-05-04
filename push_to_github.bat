@echo off
echo Initializing Git...
git init
echo Setting Remote URL...
git remote add origin https://github.com/a2zlptltd1-create/trend-crafters.git 2>nul
git remote set-url origin https://github.com/a2zlptltd1-create/trend-crafters.git
echo Adding files...
git add .
echo Committing changes...
git commit -m "Final Professional Website Build"
echo Pushing to GitHub (Force)...
git branch -M main
git push -f origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Website pushed to GitHub successfully!
) else (
    echo [ERROR] Push failed. Please check if you are logged in to GitHub in this terminal.
)
pause
