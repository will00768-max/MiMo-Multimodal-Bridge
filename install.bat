@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

call :banner "MiMo-Multimodal-Bridge 安装"

set "CONFIG_DIR=%APPDATA%\mimocode"
set "PLUGIN_DIR=%CONFIG_DIR%\plugins\mimo-multimodal-bridge"
set "SOURCE_DIR=%~dp0"

echo 配置目录: %CONFIG_DIR%
echo 插件目录: %PLUGIN_DIR%
echo.

REM 创建插件目录
echo 创建插件目录...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"

REM 复制插件文件
echo 复制插件文件...
for %%F in (index.ts plugin.json) do copy /Y "%SOURCE_DIR%%%F" "%PLUGIN_DIR%\" >nul

REM 检查配置文件
set "CONFIG_FILE=%CONFIG_DIR%\mimocode.json"
if not exist "%CONFIG_FILE%" (
    echo 创建配置文件...
    (
        echo {
        echo   "plugin": [
        echo     "%PLUGIN_DIR:\=\\%\\index.ts"
        echo   ]
        echo }
    ) > "%CONFIG_FILE%"
    echo 配置文件已创建: %CONFIG_FILE%
) else (
    echo.
    echo 配置文件已存在: %CONFIG_FILE%
    echo.
    echo 请手动添加以下内容到 plugin 数组:
    echo   "%PLUGIN_DIR%\index.ts"
    echo.
    echo 示例:
    echo   {
    echo     "plugin": [
    echo       "%PLUGIN_DIR:\=\\%\\index.ts"
    echo     ]
    echo   }
)

echo.
call :banner "安装完成！"
echo 请重启 MiMo Code 以加载插件。
echo.
echo 使用方法:
echo   1. 发送图片/音频/视频给不支持多模态的模型
echo   2. 模型会自动调用 understand_media 工具
echo   3. 工具会调用 mimo-v2.5 来理解内容
echo.
echo 更多信息请参考:
echo   - README.md
echo   - INSTALL-GLOBAL.md
echo   - QUICKSTART.md
echo.
pause
exit /b 0

REM 输出带分隔线的标题
REM 参数: %~1 = 标题文本
:banner
echo ==========================================
echo   %~1
echo ==========================================
echo.
exit /b 0
