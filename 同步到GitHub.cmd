@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo      电影阅历测试网站 - GitHub同步
echo ========================================
echo.

git status --short

echo.
set /p "message=请输入本次更新说明（直接回车使用默认说明）: "

if not defined message set "message=Update movie test website"

git add .

git diff --cached --quiet
if not errorlevel 1 goto no_changes

git commit -m "%message%"
if errorlevel 1 goto failed

git push origin main
if errorlevel 1 goto failed

echo.
echo 上传成功！GitHub仓库已经更新。
echo.
pause
exit /b 0

:no_changes
echo.
echo 没有发现需要上传的代码修改。
echo.
pause
exit /b 0

:failed
echo.
echo 上传失败，请检查上方错误信息和网络连接。
echo.
pause
exit /b 1