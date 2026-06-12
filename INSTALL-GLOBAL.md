# MiMo-Multimodal-Bridge - 全局安装指南

## 全局安装的用户

本插件同时支持 **MiMo Code** 和 **OpenCode**。

### 安装方式

```bash
# MiMo Code
curl -fsSL https://mimo.xiaomi.com/install | bash
npm install -g @mimo-ai/cli

# OpenCode
npm install -g @opencode/cli
```

## 配置目录位置

| 平台 | 操作系统 | 配置目录 |
|------|---------|---------|
| MiMo Code | Linux | `~/.config/mimocode` |
| MiMo Code | macOS | `~/Library/Application Support/mimocode` |
| MiMo Code | Windows | `%APPDATA%\mimocode` |
| OpenCode | Linux | `~/.config/opencode` |
| OpenCode | macOS | `~/Library/Application Support/opencode` |
| OpenCode | Windows | `%APPDATA%\opencode` |

如果设置了 `MIMOCODE_HOME` 或 `OPENCODE_HOME` 环境变量，配置目录为 `$XXX_HOME/config`。

## 安装步骤

### 方式一：使用安装脚本（推荐）

```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.sh | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.ps1 | iex
```

### 方式二：手动安装

#### 步骤 1：找到配置目录

```bash
# MiMo Code
# Linux
echo ~/.config/mimocode
# macOS
echo ~/Library/Application\ Support/mimocode
# Windows (PowerShell)
echo $env:APPDATA\mimocode

# OpenCode
# Linux
echo ~/.config/opencode
# macOS
echo ~/Library/Application\ Support/opencode
# Windows (PowerShell)
echo $env:APPDATA\opencode
```

#### 步骤 2：创建插件目录

```bash
# MiMo Code
# Linux/Mac
mkdir -p ~/.config/mimocode/plugins/mimo-multimodal-bridge
# Windows (PowerShell)
mkdir -p $env:APPDATA\mimocode\plugins\mimo-multimodal-bridge

# OpenCode
# Linux/Mac
mkdir -p ~/.config/opencode/plugins/mimo-multimodal-bridge
# Windows (PowerShell)
mkdir -p $env:APPDATA\opencode\plugins\mimo-multimodal-bridge
```

#### 步骤 3：复制插件文件

将以下文件复制到插件目录：
- `index.ts`
- `plugin.json`

```bash
# Linux/Mac（假设你在插件源码目录）
# MiMo Code
cp index.ts plugin.json ~/.config/mimocode/plugins/mimo-multimodal-bridge/
# OpenCode
cp index.ts plugin.json ~/.config/opencode/plugins/mimo-multimodal-bridge/

# Windows (PowerShell)
# MiMo Code
Copy-Item index.ts, plugin.json $env:APPDATA\mimocode\plugins\mimo-multimodal-bridge\
# OpenCode
Copy-Item index.ts, plugin.json $env:APPDATA\opencode\plugins\mimo-multimodal-bridge\
```

#### 步骤 4：编辑配置文件

打开或创建全局配置文件：

```bash
# MiMo Code
# Linux/Mac
nano ~/.config/mimocode/mimocode.json
# Windows
notepad %APPDATA%\mimocode\mimocode.json

# OpenCode
# Linux/Mac
nano ~/.config/opencode/opencode.json
# Windows
notepad %APPDATA%\opencode\opencode.json
```

添加 `plugin` 字段：

**MiMo Code**:
```json
{
  "plugin": [
    "~/.config/mimocode/plugins/mimo-multimodal-bridge/index.ts"
  ]
}
```

**OpenCode**:
```json
{
  "plugin": [
    "~/.config/opencode/plugins/mimo-multimodal-bridge/index.ts"
  ]
}
```

**Windows 用户**使用：

**MiMo Code**:
```json
{
  "plugin": [
    "%APPDATA%\\mimocode\\plugins\\mimo-multimodal-bridge\\index.ts"
  ]
}
```

**OpenCode**:
```json
{
  "plugin": [
    "%APPDATA%\\opencode\\plugins\\mimo-multimodal-bridge\\index.ts"
  ]
}
```

**注意**：
- 如果配置文件已有其他内容，只需在 `plugin` 数组中添加新条目
- 如果 `plugin` 字段不存在，创建它
- 使用正斜杠 `/` 或双反斜杠 `\\` 作为路径分隔符

#### 步骤 5：重启 MiMo Code / OpenCode

关闭并重新启动以加载插件。

## 验证安装

1. 启动 MiMo Code 或 OpenCode
2. 发送一张图片给不支持多模态的模型（如 mimo-v2.5-pro）
3. 如果看到模型调用 `understand_media` 工具，说明安装成功！

## 项目级安装

如果你只想在特定项目中使用插件：

1. 在项目根目录创建插件目录：
   ```bash
   mkdir -p .mimocode/plugins/mimo-multimodal-bridge  # MiMo Code
   # 或
   mkdir -p .opencode/plugins/mimo-multimodal-bridge  # OpenCode
   ```

2. 复制插件文件：
   ```bash
   cp index.ts plugin.json .mimocode/plugins/mimo-multimodal-bridge/
   # 或
   cp index.ts plugin.json .opencode/plugins/mimo-multimodal-bridge/
   ```

3. 在项目的配置文件中添加：
   
   **MiMo Code** (`.mimocode/mimocode.json`):
   ```json
   {
     "plugin": [
       "./plugins/mimo-multimodal-bridge/index.ts"
     ]
   }
   ```
   
   **OpenCode** (`.opencode/opencode.json`):
   ```json
   {
     "plugin": [
       "./plugins/mimo-multimodal-bridge/index.ts"
     ]
   }
   ```

## 故障排除

### 插件未加载

1. **检查配置文件路径**：
   ```bash
   # MiMo Code
   cat ~/.config/mimocode/mimocode.json  # Linux/Mac
   type %APPDATA%\mimocode\mimocode.json  # Windows
   
   # OpenCode
   cat ~/.config/opencode/opencode.json  # Linux/Mac
   type %APPDATA%\opencode\opencode.json  # Windows
   ```

2. **检查 JSON 格式**：
   - 确保 JSON 格式有效
   - 可以使用在线 JSON 验证工具

3. **检查插件文件**：
   ```bash
   # MiMo Code
   ls -la ~/.config/mimocode/plugins/mimo-multimodal-bridge/  # Linux/Mac
   dir %APPDATA%\mimocode\plugins\mimo-multimodal-bridge\  # Windows
   
   # OpenCode
   ls -la ~/.config/opencode/plugins/mimo-multimodal-bridge/  # Linux/Mac
   dir %APPDATA%\opencode\plugins\mimo-multimodal-bridge\  # Windows
   ```

4. **重启 MiMo Code / OpenCode**

### 工具未显示

- 确认插件文件已正确复制
- 检查控制台是否有错误信息
- 确认配置文件中的路径正确

### 调用失败

- 确认可以访问 `mimo-v2.5` 模型
- 检查网络连接
- 查看 MiMo Code 的错误日志

## 卸载插件

1. 从配置文件中移除 `plugin` 条目
2. 删除插件目录：
   ```bash
   # MiMo Code
   rm -rf ~/.config/mimocode/plugins/mimo-multimodal-bridge  # Linux/Mac
   rmdir /s /q %APPDATA%\mimocode\plugins\mimo-multimodal-bridge  # Windows
   
   # OpenCode
   rm -rf ~/.config/opencode/plugins/mimo-multimodal-bridge  # Linux/Mac
   rmdir /s /q %APPDATA%\opencode\plugins\mimo-multimodal-bridge  # Windows
   ```
3. 重启 MiMo Code / OpenCode
