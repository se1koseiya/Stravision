@echo off
chcp 65001 >nul
echo ========================================
echo PostgreSQL 数据库设置脚本 (Windows)
echo ========================================
echo.

REM 检查 PostgreSQL 是否安装
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 psql 命令
    echo.
    echo PostgreSQL 可能未安装或未添加到系统 PATH
    echo.
    echo 请执行以下步骤：
    echo 1. 确认 PostgreSQL 已安装
    echo 2. 找到 PostgreSQL 安装目录（通常在 C:\Program Files\PostgreSQL\16\bin）
    echo 3. 将该目录添加到系统 PATH 环境变量
    echo.
    echo 或者手动执行：
    echo "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE stravision;"
    echo.
    pause
    exit /b 1
)

echo [1/3] 检查 PostgreSQL 服务状态...
sc query postgresql-x64-16 | find "RUNNING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [警告] PostgreSQL 服务未运行
    echo 尝试启动服务...
    net start postgresql-x64-16
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 无法启动 PostgreSQL 服务
        echo 请手动启动服务或检查安装
        pause
        exit /b 1
    )
)
echo [✓] PostgreSQL 服务正在运行

echo.
echo [2/3] 创建数据库 'stravision'...
psql -U postgres -c "CREATE DATABASE stravision;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] 数据库创建成功
) else (
    echo [提示] 数据库可能已存在，继续...
)

echo.
echo [3/3] 验证数据库...
psql -U postgres -c "\l" | find "stravision" >nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] 数据库 'stravision' 已就绪
) else (
    echo [错误] 无法验证数据库
    pause
    exit /b 1
)

echo.
echo ========================================
echo [成功] PostgreSQL 设置完成！
echo ========================================
echo.
echo 下一步：
echo 1. 确保 .env.local 中配置了正确的 DATABASE_URL
echo 2. 运行: npm run dev
echo.
pause
