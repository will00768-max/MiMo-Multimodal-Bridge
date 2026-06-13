# MiMo-Multimodal-Bridge - 快速开始

## 30 秒安装

### 方式一：使用插件命令（推荐）

```bash
mimo plugin mimo-multimodal-bridge
```

### 方式二：手动安装（Linux/Mac）

```bash
# 1. 创建插件目录
mkdir -p ~/.config/mimocode/plugins/mimo-multimodal-bridge

# 2. 下载插件
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/index.ts -o ~/.config/mimocode/plugins/mimo-multimodal-bridge/index.ts
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/plugin.json -o ~/.config/mimocode/plugins/mimo-multimodal-bridge/plugin.json

# 3. 添加配置
cat >> ~/.config/mimocode/mimocode.json << 'EOF'
{
  "plugin": [
    "~/.config/mimocode/plugins/mimo-multimodal-bridge/index.ts"
  ]
}
EOF

# 4. 重启 MiMo Code
```

### 方式二：手动安装（Windows PowerShell）

```powershell
# 1. 创建插件目录
mkdir -p $env:APPDATA\mimocode\plugins\mimo-multimodal-bridge

# 2. 下载插件
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/index.ts" -OutFile "$env:APPDATA\mimocode\plugins\mimo-multimodal-bridge\index.ts"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/plugin.json" -OutFile "$env:APPDATA\mimocode\plugins\mimo-multimodal-bridge\plugin.json"

# 3. 添加配置
$configPath = "$env:APPDATA\mimocode\mimocode.json"
if (!(Test-Path $configPath)) {
    '{"plugin":["$env:APPDATA\\mimocode\\plugins\\mimo-multimodal-bridge\\index.ts"]}' | Out-File $configPath -Encoding UTF8
} else {
    Write-Host "请手动编辑配置文件添加 plugin 字段: $configPath"
}

# 4. 重启 MiMo Code
```

## 验证安装

启动 MiMo Code 后，发送一张图片给 `mimo-v2.5-pro` 模型。如果看到模型调用 `understand_media` 工具，说明安装成功！

## 使用示例

```
用户: [发送代码截图] 这段代码有什么问题？

模型: 我来查看这张图片...
[调用 understand_media 工具]

工具: 这是一段 Python 代码，内容如下：
def calculate(a, b)
    return a + b

代码缺少冒号...

模型: 根据图片内容，你的代码在函数定义行缺少冒号，应该是：
def calculate(a, b):
    return a + b
```

## 故障排除

1. **工具未显示**：检查配置文件格式是否正确
2. **调用失败**：确认可以访问 mimo-v2.5 模型
3. **其他问题**：查看 [完整文档](./README.md)
