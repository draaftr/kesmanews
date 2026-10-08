@echo off
title MyAdkesmaPortal - Local Server
echo =======================================================
echo   Menjalankan Server MyAdkesmaPortal (Port 3000)...
echo   Membuka http://localhost:3000 di browser kamu...
echo.
echo   PENTING: Jangan tutup jendela ini saat membuka website!
echo   (Untuk mematikan server, cukup tutup jendela ini)
echo =======================================================

start "" "http://localhost:3000"
npx --yes serve -l 3000
pause

