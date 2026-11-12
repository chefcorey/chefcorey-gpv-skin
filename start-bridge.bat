@echo off
title Chef Corey Controller Bridge
cd /d "%~dp0"
where py >nul 2>nul && (py bridge\xinput_bridge.py) || (python bridge\xinput_bridge.py)
pause
