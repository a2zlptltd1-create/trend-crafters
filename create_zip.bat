@echo off
echo Creating Trend_Crafters_Project.zip...
powershell -Command "Get-ChildItem -Exclude '.git', 'Trend_Crafters_Project.zip', 'create_zip.bat' | Compress-Archive -DestinationPath 'Trend_Crafters_Project.zip' -Force"
echo.
if exist Trend_Crafters_Project.zip (
    echo Success! Trend_Crafters_Project.zip has been created.
) else (
    echo Error: Could not create zip file.
)
pause
