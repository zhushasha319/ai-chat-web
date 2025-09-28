@echo off
echo 正在启动千问聊天服务器...
echo.
echo 请确保已在 .env 文件中设置了 QWEN_API_KEY
echo.

REM 检查 .env 文件是否存在
if not exist .env (
    echo 错误: 未找到 .env 文件
    echo 请创建 .env 文件并设置 QWEN_API_KEY=your-api-key
    pause
    exit /b 1
)

REM 启动服务器
node server.js

pause