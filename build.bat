@echo off
chcp 65001 >nul
echo === TripleCut: сборка установщика для Windows x64 ===
where node >nul 2>nul || (echo Установите Node.js LTS с https://nodejs.org и запустите снова & pause & exit /b 1)
call npm install || goto :err
call npm install --save-dev electron electron-builder || goto :err
call npm run dist || goto :err
echo.
echo Готово! Установщик лежит в папке release\
explorer release
pause
exit /b 0
:err
echo Ошибка сборки. Скопируйте текст выше и отправьте мне.
pause
exit /b 1
