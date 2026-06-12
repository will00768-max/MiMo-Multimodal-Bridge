# MiMo-Multimodal-Bridge PowerShell 安装脚本
# 用法: irm https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.ps1 | iex

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MiMo-Multimodal-Bridge 安装" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 选择平台
Write-Host "请选择安装平台:" -ForegroundColor Yellow
Write-Host "  [1] MiMo Code (默认)" -ForegroundColor White
Write-Host "  [2] OpenCode" -ForegroundColor White
Write-Host ""
$choice = Read-Host "请输入选项 (1/2，默认 1)"

switch ($choice) {
    "2" {
        $platform = "opencode"
        $configFileName = "opencode.json"
    }
    default {
        $platform = "mimocode"
        $configFileName = "mimocode.json"
    }
}

# 配置目录
$configDir = "$env:APPDATA\$platform"
$pluginDir = "$configDir\plugins\mimo-multimodal-bridge"

Write-Host ""
Write-Host "目标平台: $platform" -ForegroundColor Green
Write-Host "配置目录: $configDir" -ForegroundColor Yellow
Write-Host "插件目录: $pluginDir" -ForegroundColor Yellow
Write-Host ""

# 创建插件目录
Write-Host "创建插件目录..." -ForegroundColor Green
if (!(Test-Path $pluginDir)) {
    New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
}

# 下载插件文件
Write-Host "下载插件文件..." -ForegroundColor Green
$baseUrl = "https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main"

try {
    Invoke-WebRequest -Uri "$baseUrl/index.ts" -OutFile "$pluginDir\index.ts" -ErrorAction Stop
    Write-Host "  ✓ index.ts" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 下载 index.ts 失败: $_" -ForegroundColor Red
    exit 1
}

try {
    Invoke-WebRequest -Uri "$baseUrl/plugin.json" -OutFile "$pluginDir\plugin.json" -ErrorAction Stop
    Write-Host "  ✓ plugin.json" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 下载 plugin.json 失败: $_" -ForegroundColor Red
    exit 1
}

# 检查配置文件
$configFile = "$configDir\$configFileName"
if (!(Test-Path $configFile)) {
    Write-Host "创建配置文件..." -ForegroundColor Green
    $configDir2 = Split-Path $configFile -Parent
    if (!(Test-Path $configDir2)) {
        New-Item -ItemType Directory -Path $configDir2 -Force | Out-Null
    }
    @{
        plugin = @("$pluginDir\index.ts")
    } | ConvertTo-Json | Out-File $configFile -Encoding UTF8
    Write-Host "  ✓ 配置文件已创建: $configFile" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "配置文件已存在: $configFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请手动添加以下内容到 plugin 数组:" -ForegroundColor Cyan
    Write-Host "  `"$pluginDir\index.ts`"" -ForegroundColor White
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Cyan
    Write-Host '  {' -ForegroundColor White
    Write-Host '    "plugin": [' -ForegroundColor White
    Write-Host "      `"$($pluginDir -replace '\\', '\\')\index.ts`"" -ForegroundColor White
    Write-Host '    ]' -ForegroundColor White
    Write-Host '  }' -ForegroundColor White
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  安装完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请重启 $platform 以加载插件。" -ForegroundColor Yellow
Write-Host ""
Write-Host "使用方法:" -ForegroundColor Cyan
Write-Host "  1. 发送图片/音频/视频给不支持多模态的模型" -ForegroundColor White
Write-Host "  2. 模型会自动调用 understand_media 工具" -ForegroundColor White
Write-Host "  3. 工具会调用 mimo-v2.5 来理解内容" -ForegroundColor White
Write-Host ""
Write-Host "更多信息请参考:" -ForegroundColor Cyan
Write-Host "  https://github.com/will00768-max/MiMo-Multimodal-Bridge" -ForegroundColor Blue
