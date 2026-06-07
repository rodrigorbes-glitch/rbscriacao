@echo off
title Servidor da Loja
echo ====================================================
echo        INICIANDO O SISTEMA DA LOJA
echo ====================================================
echo.
echo Iniciando o servidor... (Mantenha esta janela aberta!)
echo.

:: Agenda a abertura do navegador apos 6 segundos
start cmd /c "timeout /t 6 /nobreak > NUL && start http://localhost:3000 && start http://localhost:3000/admin"

:: Roda o servidor travando esta janela
npm run dev
